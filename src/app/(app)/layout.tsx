import { AppNav } from "@/components/app-nav";
import { OnboardingTour } from "@/components/onboarding-tour";
import { shouldShowTour } from "@/domain/tour";
import { getOnboardingSeenAt } from "@/server/profile";

/**
 * Shell for the authenticated app: renders the active screen with the bottom
 * navigation. Access is gated by the proxy (src/proxy.ts). The bottom padding
 * clears the fixed nav bar.
 *
 * It also reads the first-run onboarding flag server-side and mounts the tour once
 * for the whole shell — computing `initialOpen` here (not in the client) means a
 * returning user never gets a flash of the tour before hydration.
 */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const onboardingSeenAt = await getOnboardingSeenAt();

  return (
    <div className="min-h-dvh pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      {children}
      <AppNav />
      <OnboardingTour initialOpen={shouldShowTour(onboardingSeenAt)} />
    </div>
  );
}
