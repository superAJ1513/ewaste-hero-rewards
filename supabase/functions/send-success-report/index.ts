// Sends the platform success-metrics report to the requesting admin user via Resend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ADMIN_EMAIL = "super.aj1513@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPORT_HTML = `
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#111;line-height:1.55">
  <h1 style="font-size:22px;border-bottom:2px solid #00ff99;padding-bottom:8px">ECycle — How to measure success</h1>
  <p>Once active users start contributing, track success across these four pillars.</p>

  <h2 style="font-size:16px;margin-top:24px">1. Acquisition & Activation</h2>
  <ul>
    <li><b>New signups / week</b> — top of funnel</li>
    <li><b>Signup → first upload (within 7 days)</b> — activation rate. Target &gt; 40%</li>
    <li><b>Time to first XP</b> — friction indicator</li>
    <li><b>Traffic source breakdown</b> — what's actually working</li>
  </ul>

  <h2 style="font-size:16px;margin-top:24px">2. Engagement & Retention</h2>
  <ul>
    <li><b>WAU / MAU stickiness</b> — target &gt; 20%</li>
    <li><b>Repeat contributor rate</b> (≥2 submissions) — target &gt; 35%</li>
    <li><b>Avg submissions per user / month</b></li>
    <li><b>Leaderboard participation</b> — % users with weekly XP &gt; 0</li>
  </ul>

  <h2 style="font-size:16px;margin-top:24px">3. Real-World Impact (the actual mission)</h2>
  <ul>
    <li><b>Total e-waste items diverted</b> (by category: phone, laptop, tablet, etc.)</li>
    <li><b>Estimated weight diverted</b> (kg) — assign avg weight per category</li>
    <li><b>High-value items collected</b> — laptops, speakers, big appliances</li>
    <li><b>misc_big follow-through rate</b> — % of contact-form items actually picked up. Target &gt; 50%</li>
    <li><b>Geographic spread</b> — pin map of pickups</li>
  </ul>

  <h2 style="font-size:16px;margin-top:24px">4. Economy Health</h2>
  <ul>
    <li><b>Earned : Spent XP ratio</b> — target 1.3–1.8 (people earn a bit more than they spend)</li>
    <li><b>Redemption rate</b> — % users who've redeemed at least once. Target &gt; 25%</li>
    <li><b>Tier distribution</b> — % at Accessible / Premium / Trophy</li>
    <li><b>Avg time to first redemption</b> — proxy for reward attainability</li>
    <li><b>Avg confidence score</b> from AI detection — target &gt; 0.75</li>
  </ul>

  <h2 style="font-size:16px;margin-top:24px">Target Benchmarks (first 6 months)</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr style="background:#f4f4f4"><th align="left" style="padding:6px;border:1px solid #ddd">Metric</th><th align="left" style="padding:6px;border:1px solid #ddd">Good</th></tr>
    <tr><td style="padding:6px;border:1px solid #ddd">Activation rate (signup → 1st upload in 7d)</td><td style="padding:6px;border:1px solid #ddd">&gt; 40%</td></tr>
    <tr><td style="padding:6px;border:1px solid #ddd">WAU / MAU stickiness</td><td style="padding:6px;border:1px solid #ddd">&gt; 20%</td></tr>
    <tr><td style="padding:6px;border:1px solid #ddd">Repeat contributor rate</td><td style="padding:6px;border:1px solid #ddd">&gt; 35%</td></tr>
    <tr><td style="padding:6px;border:1px solid #ddd">Avg AI confidence score</td><td style="padding:6px;border:1px solid #ddd">&gt; 0.75</td></tr>
    <tr><td style="padding:6px;border:1px solid #ddd">misc_big contact follow-through</td><td style="padding:6px;border:1px solid #ddd">&gt; 50%</td></tr>
    <tr><td style="padding:6px;border:1px solid #ddd">Earned : Spent XP ratio</td><td style="padding:6px;border:1px solid #ddd">1.3 – 1.8</td></tr>
    <tr><td style="padding:6px;border:1px solid #ddd">Redemption rate (any tier)</td><td style="padding:6px;border:1px solid #ddd">&gt; 25%</td></tr>
  </table>

  <h2 style="font-size:16px;margin-top:24px">How to gather the data</h2>
  <ul>
    <li>Most metrics come from existing tables: <code>ewaste_submissions</code>, <code>redemptions</code>, <code>profiles</code>, <code>auth.users</code>.</li>
    <li>Build an internal admin dashboard with weekly cohort charts.</li>
    <li>Export monthly CSVs for stakeholders / sustainability reports.</li>
  </ul>

  <p style="margin-top:24px;font-size:12px;color:#666">— ECycle Admin Report</p>
</div>
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        subject: "ECycle — Success Metrics & Analysis Framework",
        html: REPORT_HTML,
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Send failed", details: body }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
