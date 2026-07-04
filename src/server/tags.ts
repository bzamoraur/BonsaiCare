import { createClient } from "@/lib/supabase/server";

/**
 * Server-side data access for tags (a flexible, many-to-many organizing axis).
 * RLS scopes tags and the tree_tags join to the signed-in owner. Server-only
 * (imports `next/headers`).
 */

export type TagOption = { id: string; name: string };

/** All of the current user's tags, alphabetical. */
export async function listTags(): Promise<TagOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to load tags: ${error.message}`);
  return data ?? [];
}

/** The tags attached to one tree, alphabetical. */
export async function getTreeTags(treeId: string): Promise<TagOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tree_tags")
    .select("tags(id, name)")
    .eq("tree_id", treeId);
  if (error) throw new Error(`Failed to load tags: ${error.message}`);

  return (data ?? [])
    .map((row) => row.tags)
    .filter((tag): tag is TagOption => tag !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Makes the tree's tags exactly `tagNames`: resolves each name to a tag id
 * (case-insensitive match within the owner, creating new tags as needed), then
 * replaces the tree_tags rows. RLS scopes every read/write to the owner.
 */
export async function syncTreeTags(treeId: string, tagNames: string[]): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // Resolve names → ids, creating any that don't exist yet.
  const { data: existing, error: listError } = await supabase.from("tags").select("id, name");
  if (listError) throw new Error(`Failed to load tags: ${listError.message}`);
  const byLower = new Map((existing ?? []).map((t) => [t.name.toLowerCase(), t]));

  const tagIds: string[] = [];
  const toCreate: string[] = [];
  for (const name of tagNames) {
    const found = byLower.get(name.toLowerCase());
    if (found) tagIds.push(found.id);
    else toCreate.push(name);
  }

  if (toCreate.length > 0) {
    const { data: created, error: createError } = await supabase
      .from("tags")
      .insert(toCreate.map((name) => ({ owner_id: user.id, name })))
      .select("id");
    if (createError) throw new Error(`Failed to create tags: ${createError.message}`);
    tagIds.push(...(created ?? []).map((t) => t.id));
  }

  // Replace the join rows (small set → delete-all-then-insert is simplest).
  const { error: deleteError } = await supabase.from("tree_tags").delete().eq("tree_id", treeId);
  if (deleteError) throw new Error(`Failed to update tags: ${deleteError.message}`);

  if (tagIds.length > 0) {
    const { error: insertError } = await supabase
      .from("tree_tags")
      .insert(tagIds.map((tagId) => ({ owner_id: user.id, tree_id: treeId, tag_id: tagId })));
    if (insertError) throw new Error(`Failed to update tags: ${insertError.message}`);
  }
}
