import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  userId: string;
  initialUrl: string | null;
  initialName: string | null;
  fallbackInitials: string;
  onChange?: (url: string | null) => void;
  onNameChange?: (name: string | null) => void;
}

export function AvatarUploader({ userId, initialUrl, initialName, fallbackInitials, onChange, onNameChange }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [name, setName] = useState<string>(initialName ?? "");
  const [savedName, setSavedName] = useState<string>(initialName ?? "");
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    setName(initialName ?? "");
    setSavedName(initialName ?? "");
  }, [initialName]);

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

  const handleSaveName = async () => {
    setNameMsg(null);
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setNameMsg("Name can't be empty.");
      return;
    }
    if (trimmed.length > 32) {
      setNameMsg("Keep it under 32 characters.");
      return;
    }
    setSavingName(true);
    try {
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert({ id: userId, display_name: trimmed }, { onConflict: "id" });
      if (profErr) throw profErr;
      setSavedName(trimmed);
      onNameChange?.(trimmed);
      setNameMsg("Saved!");
      setTimeout(() => setNameMsg(null), 2000);
    } catch (e) {
      console.error(e);
      setNameMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingName(false);
    }
  };

  const dirty = name.trim() !== savedName.trim();

  return (
    <div className="space-y-4">
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

      <div className="space-y-2">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Display name
        </label>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your handle"
            maxLength={32}
            className="flex-1"
          />
          <Button
            type="button"
            variant="neon"
            size="sm"
            disabled={!dirty || savingName}
            onClick={handleSaveName}
          >
            {savingName ? "Saving..." : "Save"}
          </Button>
        </div>
        {nameMsg && (
          <p className={`text-[10px] ${nameMsg === "Saved!" ? "text-neon-acid" : "text-destructive"}`}>
            {nameMsg}
          </p>
        )}
      </div>
    </div>
  );
}
