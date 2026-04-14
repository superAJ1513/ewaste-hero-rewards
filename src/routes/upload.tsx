import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload E-Waste — ECycle Arena" },
      { name: "description", content: "Upload a photo of your e-waste to earn points." },
    ],
  }),
  component: UploadPage,
});

const CATEGORIES = [
  "Smartphone / Mobile",
  "Laptop / Computing",
  "Tablet",
  "Peripherals (Mouse, Keyboard)",
  "Cables / Chargers",
  "Batteries",
  "Display / Monitor",
  "Other Electronics",
];

function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!authLoading && !user) {
    navigate({ to: "/login" });
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    setUploading(true);
    setError("");

    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("ewaste-photos")
      .upload(filePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("ewaste-photos")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from("ewaste_submissions")
      .insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        category,
        description: description || null,
      });

    if (insertError) {
      setError(insertError.message);
      setUploading(false);
      return;
    }

    setUploading(false);
    setSuccess(true);
    setFile(null);
    setPreview(null);
    setDescription("");
  };

  const resetForm = () => {
    setSuccess(false);
    setFile(null);
    setPreview(null);
    setDescription("");
  };

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl italic uppercase tracking-tighter sm:text-4xl">
            Drop <span className="text-gradient-neon">E-Waste</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Snap a photo of your e-waste item to earn +200 XP
          </p>
        </div>

        {success ? (
          <div className="border border-neon-acid/30 bg-neon-acid/10 p-8 text-center">
            <div className="font-display text-4xl italic text-neon-acid">+200 XP</div>
            <h2 className="mt-2 font-display text-xl italic uppercase">Item Logged!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your e-waste has been recorded. Keep dropping to climb the leaderboard!
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="neon" onClick={resetForm}>Drop Another</Button>
              <Button variant="neonOutline" onClick={() => navigate({ to: "/leaderboard" })}>
                View Board
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 border border-border bg-surface p-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Photo Evidence
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden border-2 border-dashed border-border bg-background transition-colors hover:border-neon-cyan"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="size-full object-cover" />
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex size-12 items-center justify-center border border-border">
                      <span className="text-2xl text-muted-foreground">📸</span>
                    </div>
                    <p className="text-sm font-bold uppercase tracking-wider">Tap to capture</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">JPG, PNG — Max 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Category
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-neon-cyan"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Description (optional)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Old iPhone 6, broken screen"
                className="bg-background border-border"
                maxLength={200}
              />
            </div>

            <div className="border border-neon-acid/20 bg-neon-acid/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-neon-acid">Reward</span>
                <span className="font-display text-2xl italic">+200 XP</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="neon"
              className="w-full py-4 text-lg"
              disabled={!file || uploading}
            >
              {uploading ? "Uploading..." : "Submit E-Waste"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
