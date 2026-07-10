import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { logActionError } from "@/lib/log-action-error";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { DeleteAccountSection } from "./delete-account-section";
import { DownloadButton } from "./download-button";
import { SettingsForm } from "./settings-form";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, hemisphere, units")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (error) logActionError("settingsPage.profile", error);

  const isOwner = Boolean(user?.id && process.env.OWNER_USER_ID === user.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      {error || !profile ? (
        <p role="alert" className="text-destructive text-sm">
          {t("loadError")}
        </p>
      ) : (
        <SettingsForm
          displayName={profile.display_name ?? ""}
          hemisphere={profile.hemisphere}
          units={profile.units}
        />
      )}

      <hr className="border-border" />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">{t("appearance")}</h2>
          <p className="text-muted-foreground text-sm">{t("appearanceDescription")}</p>
        </div>
        <ThemeToggle />
      </section>

      <hr className="border-border" />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">{t("language")}</h2>
          <p className="text-muted-foreground text-sm">{t("languageDescription")}</p>
        </div>
        <LocaleSwitcher />
      </section>

      <hr className="border-border" />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">{t("yourData")}</h2>
          <p className="text-muted-foreground text-sm">{t("yourDataDescription")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DownloadButton href="/settings/export?format=json" fallbackName="bonsai-export.json">
            {t("exportJson")}
          </DownloadButton>
          <DownloadButton href="/settings/export?format=csv" fallbackName="bonsai-export-csv.zip">
            {t("exportCsv")}
          </DownloadButton>
          <DownloadButton href="/settings/export/photos" fallbackName="bonsai-photos.zip">
            {t("downloadPhotos")}
          </DownloadButton>
        </div>
      </section>

      <hr className="border-border" />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("signedIn")}</p>
          <p className="text-muted-foreground truncate text-sm">{user?.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" size="sm">
            {t("signOut")}
          </Button>
        </form>
      </div>

      {isOwner ? (
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
        >
          {t("ownerMetrics")}
        </Link>
      ) : null}

      <hr className="border-border" />

      <DeleteAccountSection />
    </main>
  );
}
