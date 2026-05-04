// Computes live platform success metrics and emails them to the admin via Resend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ADMIN_EMAIL = "super.aj1513@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Avg weight (kg) per detected category — used to estimate diverted e-waste mass
const WEIGHT_KG: Record<string, number> = {
  laptop: 2.2,
  tablet: 0.5,
  phone: 0.18,
  speaker: 1.5,
  headphone: 0.25,
  earphone: 0.05,
  charger: 0.1,
  cable: 0.08,
  battery: 0.15,
  remote: 0.1,
  keyboard: 0.7,
  mouse: 0.1,
  misc_big: 5.0,
  general: 0.5,
};

function pct(n: number, d: number) {
  if (!d) return "0%";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function row(label: string, value: string | number, target?: string) {
  return `<tr>
    <td style="padding:8px 10px;border:1px solid #e5e7eb">${label}</td>
    <td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:bold">${value}</td>
    ${target ? `<td style="padding:8px 10px;border:1px solid #e5e7eb;color:#6b7280">${target}</td>` : ""}
  </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check with caller's JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for full reads (auth.users + all tables)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---------- Pull data ----------
    const now = new Date();
    const dayMs = 86400000;
    const since7 = new Date(now.getTime() - 7 * dayMs).toISOString();
    const since30 = new Date(now.getTime() - 30 * dayMs).toISOString();

    const [{ data: usersList }, { data: subs }, { data: reds }, { data: products }, { data: profilesData }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("ewaste_submissions").select("user_id, category, detected_label, confidence, xp_awarded, created_at"),
      admin.from("redemptions").select("user_id, product_name, xp_cost, status, created_at"),
      admin.from("products").select("name, xp_cost, active"),
      admin.from("profiles").select("id, display_name"),
    ]);

    const users = usersList?.users ?? [];
    const submissions = subs ?? [];
    const redemptions = reds ?? [];
    const nameById = new Map<string, string>();
    for (const p of (profilesData ?? []) as Array<{ id: string; display_name: string | null }>) {
      if (p.display_name) nameById.set(p.id, p.display_name);
    }
    const displayFor = (uid: string) => nameById.get(uid) ?? `Player-${uid.slice(0, 6)}`;

    // ---------- Acquisition & Activation ----------
    const totalUsers = users.length;
    const newUsers7 = users.filter(u => u.created_at && new Date(u.created_at) >= new Date(since7)).length;
    const newUsers30 = users.filter(u => u.created_at && new Date(u.created_at) >= new Date(since30)).length;

    // Activation: users who submitted within 7 days of signup
    const subsByUser = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const arr = subsByUser.get(s.user_id) ?? [];
      arr.push(s);
      subsByUser.set(s.user_id, arr);
    }
    let activated = 0;
    let firstUploadDelaysHrs: number[] = [];
    for (const u of users) {
      const userSubs = subsByUser.get(u.id) ?? [];
      if (!userSubs.length || !u.created_at) continue;
      const first = userSubs.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b);
      const delayMs = new Date(first.created_at).getTime() - new Date(u.created_at).getTime();
      if (delayMs <= 7 * dayMs) activated++;
      firstUploadDelaysHrs.push(delayMs / 3600000);
    }
    const activationRate = pct(activated, totalUsers);
    const avgTimeToFirstXp = firstUploadDelaysHrs.length
      ? `${(firstUploadDelaysHrs.reduce((a, b) => a + b, 0) / firstUploadDelaysHrs.length).toFixed(1)} hrs`
      : "—";

    // ---------- Engagement & Retention ----------
    const activeIn = (days: number) => {
      const cutoff = new Date(now.getTime() - days * dayMs).toISOString();
      const set = new Set(submissions.filter(s => s.created_at >= cutoff).map(s => s.user_id));
      return set.size;
    };
    const wau = activeIn(7);
    const mau = activeIn(30);
    const stickiness = mau ? `${((wau / mau) * 100).toFixed(1)}%` : "—";
    const repeatContributors = [...subsByUser.values()].filter(arr => arr.length >= 2).length;
    const totalContributors = subsByUser.size;
    const repeatRate = pct(repeatContributors, totalContributors);
    const avgSubsPerUser = totalContributors ? (submissions.length / totalContributors).toFixed(2) : "0";

    // ---------- Real-World Impact ----------
    const totalItems = submissions.length;
    const byCategory = new Map<string, number>();
    let totalKg = 0;
    let highValueCount = 0;
    let miscBigCount = 0;
    const HIGH_VALUE = new Set(["laptop", "tablet", "speaker", "phone"]);
    for (const s of submissions) {
      const cat = (s.detected_label || s.category || "general").toLowerCase();
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
      totalKg += WEIGHT_KG[cat] ?? WEIGHT_KG.general;
      if (HIGH_VALUE.has(cat)) highValueCount++;
      if (cat === "misc_big") miscBigCount++;
    }
    const categoryRows = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb">${c}</td><td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${n}</td><td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${((WEIGHT_KG[c] ?? WEIGHT_KG.general) * n).toFixed(2)} kg</td></tr>`)
      .join("");

    const confidences = submissions.map(s => Number(s.confidence)).filter(n => !isNaN(n) && n > 0);
    const avgConfidence = confidences.length
      ? (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(3)
      : "—";

    // ---------- Economy Health ----------
    const totalEarned = submissions.reduce((s, x) => s + (x.xp_awarded || 0), 0);
    const totalSpent = redemptions
      .filter(r => r.status !== "cancelled")
      .reduce((s, x) => s + (x.xp_cost || 0), 0);
    const earnedSpentRatio = totalSpent ? (totalEarned / totalSpent).toFixed(2) : "∞ (no redemptions yet)";
    const usersWhoRedeemed = new Set(redemptions.filter(r => r.status !== "cancelled").map(r => r.user_id)).size;
    const redemptionRate = pct(usersWhoRedeemed, totalUsers);

    // Tier distribution by redemption xp_cost
    const tierCounts = { Accessible: 0, Premium: 0, Trophy: 0 };
    for (const r of redemptions) {
      if (r.status === "cancelled") continue;
      if (r.xp_cost >= 15000) tierCounts.Trophy++;
      else if (r.xp_cost >= 5000) tierCounts.Premium++;
      else tierCounts.Accessible++;
    }
    const totalRedeems = tierCounts.Accessible + tierCounts.Premium + tierCounts.Trophy;

    // Top redeemed product
    const productCounts = new Map<string, number>();
    for (const r of redemptions) {
      if (r.status === "cancelled") continue;
      productCounts.set(r.product_name, (productCounts.get(r.product_name) ?? 0) + 1);
    }
    const topProducts = [...productCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topProductsHtml = topProducts.length
      ? topProducts.map(([n, c]) => `<li><b>${n}</b> — ${c} redemption${c > 1 ? "s" : ""}</li>`).join("")
      : "<li style='color:#6b7280'>No redemptions yet</li>";

    // Top contributors (by display name, no emails)
    const contribByUser = [...subsByUser.entries()]
      .map(([uid, arr]) => ({
        name: displayFor(uid),
        items: arr.length,
        xp: arr.reduce((s, x) => s + (x.xp_awarded || 0), 0),
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 5);
    const topContribHtml = contribByUser.length
      ? contribByUser.map(c => `<li><b>${c.name}</b> — ${c.xp.toLocaleString()} XP (${c.items} items)</li>`).join("")
      : "<li style='color:#6b7280'>No contributors yet</li>";

    // ---------- Build email ----------
    const html = `
<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#111;line-height:1.55">
  <h1 style="font-size:22px;border-bottom:3px solid #00ff99;padding-bottom:8px">ECycle — Live Success Metrics</h1>
  <p style="color:#6b7280;font-size:13px">Generated: ${now.toISOString()}</p>

  <h2 style="font-size:16px;margin-top:24px;color:#0f172a">1. Acquisition & Activation</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr style="background:#f9fafb"><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Metric</th><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Value</th><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Target</th></tr>
    ${row("Total registered users", totalUsers)}
    ${row("New signups (last 7d)", newUsers7)}
    ${row("New signups (last 30d)", newUsers30)}
    ${row("Activation rate (signup → 1st upload in 7d)", activationRate, "> 40%")}
    ${row("Avg time to first XP", avgTimeToFirstXp)}
  </table>

  <h2 style="font-size:16px;margin-top:24px;color:#0f172a">2. Engagement & Retention</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr style="background:#f9fafb"><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Metric</th><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Value</th><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Target</th></tr>
    ${row("Weekly active users (WAU)", wau)}
    ${row("Monthly active users (MAU)", mau)}
    ${row("WAU / MAU stickiness", stickiness, "> 20%")}
    ${row("Repeat contributors (≥2 submissions)", `${repeatContributors} / ${totalContributors}`)}
    ${row("Repeat contributor rate", repeatRate, "> 35%")}
    ${row("Avg submissions per contributor", avgSubsPerUser)}
  </table>

  <h2 style="font-size:16px;margin-top:24px;color:#0f172a">3. Real-World Impact</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr style="background:#f9fafb"><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Metric</th><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Value</th><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Target</th></tr>
    ${row("Total e-waste items diverted", totalItems)}
    ${row("Estimated weight diverted", `${totalKg.toFixed(2)} kg`)}
    ${row("High-value items (laptop/tablet/speaker/phone)", highValueCount)}
    ${row("misc_big submissions (contact-only)", miscBigCount)}
    ${row("Avg AI confidence score", avgConfidence, "> 0.75")}
  </table>

  <h3 style="font-size:14px;margin-top:18px">Breakdown by category</h3>
  <table style="border-collapse:collapse;width:100%;font-size:13px">
    <tr style="background:#f9fafb"><th align="left" style="padding:6px 10px;border:1px solid #e5e7eb">Category</th><th align="right" style="padding:6px 10px;border:1px solid #e5e7eb">Count</th><th align="right" style="padding:6px 10px;border:1px solid #e5e7eb">Est. weight</th></tr>
    ${categoryRows || `<tr><td colspan="3" style="padding:10px;border:1px solid #e5e7eb;color:#6b7280">No submissions yet</td></tr>`}
  </table>

  <h2 style="font-size:16px;margin-top:24px;color:#0f172a">4. Economy Health</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr style="background:#f9fafb"><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Metric</th><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Value</th><th align="left" style="padding:8px 10px;border:1px solid #e5e7eb">Target</th></tr>
    ${row("Total XP earned (lifetime)", totalEarned.toLocaleString())}
    ${row("Total XP spent (lifetime)", totalSpent.toLocaleString())}
    ${row("Earned : Spent XP ratio", earnedSpentRatio, "1.3 – 1.8")}
    ${row("Users who redeemed at least once", `${usersWhoRedeemed} / ${totalUsers}`)}
    ${row("Redemption rate", redemptionRate, "> 25%")}
    ${row("Total redemptions", totalRedeems)}
    ${row("→ Accessible tier (<5k XP)", tierCounts.Accessible)}
    ${row("→ Premium tier (5k–15k XP)", tierCounts.Premium)}
    ${row("→ Trophy tier (15k+ XP)", tierCounts.Trophy)}
  </table>

  <h3 style="font-size:14px;margin-top:18px">Top redeemed products</h3>
  <ul style="font-size:14px;margin:0;padding-left:20px">${topProductsHtml}</ul>

  <h3 style="font-size:14px;margin-top:18px">Top 5 contributors (by lifetime XP)</h3>
  <ul style="font-size:14px;margin:0;padding-left:20px">${topContribHtml}</ul>

  <p style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">
    — ECycle Admin Report · Triggered by ${user.email}
  </p>
</div>`;

    // ---------- Send email ----------
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "ECycle Admin <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `ECycle Live Metrics — ${totalUsers} users · ${totalItems} items · ${totalKg.toFixed(1)}kg diverted`,
        html,
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Send failed", details: body }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, totalUsers, totalItems, totalKg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
