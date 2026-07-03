/**
 * Validated access to public environment variables.
 *
 * Only `NEXT_PUBLIC_*` values belong here — they are safe to ship to the browser
 * and are inlined by Next at build time. Never add a server-only secret to this
 * module: it is imported by Client Components. A missing value throws at import
 * so misconfiguration fails loudly at startup rather than at the first query.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and ` +
        `fill it in (see docs/setup/04-environment-variables.md).`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
} as const;
