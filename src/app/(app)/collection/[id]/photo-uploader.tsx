"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

import { recordPhotoAction } from "./photo-actions";

/**
 * Uploads a photo straight from the browser: compress → put in the private
 * `tree-photos` bucket (Storage RLS enforces the owner's folder) → record the
 * row via a Server Action → refresh. `ownerId` is the tree's owner (always the
 * signed-in user), so the object path lands under the caller's prefix.
 */
export function PhotoUploader({ treeId, ownerId }: { treeId: string; ownerId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const { blob, width, height } = await compressImage(file);
      const supabase = createClient();
      const path = `${ownerId}/${treeId}/${crypto.randomUUID()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("tree-photos")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const result = await recordPhotoAction({ treeId, storagePath: path, width, height });
      if (!result.ok) {
        // Best-effort cleanup so a failed record doesn't orphan the object.
        await supabase.storage.from("tree-photos").remove([path]);
        throw new Error(result.error);
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : "Add photo"}
      </Button>
      {error ? (
        <span role="alert" className="text-destructive text-sm">
          {error}
        </span>
      ) : null}
    </div>
  );
}
