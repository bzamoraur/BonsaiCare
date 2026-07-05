import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Account deletion (ADR-0008). The order is load-bearing:
 *
 *   1. Remove every storage object under the user's prefix, via their own
 *      RLS-scoped client — while the session (and thus the paths) is still
 *      valid. Storage bytes are NOT foreign-keyed, so nothing else removes them.
 *   2. Call `delete_my_account()`, which deletes the auth.users row and cascades
 *      every owned DB row.
 *
 * If step 1 fails we abort *before* touching the account (a crash then orphans
 * bytes, never rows — the Sprint-07 storage-orphan sweep is the backstop). If
 * step 2 fails, the error surfaces; deletion is never silent.
 */

const BUCKET = "tree-photos";
const LIST_PAGE = 100;
const REMOVE_CHUNK = 100;

type StorageEntry = { name: string; id: string | null };

/** Split an array into fixed-size chunks (pure helper). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** List every entry under a storage prefix, following pagination. */
async function listPrefix(
  supabase: SupabaseClient<Database>,
  prefix: string,
): Promise<StorageEntry[]> {
  const entries: StorageEntry[] = [];
  for (let offset = 0; ; offset += LIST_PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: LIST_PAGE, offset });
    if (error) throw new Error(`Failed to list photos: ${error.message}`);
    const page = data ?? [];
    entries.push(...page);
    if (page.length < LIST_PAGE) break;
  }
  return entries;
}

/**
 * Every storage object owned by the user. The layout is `<uid>/<treeId>/<file>`,
 * so we walk exactly two levels. Files carry an `id`; folders have `id === null`.
 * This catches upload orphans (no `photos` row), not just app-known objects.
 */
export async function collectUserStoragePaths(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const paths: string[] = [];
  const topLevel = await listPrefix(supabase, userId);
  for (const entry of topLevel) {
    if (entry.id !== null) {
      // An unexpected file directly under the user prefix — remove it too.
      paths.push(`${userId}/${entry.name}`);
      continue;
    }
    const files = await listPrefix(supabase, `${userId}/${entry.name}`);
    for (const file of files) {
      if (file.id !== null) paths.push(`${userId}/${entry.name}/${file.name}`);
    }
  }
  return paths;
}

/**
 * Deletes the signed-in user's account: storage bytes first, then the account
 * row (which cascades all DB rows). Throws on any failure so the caller can
 * surface it — deletion must never appear to succeed while leaving data behind.
 */
export async function deleteAccount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  // 1. Storage bytes first (RLS-scoped), while the session is still valid.
  const paths = await collectUserStoragePaths(supabase, userId);
  for (const batch of chunk(paths, REMOVE_CHUNK)) {
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) throw new Error(`Failed to remove photos: ${error.message}`);
  }

  // 2. Delete the account → cascades every owned DB row.
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error(`Failed to delete account: ${error.message}`);
}
