import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — ECycle Arena" },
      { name: "description", content: "Create your ECycle Arena account and start recycling e-waste for rewards." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with auth
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
          <form onSubmit={handleSubmit} className="space-y-4 border border-border bg-surface p-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="CYBER_PUNK_99"
                className="bg-background border-border"
              />
            </div>
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
              />
            </div>
            <Button type="submit" variant="neon" className="w-full py-4 text-lg">
              Create Account
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already a member?{" "}
              <Link to="/login" className="text-neon-cyan hover:underline">
                Login
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
