// Process a product redemption: verify XP, insert order, send admin email notification.
// Auth required. Input: { productId, shipName, shipAddress, shipPhone, shipEmail?, notes? }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "super.aj1513@gmail.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY"); // optional

    // Auth: get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userData = await userResp.json();
    const userId = userData.id;
    const userEmail = userData.email;

    const body = await req.json();
    const { productId, shipName, shipAddress, shipPhone, shipEmail, notes } = body;

    if (!productId || !shipName || !shipAddress || !shipPhone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for atomic check + insert
    const adminFetch = (path: string, init: RequestInit = {}) =>
      fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
          ...(init.headers || {}),
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
      });

    // Fetch product
    const prodResp = await adminFetch(`products?id=eq.${productId}&active=eq.true&select=id,name,xp_cost`);
    const products = await prodResp.json();
    if (!products?.length) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const product = products[0];

    // Check current XP via RPC
    const xpResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_current_xp`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ _user_id: userId }),
    });
    const currentXp = Number(await xpResp.json());

    if (currentXp < product.xp_cost) {
      return new Response(
        JSON.stringify({ error: `Not enough XP. You have ${currentXp}, need ${product.xp_cost}.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert redemption
    const insertResp = await adminFetch("redemptions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: userId,
        product_id: product.id,
        product_name: product.name,
        xp_cost: product.xp_cost,
        ship_name: shipName,
        ship_address: shipAddress,
        ship_phone: shipPhone,
        ship_email: shipEmail || userEmail,
        notes: notes || null,
        status: "pending",
      }),
    });

    if (!insertResp.ok) {
      const t = await insertResp.text();
      console.error("Insert failed", t);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = (await insertResp.json())[0];

    // Send admin notification (best-effort, don't block on failure)
    if (RESEND_API_KEY) {
      try {
        await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ECycle Arena <onboarding@resend.dev>",
            to: [ADMIN_EMAIL],
            subject: `🎁 New Redemption: ${product.name} (${product.xp_cost} XP)`,
            html: `
              <h2>New Product Redemption</h2>
              <p><strong>Order ID:</strong> ${order.id}</p>
              <p><strong>Product:</strong> ${product.name}</p>
              <p><strong>XP Cost:</strong> ${product.xp_cost}</p>
              <hr/>
              <h3>User</h3>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>User ID:</strong> ${userId}</p>
              <hr/>
              <h3>Shipping</h3>
              <p><strong>Name:</strong> ${shipName}</p>
              <p><strong>Address:</strong> ${shipAddress}</p>
              <p><strong>Phone:</strong> ${shipPhone}</p>
              <p><strong>Contact email:</strong> ${shipEmail || userEmail}</p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
              <hr/>
              <p style="color:#888;font-size:12px">Reminder: every product set is unique — pick from current stock. Delivery charges are excluded and to be coordinated separately.</p>
            `,
          }),
        });
      } catch (mailErr) {
        console.error("Email send failed (non-fatal):", mailErr);
      }
    } else {
      console.log("RESEND_API_KEY not set — skipping admin email. Order saved:", order.id);
    }

    return new Response(JSON.stringify({ success: true, order }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("redeem-product error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
