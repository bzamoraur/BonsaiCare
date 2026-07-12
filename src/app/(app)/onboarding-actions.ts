"use server";

import { logActionError } from "@/lib/log-action-error";
import { createClient } from "@/lib/supabase/server";

/**
 * Record that the signed-in user dismissed the first-run onboarding tour (by
 * finishing or skipping it), so it isn't shown again. Best-effort and idempotent:
 * the `is null` guard means only the FIRST dismissal is stamped — a later Settings
 * "replay" re-opens the tour client-side and must never overwrite the original
 * timestamp. A failure only means the tour may reappear next visit (never a broken
 * screen), so the error is logged, not thrown. RLS (profiles_update_own) scopes
 * the write to the caller's own row.
 */
export async function markOnboardingSeen(): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_seen_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("onboarding_seen_at", null);
    if (error) throw error;
  } catch (error) {
    logActionError("markOnboardingSeen", error);
  }
}
