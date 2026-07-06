"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for the app shell. Without this, a transient failure while a
 * screen loads its data (Today, Calendar, a tree, the planners) drops the user
 * onto Next's unstyled default error page with no way back — in an installed PWA
 * that reads as the app being dead. This keeps them in the app with a calm,
 * recoverable message and a "Try again" that re-runs the failed render.
 */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground text-sm text-balance">
          We couldn&apos;t load this just now — it&apos;s usually a brief hiccup. Your data is safe.
        </p>
      </div>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
