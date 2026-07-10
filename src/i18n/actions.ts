"use server";

import { cookies } from "next/headers";

import { isLocale, LOCALE_COOKIE, type Locale } from "./config";

/**
 * Persist the chosen language in a year-long cookie. The client refreshes after
 * this resolves so the server re-renders in the new locale. Not httpOnly is fine —
 * it's a UI preference, not a secret — but it's SameSite=Lax and validated here so
 * only a known locale can ever be written.
 */
export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
