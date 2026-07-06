/**
 * The one place server-side failures get recorded (golden rule: no silent
 * catches). `console.error` from a Server Action / Server Component / route
 * handler lands in Vercel's function logs — the free-tier observability floor
 * while Sentry stays uninstallable on Next 16. When Sentry lands, this body is
 * the single swap point. Context is a stable machine-ish tag ("createTree"),
 * never user content — logs must stay PII-poor.
 */
export function logActionError(context: string, error: unknown) {
  console.error(`[action:${context}]`, error);
}
