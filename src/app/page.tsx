import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <span
        aria-hidden
        className="bg-primary text-primary-foreground inline-flex size-20 items-center justify-center rounded-3xl shadow-sm"
      >
        <svg viewBox="0 0 512 512" className="size-12" fill="currentColor">
          <circle cx="256" cy="178" r="74" />
          <circle cx="178" cy="230" r="56" />
          <circle cx="334" cy="230" r="56" />
          <path d="M248 230 q-4 72 -30 124 h76 q-26 -52 -30 -124 z" />
          <rect x="176" y="352" width="160" height="38" rx="12" />
          <path d="M192 390 h128 l-12 40 a14 14 0 0 1 -14 12 h-76 a14 14 0 0 1 -14 -12 z" />
        </svg>
      </span>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Bonsai Companion</h1>
        <p className="text-muted-foreground mx-auto max-w-md text-balance">
          A calm, photo-first companion for tracking and caring for your bonsai collection.
        </p>
      </div>

      <p className="text-muted-foreground text-sm">
        Foundation in place — your collection lands next.
      </p>

      <Button disabled>Coming soon</Button>
    </main>
  );
}
