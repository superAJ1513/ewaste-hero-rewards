import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTier } from "@/lib/tiers";

type Mode = "overall" | "weekly" | "monthly";

interface BaseRow {
  user_id: string;
  user_email: string;
  item_count: number;
}
interface OverallRow extends BaseRow {
  lifetime_xp: number;
  current_xp: number;
}
interface PeriodRow extends BaseRow {
  score: number;
}

function getRankColor(rank: number) {
  if (rank === 1) return "text-neon-acid border-neon-acid";
  if (rank === 2) return "text-neon-cyan border-neon-cyan";
  if (rank === 3) return "text-foreground border-foreground/40";
  return "text-muted-foreground border-border";
}

function extractUsername(email: string) {
  return email.split("@")[0].toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

function highlightTopN(mode: Mode, rank: number) {
  if (mode === "weekly" && rank <= 5) return true;
  if (mode === "monthly" && rank <= 15) return true;
  return false;
}

export function LeaderboardTable({
  compact = false,
  mode = "overall",
}: {
  compact?: boolean;
  mode?: Mode;
}) {
  const [rows, setRows] = useState<(OverallRow | PeriodRow)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const rpc =
        mode === "overall"
          ? "get_leaderboard_overall"
          : mode === "weekly"
          ? "get_leaderboard_weekly"
          : "get_leaderboard_monthly";
      const { data, error } = await supabase.rpc(rpc);
      if (!cancelled) {
        if (!error && data) setRows(data as (OverallRow | PeriodRow)[]);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const displayed = compact ? rows.slice(0, 3) : rows;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse border border-border bg-secondary/30" />
        ))}
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <div className="border border-border bg-secondary/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No submissions yet{mode !== "overall" ? " in this period" : ""}. Be the first!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayed.map((leader, idx) => {
        const rank = idx + 1;
        const score =
          mode === "overall"
            ? (leader as OverallRow).current_xp
            : (leader as PeriodRow).score;
        const lifetime = mode === "overall" ? (leader as OverallRow).lifetime_xp : null;
        const tierStyle = lifetime != null ? getTier(tierFromLifetime(lifetime, rank, rows.length)) : null;
        const isPrize = highlightTopN(mode, rank);

        return (
          <div
            key={leader.user_id}
            className={`flex items-center gap-3 border bg-secondary/50 p-3 transition-colors hover:border-neon-acid/40 sm:gap-4 sm:p-4 ${
              isPrize ? "border-neon-acid/60" : "border-border"
            }`}
          >
            <span className={`font-display text-2xl italic ${getRankColor(rank).split(" ")[0]} w-8`}>
              {String(rank).padStart(2, "0")}
            </span>
            <div className={`hidden size-10 shrink-0 border-2 bg-muted sm:block ${getRankColor(rank).split(" ")[1]}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold uppercase tracking-tight">
                {extractUsername(leader.user_email)}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">{leader.user_email}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {tierStyle && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 ${tierStyle.bg} ${tierStyle.text}`}>
                    {tierStyle.name.toUpperCase()}
                  </span>
                )}
                <span className="bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  {leader.item_count} items
                </span>
                {isPrize && (
                  <span className="bg-neon-acid/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-neon-acid">
                    🎁 Prize
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`font-display text-lg italic tabular-nums ${rank === 1 ? "text-neon-acid" : ""}`}>
                {score.toLocaleString()}
              </div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground">XP</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Approximate tier from rank position within the visible overall list.
// Server-side tier in get_user_stats is authoritative, this is just for the badge in the row.
function tierFromLifetime(_lifetime: number, rank: number, total: number): string {
  if (total === 0) return "Rookie";
  const pct = rank / total;
  if (pct <= 0.01) return "Grandmaster";
  if (pct <= 0.08) return "Legendary";
  if (pct <= 0.15) return "Master";
  if (pct <= 0.25) return "Pro";
  if (pct <= 0.5) return "Veteran";
  return "Rookie";
}
