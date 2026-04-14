import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-accent/20 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rotate-45 bg-primary">
            <div className="size-4 -rotate-45 bg-background" />
          </div>
          <span className="font-display text-xl italic uppercase tracking-tighter sm:text-2xl">
            E<span className="text-accent">Cycle</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/leaderboard">
            <Button variant="ghost" size="sm" className="text-xs font-bold uppercase tracking-widest">
              Leaderboard
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="neonOutline" size="sm">
              Login
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="neon" size="sm">
              Register
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
