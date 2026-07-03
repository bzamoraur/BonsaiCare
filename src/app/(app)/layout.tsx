import { AppNav } from "@/components/app-nav";

/**
 * Shell for the authenticated app: renders the active screen with the bottom
 * navigation. Access is gated by the proxy (src/proxy.ts); this layout is purely
 * presentational. The bottom padding clears the fixed nav bar.
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh pb-24">
      {children}
      <AppNav />
    </div>
  );
}
