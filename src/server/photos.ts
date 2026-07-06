import { cache } from "react";

import { logActionError } from "@/lib/log-action-error";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

/**
 * Server-side data access for photos. The `tree-photos` bucket is private, so
 * reads return short-lived signed URLs. RLS scopes both the `photos` rows and the
 * Storage objects to the signed-in owner. Server-only (imports `next/headers`).
 */

export type Photo = Tables<"photos">;
export type PhotoWithUrl = Photo & { url: string | null };

const BUCKET = "tree-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** A tree's photos (newest first) with fresh signed URLs. */
export const listTreePhotos = cache(async (treeId: string): Promise<PhotoWithUrl[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("tree_id", treeId)
    .order("taken_at", { ascending: false });
  if (error) throw new Error(`Failed to load photos: ${error.message}`);

  const photos = data ?? [];
  if (photos.length === 0) return [];

  // Signing failures degrade to url: null (the gallery renders placeholders),
  // but never silently — a Storage outage must leave a trace.
  const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUrls(
    photos.map((p) => p.storage_path),
    SIGNED_URL_TTL_SECONDS,
  );
  if (signError) logActionError("listTreePhotos.sign", signError);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return photos.map((p) => ({ ...p, url: urlByPath.get(p.storage_path) ?? null }));
});

/**
 * Records an uploaded photo. `owner_id` comes from the session (matched by RLS);
 * we additionally confirm the tree belongs to the caller (defense-in-depth beyond
 * the Storage path prefix + RLS).
 */
export async function recordPhoto(input: {
  treeId: string;
  storagePath: string;
  width: number;
  height: number;
  careLogEntryId?: string | null;
}): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: tree } = await supabase
    .from("trees")
    .select("id")
    .eq("id", input.treeId)
    .maybeSingle();
  if (!tree) throw new Error("Tree not found.");

  // The object must live under this user's tree folder (matches the Storage RLS
  // path prefix). Rejects a tampered client path before we persist a row for it.
  if (!input.storagePath.startsWith(`${user.id}/${input.treeId}/`)) {
    throw new Error("Invalid storage path.");
  }

  // If attaching to an event, it must be an event of this tree (RLS-scoped).
  if (input.careLogEntryId) {
    const { data: entry } = await supabase
      .from("care_log_entries")
      .select("id")
      .eq("id", input.careLogEntryId)
      .eq("tree_id", input.treeId)
      .maybeSingle();
    if (!entry) throw new Error("That care entry doesn't belong to this tree.");
  }

  const { data, error } = await supabase
    .from("photos")
    .insert({
      owner_id: user.id,
      tree_id: input.treeId,
      storage_path: input.storagePath,
      width: input.width,
      height: input.height,
      ...(input.careLogEntryId ? { care_log_entry_id: input.careLogEntryId } : {}),
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to save photo: ${error.message}`);
  return data;
}

/** Sets a tree's cover photo, enforcing that the photo belongs to that tree. */
export async function setCoverPhoto(treeId: string, photoId: string): Promise<void> {
  const supabase = await createClient();

  const { data: photo, error: selectError } = await supabase
    .from("photos")
    .select("id")
    .eq("id", photoId)
    .eq("tree_id", treeId)
    .maybeSingle();
  if (selectError) throw new Error(`Failed to set cover: ${selectError.message}`);
  if (!photo) throw new Error("That photo doesn't belong to this tree.");

  const { error } = await supabase
    .from("trees")
    .update({ cover_photo_id: photoId })
    .eq("id", treeId);
  if (error) throw new Error(`Failed to set cover: ${error.message}`);
}

/**
 * Deletes a photo: removes the Storage object then the row. The `cover_photo_id`
 * FK is `on delete set null`, so a deleted cover clears itself automatically.
 */
export async function deletePhoto(photoId: string): Promise<void> {
  const supabase = await createClient();

  const { data: photo, error: selectError } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();
  if (selectError) throw new Error(`Failed to delete photo: ${selectError.message}`);
  if (!photo) return; // already gone (or not the caller's)

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  if (storageError) throw new Error(`Failed to delete photo file: ${storageError.message}`);

  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) throw new Error(`Failed to delete photo: ${error.message}`);
}
