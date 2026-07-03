"use client";

import { Calendar, Home, LayoutGrid, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
};

const tabs: Tab[] = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/collection", label: "Collection", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

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
        "focus-visible:ring-ring relative flex flex-1 flex-col items-center gap-1 rounded-md py-2 text-xs transition-colors outline-none focus-visible:ring-2",
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
 * Settings, plus a central quick-add action. Quick-add is disabled — and shows a
 * visible "Soon" label — until the capture flow ships in a later milestone.
 */
export function AppNav() {
  const pathname = usePathname();
  const [today, collection, calendar, settings] = tabs;

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center px-2">
        <TabLink tab={today} active={isActive(pathname, today.href)} />
        <TabLink tab={collection} active={isActive(pathname, collection.href)} />

        <div className="flex flex-1 flex-col items-center gap-0.5">
          <button
            type="button"
            disabled
            aria-label="Quick add — coming soon"
            className="bg-primary/70 text-primary-foreground ring-background -mt-6 flex size-14 items-center justify-center rounded-full shadow-md ring-4"
          >
            <Plus className="size-6" aria-hidden />
          </button>
          <span className="text-muted-foreground pb-1 text-[0.65rem] font-medium">Soon</span>
        </div>

        <TabLink tab={calendar} active={isActive(pathname, calendar.href)} />
        <TabLink tab={settings} active={isActive(pathname, settings.href)} />
      </div>
    </nav>
  );
}
