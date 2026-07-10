"use client";

import { Calendar, Home, LayoutGrid, Plus, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { QuickAddSheet } from "@/components/quick-add-sheet";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-visible:ring-ring relative flex flex-1 flex-col items-center gap-1 rounded-md py-2 text-center text-[0.65rem] leading-none transition-colors outline-none focus-visible:ring-2",
        active
          ? "text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground font-medium",
      )}
    >
      {/* Non-color active indicator: a bar that is present only when active. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-0 h-0.5 w-8 rounded-full",
          active ? "bg-primary" : "bg-transparent",
        )}
      />
      <Icon className="size-5" aria-hidden />
      {tab.label}
    </Link>
  );
}

/**
 * Bottom tab bar (mobile-first) for the app shell: Today, Collection, Calendar,
 * Settings, plus a central "+" that opens the quick-add sheet (pick a tree, then
 * log care or add a photo — without loading the full profile). The "+" is an
 * `<a href="/log">` first, so with JS disabled it still reaches the log flow; when
 * hydrated it opens the sheet instead. The sheet closes on navigation.
 */
export function AppNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tabs: Tab[] = [
    { href: "/today", label: t("today"), icon: Home },
    { href: "/collection", label: t("collection"), icon: LayoutGrid },
    { href: "/calendar", label: t("calendar"), icon: Calendar },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];
  const [today, collection, calendar, settings] = tabs;
  const [sheetOpen, setSheetOpen] = useState(false);

  // Close the sheet whenever the route changes — it lives in the persistent shell,
  // so it would otherwise stay open across a navigation. Resetting during render on
  // a changed pathname (React's recommended pattern) avoids a setState-in-effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setSheetOpen(false);
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-2xl items-center px-2">
          <TabLink tab={today} active={isActive(pathname, today.href)} />
          <TabLink tab={collection} active={isActive(pathname, collection.href)} />

          <div className="flex flex-1 flex-col items-center gap-0.5">
            <a
              href="/log"
              aria-label={t("quickLog")}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              onClick={(e) => {
                e.preventDefault();
                setSheetOpen(true);
              }}
              className="bg-primary text-primary-foreground ring-background focus-visible:ring-ring -mt-6 flex size-14 items-center justify-center rounded-full shadow-md ring-4 transition-transform outline-none hover:scale-105 focus-visible:ring-2 active:scale-95"
            >
              <Plus className="size-6" aria-hidden />
            </a>
            <span className="text-muted-foreground pb-1 text-[0.65rem] font-medium">
              {t("log")}
            </span>
          </div>

          <TabLink tab={calendar} active={isActive(pathname, calendar.href)} />
          <TabLink tab={settings} active={isActive(pathname, settings.href)} />
        </div>
      </nav>

      <QuickAddSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
