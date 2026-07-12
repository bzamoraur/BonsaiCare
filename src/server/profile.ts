import type { Hemisphere } from "@/domain/scheduling";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in owner's hemisphere, for season-aware UI. A genuinely absent
 * profile row falls back to the canonical northern default (same convention as
 * the scheduling reads in server/dashboard.ts and server/tasks.ts). RLS scopes
 * the read to the caller.
 */
export async function getOwnerHemisphere(): Promise<Hemisphere> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("hemisphere")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return profile?.hemisphere ?? "northern";
}
