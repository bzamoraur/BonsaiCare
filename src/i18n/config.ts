/**
 * i18n configuration (see docs — the language milestone). Locale is chosen by a
 * cookie, not a URL prefix (paths stay `/today`, not `/en/today`) — right for a
 * PWA. English is the fallback, so any not-yet-translated surface reads in English
 * during the incremental rollout.
 */
export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// next-intl's conventional cookie name (also what its middleware would use).
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Native names, each shown in its own language. */
export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}
