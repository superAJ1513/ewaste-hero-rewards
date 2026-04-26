import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Countdown = { days: number; hours: number; mins: number; secs: number };

// Week resets at midnight on the upcoming Monday (start of next ISO week, local time).
function getWeeklyCountdown(): Countdown {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const daysUntilMonday = ((1 - day + 7) % 7) || 7;
  const end = new Date(now);
  end.setDate(now.getDate() + daysUntilMonday);
  end.setHours(0, 0, 0, 0);
  return diffParts(end.getTime() - now.getTime());
}

// Month resets at midnight on the 1st of next month (local time).
function getMonthlyCountdown(): Countdown {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return diffParts(end.getTime() - now.getTime());
}

function diffParts(ms: number): Countdown {
  const clamped = Math.max(0, ms);
  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped % 86_400_000) / 3_600_000),
    mins: Math.floor((clamped % 3_600_000) / 60_000),
    secs: Math.floor((clamped % 60_000) / 1000),
  };
}

function fmt(c: Countdown) {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (c.days > 0) return `${pad(c.days)}D ${pad(c.hours)}H ${pad(c.mins)}M`;
  return `${pad(c.hours)}H ${pad(c.mins)}M ${pad(c.secs)}S`;
}

export function RewardCard() {
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [weekly, setWeekly] = useState<Countdown | null>(null);
  const [monthly, setMonthly] = useState<Countdown | null>(null);

  useEffect(() => {
    const tick = () => {
      setWeekly(getWeeklyCountdown());
      setMonthly(getMonthlyCountdown());
    };
    tick();
    const interval = setInterval(tick, 1000);
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
      <h4 className="font-display italic uppercase mb-2">Live Jackpots</h4>
      <div className="text-2xl font-display text-neon-acid italic tracking-widest mb-4 sm:text-3xl">
        MYSTERY PRIZE
      </div>

      <div className="space-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Weekly ends in</span>
          <span className="tabular-nums text-neon-acid">{weekly ? fmt(weekly) : "--"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Monthly ends in</span>
          <span className="tabular-nums text-neon-cyan">{monthly ? fmt(monthly) : "--"}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span>Total entries</span>
          <span className="tabular-nums">{entryCount ?? "..."}</span>
        </div>
      </div>

      <div className="mt-4 h-1.5 bg-secondary w-full">
        <div
          className="h-full bg-neon-acid neon-glow-acid"
          style={{ width: entryCount ? `${Math.min((entryCount / 50) * 100, 100)}%` : "0%" }}
        />
      </div>
    </div>
  );
}
