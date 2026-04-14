import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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
