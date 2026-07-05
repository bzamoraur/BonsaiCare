import { LoginForm } from "./login-form";

/**
 * Sign-in screen. A Server Component so it can read `searchParams` (the
 * `deleted=1` closure flag set after account deletion) and render a confirmation
 * above the client-side magic-link form.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
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
    </main>
  );
}
