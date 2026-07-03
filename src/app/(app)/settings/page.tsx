import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { SettingsForm } from "./settings-form";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, hemisphere, units")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <SettingsForm
        displayName={profile?.display_name ?? ""}
        hemisphere={profile?.hemisphere ?? "northern"}
        units={profile?.units ?? "metric"}
      />

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
