export const metadata = {
  title: "Collection",
};

export default function CollectionPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Collection</h1>

      <section className="border-border bg-card rounded-2xl border p-8 text-center">
        <p className="text-muted-foreground text-balance">
          No trees yet. Adding and organizing your bonsai — the photo-first grid — arrives in the
          next milestone.
        </p>
      </section>
    </main>
  );
}
