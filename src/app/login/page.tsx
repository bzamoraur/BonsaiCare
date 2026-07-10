import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { LoginForm } from "./login-form";

/**
 * Sign-in screen. A Server Component so it can read `searchParams` — the
 * `deleted=1` closure flag set after account deletion, and an `error` code from a
 * failed auth callback (e.g. an expired or already-used magic link) — and show a
 * message above the client-side magic-link form instead of a silent blank form.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const { deleted, error } = await searchParams;
  const t = await getTranslations("auth");
  const tp = await getTranslations("privacy");
  const authError = error ? (error === "auth" ? t("linkProblem") : t("signInProblem")) : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      {authError ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive-strong max-w-sm rounded-md border px-4 py-3 text-center text-sm"
        >
          {authError}
        </p>
      ) : null}
      {deleted === "1" ? (
        <p
          role="status"
          className="border-border bg-muted text-muted-foreground max-w-sm rounded-md border px-4 py-3 text-center text-sm"
        >
          Your account and all your data have been permanently deleted. Thank you for growing with
          us. 🌱
        </p>
      ) : null}

      <LoginForm />

      <Link
        href="/privacy"
        className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
      >
        {tp("title")}
      </Link>
    </main>
  );
}
