/**
 * Theme preference store (client-only). The palette tokens live in globals.css
 * under `.dark`; this decides whether that class is on <html>. Preference is
 * `system` | `light` | `dark`, persisted in localStorage. A no-flash script in
 * the root layout applies the class before first paint; this store keeps the
 * Settings toggle in sync and reacts to OS changes when the preference is system.
 *
 * Read via `useSyncExternalStore(subscribe, getTheme, getServerTheme)` — no
 * effect-setState, and hydration-safe (the server snapshot is always "system").
 */

export type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : "system";
  } catch {
    return "system";
  }
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Browser-UI (status bar / address bar) colour per resolved theme. MUST mirror
// the values in the no-flash THEME_SCRIPT in src/app/layout.tsx.
const THEME_COLORS = { light: "#5a7d54", dark: "#1a2a1f" } as const;

/**
 * Keep `<meta name="theme-color">` in step with the RESOLVED theme, not just the
 * OS preference: an explicit light/dark choice that differs from the OS would
 * otherwise leave the status bar showing the wrong colour. Creates the meta if
 * the no-flash script somehow hasn't (defensive).
 */
function syncThemeColor(dark: boolean): void {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light);
}

/** Toggle the `.dark` class on <html> to match a preference + the OS setting,
 * and sync the browser-UI theme colour to the resolved theme. */
export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  syncThemeColor(dark);
}

export function getTheme(): Theme {
  return readStored();
}

/** The SSR/first-paint snapshot — always `system` (no storage on the server). */
export function getServerTheme(): Theme {
  return "system";
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled: still apply for this session.
  }
  applyTheme(theme);
  for (const listener of listeners) listener();
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    applyTheme(readStored()); // re-apply so a `system` preference tracks the OS
    callback();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      applyTheme(readStored());
      callback();
    }
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}
