import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { RewardCard } from "@/components/RewardCard";
import { StatsBar } from "@/components/StatsBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ECycle Arena — Recycle E-Waste, Win Prizes" },
      { name: "description", content: "Upload your e-waste, climb the leaderboard, and win prizes. Join the e-waste recycling revolution." },
      { property: "og:title", content: "ECycle Arena — Recycle E-Waste, Win Prizes" },
      { property: "og:description", content: "Upload your e-waste, climb the leaderboard, and win prizes." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <HeroSection />
            <div className="mt-8">
              <StatsBar />
            </div>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="border-t-4 border-border bg-surface p-6 arcade-border-cyan sm:p-8">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h2 className="font-display text-2xl italic uppercase tracking-tighter sm:text-3xl">
                    Hall of Power
                  </h2>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Top Contributors
                  </p>
                </div>
                <div className="font-display text-lg italic text-neon-cyan animate-pulse">LIVE</div>
              </div>
              <LeaderboardTable compact />
            </div>
            <RewardCard />
          </div>
        </div>
      </main>
      <footer className="border-t border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="text-neon-cyan">STATUS: OPERATIONAL</span>
          <span>© 2026 ECYCLE ARENA</span>
        </div>
      </footer>
    </div>
  );
}
