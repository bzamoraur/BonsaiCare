import { createClient } from "@/lib/supabase/server";

/**
 * Server-side data access for locations (where a tree physically lives). RLS
 * scopes every row to the signed-in owner. Server-only (imports `next/headers`).
 */

export type LocationOption = { id: string; name: string };

export const MAX_LOCATION_LENGTH = 60;

/** The current user's locations, alphabetical — for the edit form's datalist. */
export async function listLocations(): Promise<LocationOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to load locations: ${error.message}`);
  return data ?? [];
}

/** The display name of one location, or null. */
export async function getLocationName(id: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load location: ${error.message}`);
  return data?.name ?? null;
}

/**
 * Resolves a location name to an id, creating it if new. Empty → null (clears the
 * tree's location). Matching is case-insensitive so "South bench" and "south
 * bench" don't split into two.
 */
export async function findOrCreateLocation(rawName: string): Promise<string | null> {
  const name = rawName.trim();
  if (name === "") return null;
  if (name.length > MAX_LOCATION_LENGTH) {
    throw new Error(`Location must be ${MAX_LOCATION_LENGTH} characters or fewer.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: existing, error: listError } = await supabase.from("locations").select("id, name");
  if (listError) throw new Error(`Failed to load locations: ${listError.message}`);
  const match = (existing ?? []).find((l) => l.name.toLowerCase() === name.toLowerCase());
  if (match) return match.id;

  const { data, error } = await supabase
    .from("locations")
    .insert({ owner_id: user.id, name })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to save location: ${error.message}`);
  return data.id;
}
