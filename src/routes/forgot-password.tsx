import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — ECycle Arena" },
      { name: "description", content: "Reset your ECycle Arena password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl italic uppercase tracking-tighter">
              Reset <span className="text-neon-cyan">Access</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll email you a reset link
            </p>
          </div>
          {sent ? (
            <div className="space-y-4 border border-border bg-surface p-6 text-center">
              <div className="bg-neon-acid/10 border border-neon-acid/30 p-3 text-xs text-neon-acid">
                Check your inbox at <strong>{email}</strong> for a reset link.
              </div>
              <Link to="/login" className="block text-xs text-neon-cyan hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 border border-border bg-surface p-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@ecycle.gg"
                  className="bg-background border-border"
                  required
                />
              </div>
              <Button type="submit" variant="neon" className="w-full py-4 text-lg" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Remembered it?{" "}
                <Link to="/login" className="text-neon-cyan hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
