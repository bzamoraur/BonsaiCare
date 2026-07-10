import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale } from "./config";

/**
 * Resolves the active locale per request from the NEXT_LOCALE cookie (falling back
 * to English) and loads that locale's messages. Wired in via next.config's
 * next-intl plugin. No i18n routing — the locale never appears in the URL.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get("NEXT_LOCALE")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
