import { cache } from "react";

import type { Hemisphere } from "@/domain/scheduling";
import { createClient } from "@/lib/supabase/server";

type OwnerProfile = {
  hemisphere: Hemisphere;
  onboardingSeenAt: string | null;
};

/**
 * The signed-in owner's profile fields the authenticated UI reads on most
 * renders. Wrapped in React `cache()` so the (app) layout (onboarding flag) and a
 * page like Today (hemisphere) share ONE profiles query per request instead of
 * two. RLS scopes the read to the caller; a genuinely absent row falls back to the
 * canonical defaults (northern hemisphere; tour not yet seen).
 */
const getOwnerProfile = cache(async (): Promise<OwnerProfile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("hemisphere, onboarding_seen_at")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return {
    hemisphere: profile?.hemisphere ?? "northern",
    onboardingSeenAt: profile?.onboarding_seen_at ?? null,
  };
});

/**
 * The signed-in owner's hemisphere, for season-aware UI. Falls back to the
 * canonical northern default (same convention as the scheduling reads in
 * server/dashboard.ts and server/tasks.ts).
 */
export async function getOwnerHemisphere(): Promise<Hemisphere> {
  return (await getOwnerProfile()).hemisphere;
}

/**
 * When the signed-in user dismissed the first-run onboarding tour, or null if they
 * haven't yet (so it should still be shown). Backed by profiles.onboarding_seen_at.
 */
export async function getOnboardingSeenAt(): Promise<string | null> {
  return (await getOwnerProfile()).onboardingSeenAt;
}
