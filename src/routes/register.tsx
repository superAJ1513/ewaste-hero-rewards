import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — ECycle Arena" },
      { name: "description", content: "Create your ECycle Arena account." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  const handleGoogle = async () => {
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/upload",
    });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/upload" });
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl italic uppercase tracking-tighter">
              Join the <span className="text-neon-acid">Arena</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">Create your operator profile</p>
          </div>
          {success ? (
            <div className="border border-neon-acid/30 bg-neon-acid/10 p-6 text-center">
              <h2 className="font-display text-xl italic uppercase text-neon-acid">Account Created!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Check your email to confirm your account, then{" "}
                <Link to="/login" className="text-neon-cyan hover:underline">log in</Link>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 border border-border bg-surface p-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="bg-background border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-background border-border"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" variant="neon" className="w-full py-4 text-lg" disabled={loading}>
                {loading ? "Creating..." : "Create Account"}
              </Button>
              <div className="relative flex items-center py-1">
                <div className="flex-1 border-t border-border" />
                <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">or</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <Button
                type="button"
                variant="neonOutline"
                className="w-full py-4 text-sm flex items-center justify-center gap-2"
                onClick={handleGoogle}
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.4 4.5 9.8 8.8 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13.1-5l-6-5.1c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6 5.1C40.9 36 43.5 30.5 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                </svg>
                Continue with Google
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already a member?{" "}
                <Link to="/login" className="text-neon-cyan hover:underline">
                  Login
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
