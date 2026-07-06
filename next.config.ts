import type { NextConfig } from "next";

/**
 * Security headers (improvement plan S08.4). The app's XSS surface is small
 * (React escaping everywhere; the only inline script is the static THEME_SCRIPT,
 * which is why script-src needs 'unsafe-inline'), so the CSP is defense-in-depth:
 * its load-bearing lines are frame-ancestors 'none' (the app has one-click-adjacent
 * destructive actions and must not be framable) and the connect/img allowlist
 * (only our own origin + the Supabase project). The CI e2e suite runs against
 * `next start` with these headers, so a CSP that breaks a flow fails CI.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://*.supabase.co blob: data:",
  "connect-src 'self' https://*.supabase.co",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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

export default nextConfig;
