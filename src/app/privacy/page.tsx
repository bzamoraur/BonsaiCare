import { getTranslations } from "next-intl/server";
import Link from "next/link";

/**
 * A plain-language privacy note. A public route (see isPublicPath in
 * lib/supabase/middleware) so it's reachable from the login page too. Content is
 * translated; keep it honest about the current state (the off-site backup purge is
 * on-request until the automated purge ships).
 */
export async function generateMetadata() {
  const t = await getTranslations("privacy");
  return { title: t("title") };
}

const SECTIONS = [
  ["storeTitle", "storeBody"],
  ["whereTitle", "whereBody"],
  ["rightsTitle", "rightsBody"],
  ["retentionTitle", "retentionBody"],
  ["contactTitle", "contactBody"],
] as const;

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground w-fit text-sm underline-offset-4 hover:underline"
      >
        {t("home")}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground text-balance">{t("intro")}</p>
      <div className="flex flex-col gap-6">
        {SECTIONS.map(([titleKey, bodyKey]) => (
          <section key={titleKey} className="flex flex-col gap-1.5">
            <h2 className="text-sm font-medium">{t(titleKey)}</h2>
            <p className="text-muted-foreground text-sm text-balance">{t(bodyKey)}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
