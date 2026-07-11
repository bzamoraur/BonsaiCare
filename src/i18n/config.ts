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

/**
 * Picks the best supported locale from an `Accept-Language` header, honouring the
 * `q` weights and matching on the primary subtag (so `es-ES` and `es-419` both map
 * to `es`). Used only pre-login, when there's no NEXT_LOCALE cookie yet — so a
 * Spanish-browser friend lands on a Spanish login/privacy page. Falls back to the
 * default when nothing matches.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q === undefined ? 1 : Number(q) || 0 };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return defaultLocale;
}
