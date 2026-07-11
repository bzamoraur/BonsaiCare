import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { isLocale, localeFromAcceptLanguage } from "./config";

/**
 * Resolves the active locale per request. An explicit NEXT_LOCALE cookie (set from
 * Settings) always wins; otherwise — the pre-login / first-visit case — we honour
 * the browser's Accept-Language so a Spanish visitor sees a Spanish login and
 * privacy page. Loads that locale's messages. Wired in via next.config's next-intl
 * plugin; no i18n routing — the locale never appears in the URL.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : localeFromAcceptLanguage((await headers()).get("accept-language"));

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
