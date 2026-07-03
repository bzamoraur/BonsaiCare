import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Today",
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>

      <section className="border-border bg-card rounded-2xl border p-8 text-center">
        <p className="text-muted-foreground text-balance">
          Nothing needs attention today. Your collection lands next — this is the calm home base
          everything else will hang from.
        </p>
      </section>

      {user?.email ? (
        <p className="text-muted-foreground text-center text-xs">Signed in as {user.email}</p>
      ) : null}
    </main>
  );
}
