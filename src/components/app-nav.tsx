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
        "focus-visible:ring-ring flex flex-1 flex-col items-center gap-1 rounded-md py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden />
      {tab.label}
    </Link>
  );
}

/**
 * Bottom tab bar (mobile-first) for the app shell: Today, Collection, Calendar,
 * Settings, plus a central quick-add action. Quick-add is disabled until the
 * capture flow ships in a later milestone.
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

        <div className="flex flex-1 justify-center">
          <button
            type="button"
            disabled
            aria-label="Quick add — coming in a later milestone"
            title="Quick add — coming soon"
            className="bg-primary text-primary-foreground -mt-6 flex size-14 items-center justify-center rounded-full shadow-lg disabled:opacity-60"
          >
            <Plus className="size-6" aria-hidden />
          </button>
        </div>

        <TabLink tab={calendar} active={isActive(pathname, calendar.href)} />
        <TabLink tab={settings} active={isActive(pathname, settings.href)} />
      </div>
    </nav>
  );
}
