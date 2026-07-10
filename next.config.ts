import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Security headers (improvement plan S08.4). The app's XSS surface is small
 * (React escaping everywhere; the only inline script is the static THEME_SCRIPT,
 * which is why script-src needs 'unsafe-inline'), so the CSP is defense-in-depth:
 * its load-bearing lines are frame-ancestors 'none' (the app has one-click-adjacent
 * destructive actions and must not be framable) and the connect/img allowlist
 * (only our own origin + the Supabase project).
 *
 * The Supabase entry is derived from NEXT_PUBLIC_SUPABASE_URL at build time, so
 * the SAME policy covers production (https://<ref>.supabase.co), the CI e2e
 * stack (http://127.0.0.1:54321 — this is what lets e2e genuinely exercise
 * browser→Supabase flows under the enforced CSP), and any future custom domain;
 * the https://*.supabase.co wildcard stays as a safety net. 'unsafe-eval' is
 * appended in development only — React's dev overlay reconstructs error stacks
 * via eval (per Next's own CSP guide); production never gets it.
 *
 * Accepted tradeoff: Vercel's preview-deployment toolbar (vercel.live) is
 * blocked by this CSP, so preview comments won't load; production stays tight.
 * If Supabase Realtime is ever adopted, connect-src also needs
 * wss://*.supabase.co — an https: source never matches wss:.
 */
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' https://*.supabase.co ${supabaseOrigin} blob: data:`,
  `connect-src 'self' https://*.supabase.co ${supabaseOrigin}`,
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .join("; ")
  .replace(/\s{2,}/g, " ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
