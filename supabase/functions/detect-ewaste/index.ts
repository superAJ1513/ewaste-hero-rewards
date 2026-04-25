// Detect e-waste category from a photo using Lovable AI (Gemini Vision).
// Input: { imageUrl: string }
// Output: { category: string, label: string, xp: number, confidence: number, requiresContact?: boolean, contactPhone?: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Categories with fixed XP. Order matters for prompt clarity.
const CATEGORY_XP: Record<string, number> = {
  battery: 100,
  phone_speaker: 800,
  laptop: 5000,
  tablet: 3000,
  charger_cable: 350,
  earphones_headphones: 650,
  keyboard: 400,
  mouse_remote: 300,
  light: 450,
  misc_small: 0, // randomized 200-800
  misc_big: 0, // requires contact
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
        tools: [
          {
            type: "function",
            function: {
              name: "classify_ewaste",
              description: "Return the e-waste category for the image.",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: Object.keys(CATEGORY_XP),
                  },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  reason: { type: "string" },
                },
                required: ["category", "confidence", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
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
      // Random between 200 and 800 inclusive
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
