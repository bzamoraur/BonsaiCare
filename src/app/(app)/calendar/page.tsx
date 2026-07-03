export const metadata = {
  title: "Calendar",
};

export default function CalendarPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>

      <section className="border-border rounded-2xl border border-dashed p-10 text-center">
        <p className="text-muted-foreground text-balance">
          No tasks scheduled yet. Planning care with season-aware recurrence arrives in a later
          milestone.
        </p>
      </section>
    </main>
  );
}
