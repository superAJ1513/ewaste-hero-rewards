import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderEntry {
  user_id: string;
  user_email: string;
  item_count: number;
  score: number;
}

function getRankColor(rank: number) {
  if (rank === 1) return "text-neon-acid border-neon-acid";
  if (rank === 2) return "text-neon-cyan border-neon-cyan";
  return "text-muted-foreground border-border";
}

function getTier(score: number) {
  if (score >= 20000) return { name: "LEGENDARY", cls: "bg-neon-acid/10 text-neon-acid" };
  if (score >= 10000) return { name: "MASTER", cls: "bg-neon-cyan/10 text-neon-cyan" };
  if (score >= 5000) return { name: "ELITE", cls: "bg-secondary text-foreground" };
  return { name: "ROOKIE", cls: "bg-secondary text-muted-foreground" };
}

function extractUsername(email: string) {
  return email.split("@")[0].toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

export function LeaderboardTable({ compact = false }: { compact?: boolean }) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase.rpc("get_leaderboard");
      if (!error && data) {
        setLeaders(data as LeaderEntry[]);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const displayed = compact ? leaders.slice(0, 3) : leaders;

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
        <p className="text-sm text-muted-foreground">No submissions yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayed.map((leader, idx) => {
        const rank = idx + 1;
        const tier = getTier(leader.score);
        return (
          <div
            key={leader.user_id}
            className="flex items-center gap-3 border border-border bg-secondary/50 p-3 transition-colors hover:border-neon-acid/40 sm:gap-4 sm:p-4"
          >
            <span className={`font-display text-2xl italic ${getRankColor(rank).split(" ")[0]} w-8`}>
              {String(rank).padStart(2, "0")}
            </span>
            <div className={`hidden size-10 shrink-0 border-2 bg-muted sm:block ${getRankColor(rank).split(" ")[1]}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold uppercase tracking-tight">
                {extractUsername(leader.user_email)}
              </div>
              <div className="flex gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 ${tier.cls}`}>
                  {tier.name}
                </span>
                <span className="bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  {leader.item_count} Items
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-display text-lg italic tabular-nums ${rank === 1 ? "text-neon-acid" : ""}`}>
                {leader.score.toLocaleString()}
              </div>
              <div className="text-[10px] font-bold uppercase text-muted-foreground">XP</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
