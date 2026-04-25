import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — ECycle Arena" },
      { name: "description", content: "Spend your hard-earned XP on upcycled e-waste products." },
    ],
  }),
  component: ShopPage,
});

interface Product {
  id: string;
  name: string;
  xp_cost: number;
  description: string | null;
  image_url: string | null;
}

function ShopPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [currentXp, setCurrentXp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Product | null>(null);

  // Form
  const [shipName, setShipName] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [shipEmail, setShipEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const [prodRes, xpRes] = await Promise.all([
        supabase.from("products").select("*").eq("active", true).order("sort_order"),
        user ? supabase.rpc("get_current_xp", { _user_id: user.id }) : Promise.resolve({ data: null }),
      ]);
      if (prodRes.data) setProducts(prodRes.data);
      if (xpRes.data != null) setCurrentXp(Number(xpRes.data));
      setLoading(false);
    }
    if (!authLoading) load();
  }, [user, authLoading]);

  const openRedeem = (p: Product) => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setSelected(p);
    setError("");
    setSuccess(false);
    setShipEmail(user.email ?? "");
  };

  const submitRedemption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !user) return;
    setSubmitting(true);
    setError("");

    const { data, error: fnErr } = await supabase.functions.invoke("redeem-product", {
      body: {
        productId: selected.id,
        shipName,
        shipAddress,
        shipPhone,
        shipEmail,
      },
    });

    setSubmitting(false);
    if (fnErr || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error || fnErr?.message || "Redemption failed");
      return;
    }

    setSuccess(true);
    // Refresh XP
    const { data: newXp } = await supabase.rpc("get_current_xp", { _user_id: user.id });
    if (newXp != null) setCurrentXp(Number(newXp));
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl italic uppercase tracking-tighter sm:text-5xl">
              The <span className="text-gradient-neon">Shop</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Spend your XP on upcycled e-waste creations
            </p>
          </div>
          {user && (
            <div className="border border-neon-acid/40 bg-neon-acid/10 px-4 py-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Balance</div>
              <div className="font-display text-2xl italic text-neon-acid tabular-nums">
                {currentXp == null ? "..." : currentXp.toLocaleString()} XP
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 border border-neon-cyan/30 bg-neon-cyan/5 p-4 text-xs text-muted-foreground">
          <span className="font-bold text-neon-cyan">⚡ Heads up:</span> Every set of products is unique — what you receive is a surprise crafted from real recycled e-waste. Delivery charges are excluded and arranged separately. Redeeming spends your XP and lowers your overall leaderboard rank.
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 animate-pulse border border-border bg-secondary/30" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const canAfford = currentXp != null && currentXp >= p.xp_cost;
              return (
                <div key={p.id} className="flex flex-col border border-border bg-surface p-5 transition-colors hover:border-neon-acid/40">
                  <div className="font-display text-2xl italic uppercase tracking-tight">{p.name}</div>
                  {p.description && (
                    <p className="mt-2 flex-1 text-xs text-muted-foreground">{p.description}</p>
                  )}
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cost</div>
                      <div className="font-display text-2xl italic text-neon-acid tabular-nums">{p.xp_cost.toLocaleString()}</div>
                    </div>
                    <Button
                      variant={canAfford || !user ? "neon" : "neonOutline"}
                      size="sm"
                      onClick={() => openRedeem(p)}
                      disabled={user != null && !canAfford}
                    >
                      {!user ? "Login" : canAfford ? "Redeem" : "Need more XP"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center" onClick={() => !submitting && setSelected(null)}>
          <div className="w-full max-w-md border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            {success ? (
              <div className="text-center">
                <div className="font-display text-4xl italic text-neon-acid">Order Placed!</div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Your <strong>{selected.name}</strong> redemption has been logged. We'll reach out at the contact details you provided to arrange delivery.
                </p>
                <Button variant="neon" className="mt-6 w-full" onClick={() => { setSelected(null); setSuccess(false); }}>
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={submitRedemption} className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl italic uppercase">Redeem {selected.name}</h2>
                  <p className="text-xs text-muted-foreground">Costs {selected.xp_cost.toLocaleString()} XP</p>
                </div>

                {error && (
                  <div className="border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
                )}

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</Label>
                  <Input value={shipName} onChange={(e) => setShipName(e.target.value)} required className="bg-background" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shipping Address</Label>
                  <Input value={shipAddress} onChange={(e) => setShipAddress(e.target.value)} required className="bg-background" placeholder="Street, City, State, PIN" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone</Label>
                  <Input value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} required className="bg-background" type="tel" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact Email</Label>
                  <Input value={shipEmail} onChange={(e) => setShipEmail(e.target.value)} className="bg-background" type="email" />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="neonOutline" className="flex-1" onClick={() => setSelected(null)} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="neon" className="flex-1" disabled={submitting}>
                    {submitting ? "Placing..." : "Confirm Order"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
