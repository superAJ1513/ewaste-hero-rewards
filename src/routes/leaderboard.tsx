import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { RewardCard } from "@/components/RewardCard";
import { RulesSection } from "@/components/RulesSection";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — ECycle Arena" },
      { name: "description", content: "Overall, monthly, and weekly leaderboards. Compete for prizes." },
    ],
  }),
  component: LeaderboardPage,
});

type Mode = "overall" | "monthly" | "weekly";

function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("overall");

  const tabs: { id: Mode; label: string; sub: string }[] = [
    { id: "overall", label: "Overall", sub: "All time" },
    { id: "monthly", label: "Monthly", sub: "Top 15 win" },
    { id: "weekly", label: "Weekly", sub: "Top 5 win" },
  ];

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl italic uppercase tracking-tighter sm:text-5xl">
            Hall of <span className="text-gradient-neon">Power</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Top recyclers — weekly and monthly winners get prizes
          </p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2 border border-border bg-surface p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`px-3 py-3 text-center transition-colors ${
                mode === t.id ? "bg-neon-acid/10 text-neon-acid" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <div className="font-display text-sm italic uppercase">{t.label}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest">{t.sub}</div>
            </button>
          ))}
        </div>

        <LeaderboardTable mode={mode} />

        <div className="mt-8 space-y-6">
          <RewardCard />
          <RulesSection />
        </div>
      </main>
    </div>
  );
}
