import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { RewardCard } from "@/components/RewardCard";
import { RulesSection } from "@/components/RulesSection";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — ECycle Arena" },
      { name: "description", content: "See the top e-waste recyclers and their rankings." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl italic uppercase tracking-tighter sm:text-5xl">
            Hall of <span className="text-gradient-neon">Power</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Top e-waste contributors — top rankers win prizes every week!
          </p>
        </div>
        <LeaderboardTable />
        <div className="mt-8 space-y-6">
          <RewardCard />
          <RulesSection />
        </div>
      </main>
    </div>
  );
}
