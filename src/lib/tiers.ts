// Tier definitions for ECycle Arena. Tiers are assigned by lifetime XP percentile
// (computed server-side in get_user_stats). This file just maps the tier name
// to UI styling and metadata for shareable rank cards.

export type TierName = "Rookie" | "Veteran" | "Pro" | "Master" | "Legendary" | "Grandmaster";

export interface TierStyle {
  name: TierName;
  short: string;
  bg: string;
  text: string;
  border: string;
  glow: string;
  blurb: string;
}

export const TIERS: Record<TierName, TierStyle> = {
  Rookie: {
    name: "Rookie",
    short: "RKE",
    bg: "bg-secondary",
    text: "text-muted-foreground",
    border: "border-border",
    glow: "",
    blurb: "Just getting started",
  },
  Veteran: {
    name: "Veteran",
    short: "VET",
    bg: "bg-secondary",
    text: "text-foreground",
    border: "border-foreground/40",
    glow: "",
    blurb: "Top 50% of contributors",
  },
  Pro: {
    name: "Pro",
    short: "PRO",
    bg: "bg-neon-cyan/10",
    text: "text-neon-cyan",
    border: "border-neon-cyan/40",
    glow: "shadow-[0_0_20px_hsl(var(--neon-cyan)/0.3)]",
    blurb: "Top 25% of contributors",
  },
  Master: {
    name: "Master",
    short: "MSR",
    bg: "bg-neon-cyan/15",
    text: "text-neon-cyan",
    border: "border-neon-cyan",
    glow: "shadow-[0_0_30px_hsl(var(--neon-cyan)/0.5)]",
    blurb: "Top 15% of contributors",
  },
  Legendary: {
    name: "Legendary",
    short: "LGD",
    bg: "bg-neon-acid/15",
    text: "text-neon-acid",
    border: "border-neon-acid",
    glow: "shadow-[0_0_40px_hsl(var(--neon-acid)/0.6)]",
    blurb: "Top 8% of contributors",
  },
  Grandmaster: {
    name: "Grandmaster",
    short: "GM",
    bg: "bg-gradient-to-br from-neon-acid/30 to-neon-cyan/30",
    text: "text-neon-acid",
    border: "border-neon-acid",
    glow: "shadow-[0_0_60px_hsl(var(--neon-acid)/0.8)]",
    blurb: "Top 1% — the elite",
  },
};

export function getTier(name: string | null | undefined): TierStyle {
  if (name && name in TIERS) return TIERS[name as TierName];
  return TIERS.Rookie;
}
