export const metadata = {
  title: "Today",
};

export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>

      <section className="border-border bg-card rounded-2xl border p-8 text-center">
        <p className="text-muted-foreground text-balance">
          Nothing needs attention today. Your collection lands next — this is the calm home base
          everything else will hang from.
        </p>
      </section>
    </main>
  );
}
