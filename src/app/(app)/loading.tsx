/**
 * Route-level loading fallback for the app shell. Shown while a screen's Server
 * Component awaits its data, so navigating a slow query no longer freezes the
 * previous screen. The bottom nav (from the layout) stays put; only the content
 * area shows this calm placeholder.
 */
export default function AppLoading() {
  return (
    <main
      className="mx-auto flex min-h-[60dvh] w-full max-w-2xl flex-col items-center justify-center gap-3 px-6 py-10"
      aria-busy="true"
    >
      <span
        className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2"
        aria-hidden="true"
      />
      <p className="text-muted-foreground text-sm" role="status">
        Loading…
      </p>
    </main>
  );
}
