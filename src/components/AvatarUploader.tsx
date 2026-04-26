import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  initialUrl: string | null;
  fallbackInitials: string;
  onChange?: (url: string | null) => void;
}

export function AvatarUploader({ userId, initialUrl, fallbackInitials, onChange }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ id: userId, avatar_url: publicUrl }, { onConflict: "id" });
      if (profErr) throw profErr;

      setUrl(publicUrl);
      onChange?.(publicUrl);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20 rounded-none border-2 border-neon-acid/60">
        {url ? <AvatarImage src={url} alt="Profile" className="rounded-none object-cover" /> : null}
        <AvatarFallback className="rounded-none bg-muted font-display text-xl italic">
          {fallbackInitials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="neonOutline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading..." : url ? "Change photo" : "Upload photo"}
        </Button>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Shown on the leaderboard. JPG/PNG up to 5MB.
        </p>
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    </div>
  );
}
