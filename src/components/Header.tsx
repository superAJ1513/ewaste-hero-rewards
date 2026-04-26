import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

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

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            to="/leaderboard"
            activeProps={{ className: "[&_button]:text-neon-acid [&_button]:bg-neon-acid/10" }}
          >
            <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest sm:text-xs">
              Board
            </Button>
          </Link>
          <Link
            to="/shop"
            activeProps={{ className: "[&_button]:text-neon-acid [&_button]:bg-neon-acid/10" }}
          >
            <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest sm:text-xs">
              Shop
            </Button>
          </Link>
          {user ? (
            <>
              <Link
                to="/profile"
                activeProps={{ className: "[&_button]:text-neon-acid [&_button]:bg-neon-acid/10" }}
              >
                <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest sm:text-xs">
                  Me
                </Button>
              </Link>
              <Link to="/upload">
                <Button variant="neon" size="sm">
                  Drop
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="neonOutline" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="neon" size="sm">
                  Join
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
