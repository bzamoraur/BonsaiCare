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

/** Toggle the `.dark` class on <html> to match a preference + the OS setting. */
export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
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
