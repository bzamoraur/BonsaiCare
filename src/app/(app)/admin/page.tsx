import { notFound } from "next/navigation";

import { logActionError } from "@/lib/log-action-error";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Owner metrics",
};

/**
 * Owner-only metrics. Gated by the OWNER_USER_ID env value (server-only — a
 * colleague can never flip it, unlike a DB flag). Non-owners get a 404 so the
 * page's existence isn't revealed. Data comes from the `owner_metrics` RPC
 * (aggregate, non-PII counts across all users).
 */
type OwnerMetrics = {
  generated_at: string;
  total_users: number;
  signups_7d: number;
  signups_30d: number;
  active_users_7d: number;
  active_users_30d: number;
  total_trees: number;
  total_care_logs: number;
  total_tasks: number;
};

/** A row from the `recent_app_errors` RPC (jsonb). All text is attacker-writable
 * (anon can POST to /api/log-error), so it is ONLY ever rendered as escaped React
 * children below — never via dangerouslySetInnerHTML. */
type AppErrorRow = {
  id: number;
  occurred_at: string;
  source: "client" | "server";
  context: string | null;
  message: string | null;
  digest: string | null;
  path: string | null;
};

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="border-border bg-card flex flex-col gap-1 rounded-xl border p-4">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </div>
  );
}

export default async function AdminPage() {
  const ownerId = process.env.OWNER_USER_ID;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !ownerId || user.id !== ownerId) notFound();

  const { data, error } = await supabase.rpc("owner_metrics");
  if (error) logActionError("ownerMetrics.rpc", error);
  const metrics = (data as OwnerMetrics | null) ?? null;

  const { data: errorData, error: errorsError } = await supabase.rpc("recent_app_errors", {
    p_limit: 100,
  });
  if (errorsError) logActionError("recentAppErrors.rpc", errorsError);
  const recentErrors = (errorData as AppErrorRow[] | null) ?? [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Owner metrics</h1>
        <p className="text-muted-foreground text-sm">
          Aggregate reach &amp; engagement across everyone using the app — no per-person data.
        </p>
      </header>

      {error || !metrics ? (
        <p role="alert" className="text-destructive text-sm">
          We couldn&apos;t load metrics right now. Please refresh to try again.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Reach</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Registered" value={metrics.total_users} hint="total accounts" />
              <Stat label="New · 7 days" value={metrics.signups_7d} />
              <Stat label="New · 30 days" value={metrics.signups_30d} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Active users</h2>
            <div className="grid grid-cols-2 gap-3">
              <Stat
                label="Active · 7 days"
                value={metrics.active_users_7d}
                hint="logged care in the last week"
              />
              <Stat
                label="Active · 30 days"
                value={metrics.active_users_30d}
                hint="logged care in the last month"
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">What they&apos;re tracking</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Trees" value={metrics.total_trees} />
              <Stat label="Care logged" value={metrics.total_care_logs} />
              <Stat label="Tasks" value={metrics.total_tasks} />
            </div>
          </section>

          <p className="text-muted-foreground text-xs">
            As of {new Date(metrics.generated_at).toLocaleString()}.
          </p>
        </>
      )}

      <hr className="border-border" />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">
            Recent errors
            {recentErrors.length > 0 ? (
              <span className="text-muted-foreground"> ({recentErrors.length})</span>
            ) : null}
          </h2>
          <p className="text-muted-foreground text-sm">
            Server and browser crashes across everyone using the app — newest first, no private
            data. Kept for reference; a friend&apos;s bug is no longer invisible.
          </p>
        </div>

        {recentErrors.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing recorded — all quiet. 🌱</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentErrors.map((e) => (
              <li
                key={e.id}
                className="border-border bg-card flex flex-col gap-1 rounded-xl border p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                      e.source === "server"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {e.source}
                  </span>
                  {e.context ? (
                    <span className="font-mono text-xs font-medium break-all">{e.context}</span>
                  ) : null}
                  <time className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
                    {new Date(e.occurred_at).toLocaleString()}
                  </time>
                </div>
                {e.message ? <p className="text-sm break-words">{e.message}</p> : null}
                <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
                  {e.path ? <span className="font-mono break-all">{e.path}</span> : null}
                  {e.digest ? <span className="font-mono">digest: {e.digest}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
