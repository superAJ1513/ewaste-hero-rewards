import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <div className="border border-border bg-surface p-1">
      <div className="arcade-border bg-background p-6 sm:p-10 lg:p-12">
        <div className="mb-4 inline-block bg-primary px-4 py-1 font-display text-sm uppercase italic text-primary-foreground">
          Season 01: The Great Purge
        </div>
        <h1 className="mb-6 font-display text-4xl italic uppercase leading-[0.9] tracking-tighter sm:text-5xl lg:text-7xl">
          Dump the{" "}
          <span className="text-gradient-neon">Dead Gear.</span>
        </h1>
        <p className="mb-8 max-w-[45ch] text-base text-muted-foreground sm:text-lg">
          Your old hardware is high-value fuel. Trade in your e-waste, boost your ranking,
          and dominate the seasonal prize pool.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/register">
            <Button variant="neon" size="lg" className="text-base">
              Start Dropping
            </Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="neonOutline" size="lg" className="text-base">
              View Leaderboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
