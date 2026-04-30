// Detect e-waste category from a photo using Lovable AI (Gemini Vision).
// Also computes a perceptual hash (pHash) and rejects duplicates of any image
// previously submitted by ANY user (anti-recycling-the-photo exploit).
// Input: { imageUrl: string }
// Output: { category, label, xp, confidence, requiresContact?, contactPhone?, imageHash?, duplicate?, error? }

import { decode as decodeJpeg } from "https://esm.sh/jpeg-js@0.4.4";
import { decode as decodePng } from "https://esm.sh/fast-png@6.2.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Hamming distance threshold below which two pHashes are considered the same image.
// pHash is 64 bits — ≤ 8 differing bits = near-identical (industry-standard cutoff).
const PHASH_DUP_THRESHOLD = 8;

const CATEGORY_XP: Record<string, number> = {
  battery: 100,
  phone_speaker: 2500,
  laptop: 12000,
  tablet: 6000,
  charger_cable: 350,
  earphones_headphones: 650,
  keyboard: 400,
  mouse_remote: 300,
  light: 450,
  misc_small: 0,
  misc_big: 0,
  unknown: 0,
};

const CATEGORY_LABELS: Record<string, string> = {
  battery: "Battery",
  phone_speaker: "Phone / Speaker",
  laptop: "Laptop",
  tablet: "Tablet",
  charger_cable: "Charger / Adapter / Cable",
  earphones_headphones: "Earphones / Headphones",
  keyboard: "Keyboard",
  mouse_remote: "Mouse / Remote Control",
  light: "Tubelight / LED Light",
  misc_small: "Miscellaneous (small)",
  misc_big: "Miscellaneous (large)",
  unknown: "Unknown",
};

const SYSTEM_PROMPT = `You are an e-waste classifier. Look at the image and classify the visible item into ONE of these categories. Only call the function. Be strict — if the image does NOT clearly show e-waste, return "unknown".

Categories:
- battery: any battery (AA, AAA, button cell, lithium pack, power bank, etc.)
- phone_speaker: smartphone, mobile phone, speaker, bluetooth speaker
- laptop: laptop or notebook computer
- tablet: tablet, iPad, e-reader
- charger_cable: chargers, adapters, USB cables, power cables, extension cords
- earphones_headphones: earphones, earbuds, airpods, headphones, headsets
- keyboard: any keyboard
- mouse_remote: computer mouse or any remote control (TV, AC, etc.)
- light: tubelight, LED bulb, fluorescent light, LED strip
- misc_small: any other small electronic device that fits in a hand (e.g. small camera, smartwatch, calculator, USB drive)
- misc_big: large electronics that don't fit other categories (e.g. monitor, printer, microwave, fan, large appliance)
- unknown: image is unclear, not e-waste, or you cannot tell

Confidence should be 0.0 to 1.0.`;

// ---------- Perceptual hash (pHash) ----------
// Decodes JPEG/PNG, downscales to 32x32 grayscale, runs 2D DCT, and takes
// the top-left 8x8 (excluding DC) — bits set where coefficient > median.
// Returns a 16-char hex string (64 bits).

function decodeImage(bytes: Uint8Array): { data: Uint8Array; width: number; height: number } {
  // Try JPEG first
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const img = decodeJpeg(bytes, { useTArray: true });
    return { data: img.data as Uint8Array, width: img.width, height: img.height };
  }
  // PNG
  const img = decodePng(bytes);
  // fast-png returns raw channels. Normalize to RGBA-like (4 channels) for our sampling.
  const channels = img.channels;
  const data = img.data as Uint8Array;
  if (channels === 4) return { data, width: img.width, height: img.height };
  // Expand to RGBA
  const out = new Uint8Array(img.width * img.height * 4);
  for (let i = 0, j = 0; i < img.width * img.height; i++) {
    const r = channels >= 1 ? data[i * channels] : 0;
    const g = channels >= 2 ? data[i * channels + 1] : r;
    const b = channels >= 3 ? data[i * channels + 2] : r;
    out[j++] = r; out[j++] = g; out[j++] = b; out[j++] = 255;
  }
  return { data: out, width: img.width, height: img.height };
}

