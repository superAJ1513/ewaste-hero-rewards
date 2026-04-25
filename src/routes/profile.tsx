import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getTier, TIERS } from "@/lib/tiers";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Rank — ECycle Arena" },
      { name: "description", content: "Your stats, tier, and shareable rank card." },
    ],
  }),
  component: ProfilePage,
});

interface UserStats {
  lifetime_xp: number;
  current_xp: number;
  item_count: number;
  weekly_xp: number;
  monthly_xp: number;
  tier: string;
  rank_position: number;
  total_users: number;
}

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
      return;
    }
    if (!user) return;
    async function load() {
      const { data } = await supabase.rpc("get_user_stats", { _user_id: user!.id });
      if (data && Array.isArray(data) && data[0]) {
        setStats(data[0] as UserStats);
      }
      setLoading(false);
    }
    load();
  }, [user, authLoading, navigate]);

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      // Use html2canvas-like approach via canvas snapshot — fallback to copying text
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas: HTMLCanvasElement = await html2canvas(cardRef.current, { backgroundColor: null });
      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) return;
        // Try Web Share API with file
        const file = new File([blob], "ecycle-rank.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "My ECycle Rank",
            text: `I'm a ${stats?.tier} on ECycle Arena! ${stats?.lifetime_xp.toLocaleString()} XP earned. ♻️`,
          });
        } else {
          // Download fallback
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "ecycle-rank.png";
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error("Share failed", err);
      alert("Couldn't generate share image. Take a screenshot of the card instead!");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <main className="mx-auto max-w-2xl p-8 text-center text-muted-foreground">Loading...</main>
      </div>
    );
  }

  const tier = getTier(stats?.tier);
  const username = user.email?.split("@")[0].toUpperCase().replace(/[^A-Z0-9]/g, "_") ?? "PLAYER";
  const tierIndex = Object.keys(TIERS).indexOf(tier.name);
  const nextTier = Object.values(TIERS)[tierIndex + 1];

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl italic uppercase tracking-tighter sm:text-4xl">
            My <span className="text-gradient-neon">Rank</span>
          </h1>
        </div>

        {/* Shareable card */}
        <div
          ref={cardRef}
          className={`relative overflow-hidden border-2 ${tier.border} bg-surface p-6 ${tier.glow} sm:p-8`}
        >
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--neon-acid)) 0%, transparent 40%), radial-gradient(circle at 80% 80%, hsl(var(--neon-cyan)) 0%, transparent 40%)"
          }} />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">ECycle Arena</div>
                <div className="font-display text-2xl italic uppercase tracking-tight">{username}</div>
              </div>
              <div className={`border-2 ${tier.border} ${tier.bg} px-3 py-1`}>
                <div className="font-display text-xs italic">{tier.short}</div>
              </div>
            </div>

            <div className="my-6 text-center">
              <div className={`font-display text-5xl italic uppercase tracking-tighter sm:text-6xl ${tier.text}`}>
                {tier.name}
              </div>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {tier.blurb}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="border border-border bg-background/50 p-3 text-center">
                <div className="font-display text-xl italic text-neon-acid tabular-nums">
                  {stats?.lifetime_xp.toLocaleString() ?? 0}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Lifetime XP</div>
              </div>
              <div className="border border-border bg-background/50 p-3 text-center">
                <div className="font-display text-xl italic text-neon-cyan tabular-nums">
                  {stats?.item_count ?? 0}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Items</div>
              </div>
              <div className="border border-border bg-background/50 p-3 text-center">
                <div className="font-display text-xl italic tabular-nums">
                  #{stats?.rank_position ?? "—"}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  of {stats?.total_users ?? 0}
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              ♻️ Recycle. Compete. Win.
            </div>
          </div>
        </div>

        <Button variant="neon" className="mt-4 w-full py-4" onClick={handleShare}>
          📸 Share My Rank
        </Button>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="border border-border bg-surface p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Spendable XP</div>
            <div className="font-display text-2xl italic text-neon-acid tabular-nums">
              {stats?.current_xp.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="border border-border bg-surface p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">This Week</div>
            <div className="font-display text-2xl italic tabular-nums">
              {stats?.weekly_xp.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="border border-border bg-surface p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">This Month</div>
            <div className="font-display text-2xl italic tabular-nums">
              {stats?.monthly_xp.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="border border-border bg-surface p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Items Recycled</div>
            <div className="font-display text-2xl italic tabular-nums">
              {stats?.item_count ?? 0}
            </div>
          </div>
        </div>

        {nextTier && (
          <div className="mt-6 border border-neon-cyan/30 bg-neon-cyan/5 p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Next Tier</div>
            <div className={`font-display text-xl italic ${nextTier.text}`}>{nextTier.name}</div>
            <div className="text-[10px] text-muted-foreground">{nextTier.blurb}</div>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link to="/upload" className="flex-1">
            <Button variant="neon" className="w-full">Drop More E-Waste</Button>
          </Link>
          <Link to="/shop" className="flex-1">
            <Button variant="neonOutline" className="w-full">Spend XP</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
