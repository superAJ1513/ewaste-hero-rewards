import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function getCountdown() {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + daysUntilSunday);
  endDate.setHours(23, 59, 59, 999);
  const diff = endDate.getTime() - now.getTime();
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
  };
}

export function RewardCard() {
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<{ days: number; hours: number; mins: number } | null>(null);

  useEffect(() => {
    setCountdown(getCountdown());
    const interval = setInterval(() => setCountdown(getCountdown()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchCount() {
      const { count, error } = await supabase
        .from("ewaste_submissions")
        .select("*", { count: "exact", head: true });
      if (!error && count !== null) {
        setEntryCount(count);
      }
    }
    fetchCount();
  }, []);

  return (
    <div className="bg-neon-acid/10 border-2 border-neon-acid/30 p-5 sm:p-6">
      <h4 className="font-display italic uppercase mb-2">Weekly Jackpot</h4>
      <div className="text-2xl font-display text-neon-acid italic tracking-widest mb-3 sm:text-3xl">
        MYSTERY PRIZE
      </div>
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>
          Ends in:{" "}
          {countdown
            ? `${String(countdown.days).padStart(2, "0")}D ${String(countdown.hours).padStart(2, "0")}H ${String(countdown.mins).padStart(2, "0")}M`
            : "--D --H --M"}
        </span>
        <span>Entries: {entryCount ?? "..."}</span>
      </div>
      <div className="mt-4 h-1.5 bg-secondary w-full">
        <div className="h-full bg-neon-acid neon-glow-acid" style={{ width: entryCount ? `${Math.min((entryCount / 50) * 100, 100)}%` : "0%" }} />
      </div>
    </div>
  );
}
