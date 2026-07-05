import { Download } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { SettingsForm } from "./settings-form";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, hemisphere, units")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {error || !profile ? (
        <p role="alert" className="text-destructive text-sm">
          We could not load your settings right now. Please refresh the page to try again.
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
          <h2 className="text-sm font-medium">Your data</h2>
          <p className="text-muted-foreground text-sm">
            Export a complete, portable copy of your collection — trees, care history, tasks, and
            photo details. Your record is always yours to keep. JSON is the lossless format for
            backup; CSV opens in any spreadsheet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/settings/export?format=json"
            download
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
          >
            <Download aria-hidden="true" />
            Export as JSON
          </a>
          <a
            href="/settings/export?format=csv"
            download
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
          >
            <Download aria-hidden="true" />
            Export as CSV
          </a>
        </div>
      </section>

      <hr className="border-border" />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Signed in</p>
          <p className="text-muted-foreground truncate text-sm">{user?.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
