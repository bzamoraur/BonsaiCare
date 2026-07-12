/**
 * First-run onboarding tour — pure step model + navigation logic (no React, no
 * Supabase), so it is unit-testable like the rest of `src/domain`. The UI layer
 * (src/components/onboarding-tour.tsx) maps each step id to an icon and its
 * translated title/body; the "seen" flag is persisted server-side.
 *
 * The three steps mirror the core loop a new user learns:
 *   addTree  → log the collection
 *   logCare  → record care in seconds
 *   timeline → read each tree's merged story
 */
export const TOUR_STEPS = ["addTree", "logCare", "timeline"] as const;

export type TourStepId = (typeof TOUR_STEPS)[number];

/**
 * Whether the first-run tour should be shown to this user. It is shown exactly
 * once per user: `onboarding_seen_at` is NULL until they skip or finish it (a
 * timestamp thereafter). This is the single source of the "show it" decision.
 */
export function shouldShowTour(onboardingSeenAt: string | null): boolean {
  return onboardingSeenAt === null;
}

/** True when `index` is the first step (nothing to go back to). */
export function isFirstStep(index: number): boolean {
  return index <= 0;
}

/** True when `index` is the last step (the finish/CTA step). */
export function isLastStep(index: number): boolean {
  return index >= TOUR_STEPS.length - 1;
}

/** The next step index, clamped to the last step. */
export function nextStep(index: number): number {
  return Math.min(index + 1, TOUR_STEPS.length - 1);
}

/** The previous step index, clamped to the first step. */
export function prevStep(index: number): number {
  return Math.max(index - 1, 0);
}
