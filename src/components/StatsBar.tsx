import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function StatsBar() {
  const [stats, setStats] = useState<{ items: number; users: number; xp: number } | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const [itemsRes, leaderboardRes] = await Promise.all([
        supabase.from("ewaste_submissions").select("xp_awarded", { count: "exact" }),
        supabase.rpc("get_leaderboard_overall"),
      ]);
      const items = itemsRes.count ?? 0;
      const users = leaderboardRes.data
        ? (leaderboardRes.data as Array<{ user_id: string }>).length
        : 0;
      const xp = (itemsRes.data ?? []).reduce(
        (sum, row: { xp_awarded: number | null }) => sum + (row.xp_awarded ?? 0),
        0,
      );
      setStats({ items, users, xp });
    }
    fetchStats();
  }, []);

  const display = [
    { label: "Items Recycled", value: stats?.items ?? null, unit: "items" },
    { label: "Active Players", value: stats?.users ?? null, unit: "players" },
    { label: "Total XP Awarded", value: stats?.xp ?? null, unit: "xp" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {display.map((stat) => (
        <div key={stat.label} className="border border-border bg-surface p-4 text-center">
          <div className="font-display text-2xl italic tabular-nums text-neon-acid">
            {stat.value === null ? "..." : stat.value.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
