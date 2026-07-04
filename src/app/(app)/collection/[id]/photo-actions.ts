"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deletePhoto, recordPhoto, setCoverPhoto } from "@/server/photos";

/** Refreshes the tree detail + the collection grid (whose cover may have changed). */
function revalidateTree(treeId: string) {
  revalidatePath(`/collection/${treeId}`);
  revalidatePath("/collection");
}

/**
 * Records a photo the client already uploaded to Storage. Called directly from
 * the uploader with metadata (not via a form). Returns a result the client can
 * surface, and revalidates so the new photo appears.
 */
export async function recordPhotoAction(input: {
  treeId: string;
  storagePath: string;
  width: number;
  height: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await recordPhoto(input);
  } catch {
    return { ok: false, error: "We couldn't save that photo. Please try again." };
  }
  revalidateTree(input.treeId);
  return { ok: true };
}

/** Form action (id + photo bound server-side): make a photo the tree's cover. */
export async function setCoverAction(treeId: string, photoId: string): Promise<void> {
  try {
    await setCoverPhoto(treeId, photoId);
  } catch {
    redirect(`/collection/${treeId}?error=cover`);
  }
  revalidateTree(treeId);
}

/** Form action (photo + tree bound server-side): delete a photo. */
export async function deletePhotoAction(photoId: string, treeId: string): Promise<void> {
  try {
    await deletePhoto(photoId);
  } catch {
    redirect(`/collection/${treeId}?error=photo`);
  }
  revalidateTree(treeId);
}
