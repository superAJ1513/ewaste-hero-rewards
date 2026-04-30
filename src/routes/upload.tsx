import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Drop E-Waste — ECycle Arena" },
      { name: "description", content: "Snap a photo. Our AI detects the item and awards XP automatically." },
    ],
  }),
  component: UploadPage,
});

interface DetectResult {
  category: string;
  label: string;
  xp: number;
  confidence: number;
  requiresContact?: boolean;
  contactPhone?: string;
  reason?: string;
  error?: string;
  imageHash?: string;
  duplicate?: boolean;
}

function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "detecting" | "result" | "saved">("idle");
  const [error, setError] = useState("");
  const [detection, setDetection] = useState<DetectResult | null>(null);

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
    setDetection(null);
    setStage("idle");
  };

  const handleDetect = async () => {
    if (!file || !user) return;
    setStage("uploading");
    setError("");

    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("ewaste-photos")
      .upload(filePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setStage("idle");
      return;
    }

    const { data: urlData } = supabase.storage.from("ewaste-photos").getPublicUrl(filePath);
    const imageUrl = urlData.publicUrl;

    setStage("detecting");
    const { data, error: fnErr } = await supabase.functions.invoke<DetectResult>("detect-ewaste", {
      body: { imageUrl },
    });

    if (fnErr || !data) {
      setError(fnErr?.message || "Detection failed");
      setStage("idle");
      return;
    }

    // Duplicate detection result still renders in the result UI (with 0 XP message)
    if (data.error && !data.duplicate) {
      setError(data.error);
      setStage("idle");
      return;
    }

    setDetection({ ...data, _imageUrl: imageUrl } as DetectResult & { _imageUrl: string });
    setStage("result");
  };

  const handleConfirm = async () => {
    if (!detection || !user) return;
    const imageUrl = (detection as DetectResult & { _imageUrl: string })._imageUrl;

    if (detection.duplicate) {
      // Nothing to claim — already submitted by someone
      return;
    }

    if (detection.category === "unknown") {
      setError("That image wasn't recognized as e-waste. Try a clearer photo.");
      return;
    }

    if (detection.requiresContact) {
      return;
    }

    const { error: insertError } = await supabase.from("ewaste_submissions").insert({
      user_id: user.id,
      image_url: imageUrl,
      category: detection.category,
      description: detection.label,
      xp_awarded: detection.xp,
      detected_label: detection.label,
      confidence: detection.confidence,
      image_hash: detection.imageHash ?? null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setStage("saved");
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setDetection(null);
    setError("");
    setStage("idle");
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
            Snap a photo — our AI detects the item and awards XP instantly
          </p>
        </div>

        {stage === "saved" && detection ? (
          <div className="border border-neon-acid/30 bg-neon-acid/10 p-8 text-center">
            <div className="font-display text-5xl italic text-neon-acid">+{detection.xp.toLocaleString()} XP</div>
            <h2 className="mt-2 font-display text-xl italic uppercase">{detection.label} Logged!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Keep dropping to climb the leaderboard.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="neon" onClick={reset}>Drop Another</Button>
              <Button variant="neonOutline" onClick={() => navigate({ to: "/leaderboard" })}>
                View Board
              </Button>
            </div>
          </div>
        ) : stage === "result" && detection ? (
          <div className="space-y-4 border border-border bg-surface p-6">
            {preview && (
              <img src={preview} alt="Captured" className="aspect-video w-full object-cover border border-border" />
            )}

            {detection.duplicate ? (
              <div className="border border-destructive/40 bg-destructive/10 p-5 text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-destructive">Duplicate Detected</div>
                <h3 className="mt-2 font-display text-2xl italic">+0 XP</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  This image (or a near-identical one) has already been submitted to the platform. Each piece of e-waste can only be claimed once.
                </p>
              </div>
            ) : detection.requiresContact ? (
              <div className="border border-neon-cyan/40 bg-neon-cyan/10 p-5 text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-neon-cyan">Big Item Detected</div>
                <h3 className="mt-2 font-display text-2xl italic">{detection.label}</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Large electronics need negotiation. Give us a call to discuss pickup and XP reward.
                </p>
                <a
                  href={`tel:${detection.contactPhone}`}
                  className="mt-4 inline-block bg-neon-cyan px-6 py-3 font-display text-xl italic text-background"
                >
                  📞 {detection.contactPhone}
                </a>
              </div>
            ) : detection.category === "unknown" ? (
              <div className="border border-destructive/40 bg-destructive/10 p-5 text-center">
                <h3 className="font-display text-xl italic">Couldn't recognize</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  The image wasn't clearly e-waste. Try a closer, clearer photo.
                </p>
              </div>
            ) : (
              <div className="border border-neon-acid/30 bg-neon-acid/5 p-5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Detected</div>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-2xl italic">{detection.label}</h3>
                  <div className="font-display text-3xl italic text-neon-acid">+{detection.xp.toLocaleString()}</div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  Confidence: {(detection.confidence * 100).toFixed(0)}%
                </div>
              </div>
            )}

            {error && (
              <div className="border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
            )}

            <div className="flex gap-3">
              <Button variant="neonOutline" className="flex-1" onClick={reset}>
                Retry
              </Button>
              {!detection.requiresContact && !detection.duplicate && detection.category !== "unknown" && (
                <Button variant="neon" className="flex-1" onClick={handleConfirm}>
                  Claim {detection.xp.toLocaleString()} XP
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 border border-border bg-surface p-6">
            {error && (
              <div className="border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
            )}

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

            <div className="border border-border bg-background/50 p-4 text-[11px] text-muted-foreground">
              <div className="font-bold uppercase tracking-widest text-foreground mb-2">XP Rewards</div>
              <ul className="space-y-1">
                <li className="flex justify-between"><span>Laptop</span><span className="text-neon-acid">+5,000</span></li>
                <li className="flex justify-between"><span>Tablet</span><span className="text-neon-acid">+3,000</span></li>
                <li className="flex justify-between"><span>Phone / Speaker</span><span className="text-neon-acid">+800</span></li>
                <li className="flex justify-between"><span>Earphones / Headphones</span><span className="text-neon-acid">+650</span></li>
                <li className="flex justify-between"><span>Tubelight / LED</span><span className="text-neon-acid">+450</span></li>
                <li className="flex justify-between"><span>Keyboard</span><span className="text-neon-acid">+400</span></li>
                <li className="flex justify-between"><span>Charger / Cable</span><span className="text-neon-acid">+350</span></li>
                <li className="flex justify-between"><span>Mouse / Remote</span><span className="text-neon-acid">+300</span></li>
                <li className="flex justify-between"><span>Battery</span><span className="text-neon-acid">+100</span></li>
                <li className="flex justify-between"><span>Misc (small)</span><span className="text-neon-acid">200–800</span></li>
                <li className="flex justify-between"><span>Misc (big)</span><span className="text-neon-cyan">Call us</span></li>
              </ul>
            </div>

            <Button
              type="button"
              variant="neon"
              className="w-full py-4 text-lg"
              disabled={!file || stage === "uploading" || stage === "detecting"}
              onClick={handleDetect}
            >
              {stage === "uploading" ? "Uploading..." : stage === "detecting" ? "🔍 Analyzing..." : "Analyze & Earn XP"}
            </Button>
            <Link to="/shop" className="block text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-neon-acid">
              Spend your XP in the shop →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
