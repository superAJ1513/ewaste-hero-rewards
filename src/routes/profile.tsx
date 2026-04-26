import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUploader } from "@/components/AvatarUploader";
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

// Tier color hex values for canvas drawing (oklch can't be parsed by canvas).
const TIER_HEX: Record<string, { primary: string; glow: string }> = {
  Rookie: { primary: "#9aa0a6", glow: "#9aa0a655" },
  Veteran: { primary: "#7dd3fc", glow: "#7dd3fc55" },
  Pro: { primary: "#34d399", glow: "#34d39955" },
  Master: { primary: "#a78bfa", glow: "#a78bfa55" },
  Legendary: { primary: "#fb923c", glow: "#fb923c55" },
  Grandmaster: { primary: "#f472b6", glow: "#f472b655" },
};

const NEON_ACID = "#d8ff3a";
const NEON_CYAN = "#7df9ff";
const BG = "#1b1b22";
const PANEL = "#252530";
const FG = "#f5f5f7";
const MUTED = "#9aa0a6";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

async function buildShareCanvas(opts: {
  username: string;
  tierName: string;
  tierBlurb: string;
  lifetimeXp: number;
  itemCount: number;
  rank: number;
  totalUsers: number;
  avatarUrl: string | null;
}): Promise<Blob> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const tier = TIER_HEX[opts.tierName] ?? TIER_HEX.Rookie;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Radial neon glows
  const g1 = ctx.createRadialGradient(W * 0.2, H * 0.2, 0, W * 0.2, H * 0.2, W * 0.6);
  g1.addColorStop(0, NEON_ACID + "40");
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.85, H * 0.85, 0, W * 0.85, H * 0.85, W * 0.6);
  g2.addColorStop(0, NEON_CYAN + "30");
  g2.addColorStop(1, "transparent");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Outer border (tier color)
  ctx.strokeStyle = tier.primary;
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // Inner panel
  ctx.fillStyle = PANEL + "cc";
  ctx.fillRect(64, 64, W - 128, H - 128);

  // Header label
  ctx.fillStyle = MUTED;
  ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("E C Y C L E   A R E N A", 110, 150);

  // Avatar (left) + username
  const avatarSize = 140;
  const avatarX = 110;
  const avatarY = 190;

  // Avatar border
  ctx.strokeStyle = tier.primary;
  ctx.lineWidth = 6;
  ctx.strokeRect(avatarX - 3, avatarY - 3, avatarSize + 6, avatarSize + 6);

  if (opts.avatarUrl) {
    try {
      const img = await loadImage(opts.avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.rect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.clip();
      // cover-fit
      const scale = Math.max(avatarSize / img.width, avatarSize / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, avatarX + (avatarSize - dw) / 2, avatarY + (avatarSize - dh) / 2, dw, dh);
      ctx.restore();
    } catch {
      // fallback initials
      ctx.fillStyle = "#3a3a48";
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.fillStyle = FG;
      ctx.font = "italic bold 64px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(opts.username.slice(0, 2), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    }
  } else {
    ctx.fillStyle = "#3a3a48";
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = FG;
    ctx.font = "italic bold 64px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.username.slice(0, 2), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
  }

  // Username
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = FG;
  ctx.font = "italic 900 56px Georgia, serif";
  const usernameMax = W - (avatarX + avatarSize + 40) - 110;
  let displayName = opts.username;
  while (ctx.measureText(displayName).width > usernameMax && displayName.length > 3) {
    displayName = displayName.slice(0, -1);
  }
  if (displayName !== opts.username) displayName += "…";
  ctx.fillText(displayName, avatarX + avatarSize + 32, avatarY + 70);

  ctx.fillStyle = MUTED;
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(`Rank #${opts.rank} of ${opts.totalUsers}`, avatarX + avatarSize + 32, avatarY + 110);

  // Big tier name
  ctx.textAlign = "center";
  ctx.fillStyle = tier.primary;
  ctx.font = "italic 900 180px Georgia, serif";
  // Glow
  ctx.shadowColor = tier.primary;
  ctx.shadowBlur = 30;
  ctx.fillText(opts.tierName.toUpperCase(), W / 2, 580);
  ctx.shadowBlur = 0;

  ctx.fillStyle = MUTED;
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillText(opts.tierBlurb.toUpperCase(), W / 2, 625);

  // Stats row
  const statY = 720;
  const statH = 180;
  const statW = (W - 220 - 40) / 3; // 110 padding each side, 20 gap x2
  const stats = [
    { label: "LIFETIME XP", value: opts.lifetimeXp.toLocaleString(), color: NEON_ACID },
    { label: "ITEMS", value: String(opts.itemCount), color: NEON_CYAN },
    { label: "RANK", value: `#${opts.rank}`, color: FG },
  ];
  stats.forEach((s, i) => {
    const x = 110 + i * (statW + 20);
    ctx.strokeStyle = "#3a3a48";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, statY, statW, statH);
    ctx.fillStyle = "#1f1f28cc";
    ctx.fillRect(x, statY, statW, statH);

    ctx.fillStyle = s.color;
    ctx.font = "italic 900 72px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(s.value, x + statW / 2, statY + 100);

    ctx.fillStyle = MUTED;
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText(s.label, x + statW / 2, statY + 140);
  });

  // Footer
  ctx.fillStyle = MUTED;
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("♻  R E C Y C L E  ·  C O M P E T E  ·  W I N", W / 2, H - 100);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
      return;
    }
    if (!user) return;
    async function load() {
      const [statsRes, profileRes] = await Promise.all([
        supabase.rpc("get_user_stats", { _user_id: user!.id }),
        supabase.from("profiles").select("avatar_url, display_name").eq("id", user!.id).maybeSingle(),
      ]);
      if (statsRes.data && Array.isArray(statsRes.data) && statsRes.data[0]) {
        setStats(statsRes.data[0] as UserStats);
      }
      setAvatarUrl(profileRes.data?.avatar_url ?? null);
      setDisplayName(profileRes.data?.display_name ?? null);
      setLoading(false);
    }
    load();
  }, [user, authLoading, navigate]);

  const username =
    (displayName && displayName.trim()) ||
    user?.email?.split("@")[0].toUpperCase().replace(/[^A-Z0-9]/g, "_") ||
    "PLAYER";

  const handleShare = async () => {
    if (!stats) return;
    setSharing(true);
    try {
      const tier = getTier(stats.tier);
      const blob = await buildShareCanvas({
        username: username.toUpperCase(),
        tierName: tier.name,
        tierBlurb: tier.blurb,
        lifetimeXp: stats.lifetime_xp,
        itemCount: stats.item_count,
        rank: stats.rank_position,
        totalUsers: stats.total_users,
        avatarUrl,
      });

      const file = new File([blob], "ecycle-rank.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My ECycle Rank",
          text: `I'm a ${tier.name} on ECycle Arena! ${stats.lifetime_xp.toLocaleString()} XP earned. ♻️`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ecycle-rank.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Share failed", err);
      alert("Couldn't generate share image. Take a screenshot of the card instead!");
    } finally {
      setSharing(false);
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

        {/* Profile editor */}
        <div className="mb-6 border border-border bg-surface p-4">
          <AvatarUploader
            userId={user.id}
            initialUrl={avatarUrl}
            initialName={displayName}
            fallbackInitials={username.slice(0, 2).toUpperCase()}
            onChange={setAvatarUrl}
            onNameChange={setDisplayName}
          />
        </div>

        {/* Shareable card preview */}
        <div className={`relative overflow-hidden border-2 ${tier.border} bg-surface p-6 ${tier.glow} sm:p-8`}>
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className={`size-14 rounded-none border-2 ${tier.border}`}>
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={username} className="rounded-none object-cover" /> : null}
                  <AvatarFallback className="rounded-none bg-muted font-display italic">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">ECycle Arena</div>
                  <div className="font-display text-2xl italic uppercase tracking-tight">{username}</div>
                </div>
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

        <Button variant="neon" className="mt-4 w-full py-4" onClick={handleShare} disabled={sharing}>
          {sharing ? "Generating..." : "📸 Share My Rank"}
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
