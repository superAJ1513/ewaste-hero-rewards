import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function StatsBar() {
  const [stats, setStats] = useState<{ items: number; users: number; prizes: number } | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const [itemsRes, leaderboardRes] = await Promise.all([
        supabase.from("ewaste_submissions").select("*", { count: "exact", head: true }),
        supabase.rpc("get_leaderboard"),
      ]);
      const items = itemsRes.count ?? 0;
      const users = leaderboardRes.data ? (leaderboardRes.data as Array<{ user_id: string }>).length : 0;
      // Prizes awarded = number of completed weekly cycles. None yet since program just launched.
      setStats({ items, users, prizes: 0 });
    }
    fetchStats();
  }, []);

  const display = [
    { label: "Total E-Waste Collected", value: stats?.items ?? null, unit: "items" },
    { label: "Active Users", value: stats?.users ?? null, unit: "players" },
    { label: "Prizes Awarded", value: stats?.prizes ?? null, unit: "rewards" },
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
