import { useSyncExternalStore } from "react";

/**
 * The viewer's *local* calendar day — shared so every "today / overdue" boundary
 * agrees. The dashboard, the tree-detail care plan, task completion/skip, and the
 * calendar all render against `serverToday` on the server + first hydration (so
 * SSR matches), then the browser's real local day thereafter — no effect, no
 * hydration mismatch. Server code (UTC on Vercel) must not decide "today" for a
 * viewer in another timezone; that split was the "today" audit finding.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** The viewer's local calendar day as "YYYY-MM-DD" (their clock, not the server's). */
export function localTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Add days to a "YYYY-MM-DD" using local calendar arithmetic. */
export function addLocalDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * A structured "how long ago" for a bare "YYYY-MM-DD" relative to `todayIso`, so
 * the caller can render it in the viewer's language (the label used to be a fixed
 * English string). Day math on the calendar parts via `Date.UTC` (no DST/timezone
 * drift); a today-or-future date reads as "today".
 */
export type RelativeDay =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "days"; value: number }
  | { kind: "weeks"; value: number };

export function relativeDay(fromIso: string, todayIso: string): RelativeDay {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = todayIso.split("-").map(Number);
  const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
  if (days <= 0) return { kind: "today" };
  if (days === 1) return { kind: "yesterday" };
  if (days < 14) return { kind: "days", value: days };
  return { kind: "weeks", value: Math.floor(days / 7) };
}

// The wall clock doesn't push updates, so subscribe is a no-op; the snapshot is
// re-read on every render. Same-day calls return an equal string, so it's stable.
const noopSubscribe = () => () => {};

/**
 * The viewer's local "today" as "YYYY-MM-DD". Hydration-safe via
 * `useSyncExternalStore`: `serverToday` on the server + initial client render,
 * the browser's local day after hydration. Call only from client components.
 */
export function useLocalToday(serverToday: string): string {
  return useSyncExternalStore(noopSubscribe, localTodayIso, () => serverToday);
}