function toGrayscale32(src: { data: Uint8Array; width: number; height: number }): Float64Array {
  const SIZE = 32;
  const out = new Float64Array(SIZE * SIZE);
  const { data, width, height } = src;
  // Nearest-neighbor downscale (fast, fine for hashing)
  for (let y = 0; y < SIZE; y++) {
    const sy = Math.floor((y * height) / SIZE);
    for (let x = 0; x < SIZE; x++) {
      const sx = Math.floor((x * width) / SIZE);
      const idx = (sy * width + sx) * 4;
      // Luminance (Rec. 601)
      out[y * SIZE + x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
  }
  return out;
}

// 2D DCT-II on a 32x32 grid — only computes the top-left 8x8 block we need.
function dct8x8TopLeft(input: Float64Array): Float64Array {
  const N = 32;
  const OUT = 8;
  const result = new Float64Array(OUT * OUT);
  // Precompute cos table
  const cos = new Float64Array(N * N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      cos[i * N + j] = Math.cos(((2 * j + 1) * i * Math.PI) / (2 * N));
    }
  }
  for (let u = 0; u < OUT; u++) {
    for (let v = 0; v < OUT; v++) {
      let sum = 0;
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
          sum += input[x * N + y] * cos[u * N + x] * cos[v * N + y];
        }
      }
      result[u * OUT + v] = sum;
    }
  }
  return result;
}

function pHash(bytes: Uint8Array): string {
  const img = decodeImage(bytes);
  const gray = toGrayscale32(img);
  const dct = dct8x8TopLeft(gray);
  // Drop the DC coefficient (index 0) when computing median
  const coeffs = Array.from(dct.slice(1));
  const sorted = [...coeffs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  // 64 bits — bit i is 1 if dct[i] > median (DC bit always = 0 for index 0)
  let hex = "";
  for (let nibble = 0; nibble < 16; nibble++) {
    let v = 0;
    for (let b = 0; b < 4; b++) {
      const i = nibble * 4 + b;
      const coeff = i === 0 ? 0 : dct[i];
      if (i !== 0 && coeff > median) v |= 1 << (3 - b);
    }
    hex += v.toString(16);
  }
  return hex;
}

function hammingHex(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { dist += x & 1; x >>= 1; }
  }
  return dist;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Download image bytes ----------
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      return new Response(JSON.stringify({ error: "Could not fetch image" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const imgBytes = new Uint8Array(await imgResp.arrayBuffer());

    // ---------- Compute perceptual hash ----------
    let imageHash: string | null = null;
    try {
      imageHash = pHash(imgBytes);
    } catch (e) {
      console.error("pHash failed (continuing without dup check):", e);
    }

    // ---------- Global duplicate check ----------
    if (imageHash) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      // Exact match short-circuit
      const { data: exact } = await admin
        .from("ewaste_submissions")
        .select("id")
        .eq("image_hash", imageHash)
        .limit(1);

      let isDuplicate = !!(exact && exact.length);

      // Near-match: scan all stored hashes and compare Hamming distance.
      // For projects with very large submission counts (>100k), move this to
      // a server-side function with bit-counting SQL. Fine for current scale.
      if (!isDuplicate) {
        const { data: allHashes } = await admin
          .from("ewaste_submissions")
          .select("image_hash")
          .not("image_hash", "is", null);
        if (allHashes) {
          for (const row of allHashes) {
            if (row.image_hash && hammingHex(row.image_hash, imageHash) <= PHASH_DUP_THRESHOLD) {
              isDuplicate = true;
              break;
            }
          }
        }
      }

      if (isDuplicate) {
        return new Response(JSON.stringify({
          category: "duplicate",
          label: "Duplicate Detected",
          xp: 0,
          confidence: 1,
          duplicate: true,
          imageHash,
          error: "This image (or a near-identical one) has already been submitted. 0 XP awarded.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ---------- AI classification ----------
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Classify this e-waste item." },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_ewaste",
            description: "Return the e-waste category for the image.",
            parameters: {
              type: "object",
              properties: {
                category: { type: "string", enum: Object.keys(CATEGORY_XP) },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                reason: { type: "string" },
              },
              required: ["category", "confidence", "reason"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_ewaste" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit, try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI detection failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No classification returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    const category: string = args.category in CATEGORY_XP ? args.category : "unknown";
    const confidence: number = typeof args.confidence === "number" ? args.confidence : 0;

    let xp = CATEGORY_XP[category];
    let requiresContact = false;
    let contactPhone: string | undefined;

    if (category === "misc_small") {
      xp = Math.floor(Math.random() * 601) + 200;
    } else if (category === "misc_big") {
      requiresContact = true;
      contactPhone = "8882043838";
      xp = 0;
    }

    return new Response(
      JSON.stringify({
        category,
        label: CATEGORY_LABELS[category],
        xp,
        confidence,
        requiresContact,
        contactPhone,
        reason: args.reason,
        imageHash,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("detect-ewaste error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
