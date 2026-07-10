"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Constants } from "@/types/database.types";

type Option = { id: string; name: string };

// text-base (16px) keeps iOS from zooming the viewport when a select is focused.
const fieldClass =
  "border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-3 text-base outline-none focus-visible:ring-2";

// Keys that narrow the grid — the "Filters" badge counts these. `q` (search) stays
// always-visible in the bar; `sort` is an ordering, not a filter, so it's excluded
// from the count (but a non-default sort still lights the trigger — see triggerActive).
const FILTER_KEYS = ["location", "tag", "stage", "health"] as const;
const CLEARABLE_KEYS = [...FILTER_KEYS, "sort"];
const SORT_VALUES = ["oldest", "name"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mirror the server's parseFilters validation (collection/page.tsx): a malformed or
// stale value (e.g. ?stage=foo, ?location=notauuid) is dropped server-side, so it
// must not light up the badge either — keeping the badge honest about the grid.
function isActiveFilter(key: string, value: string | null): boolean {
  if (!value) return false;
  if (key === "location" || key === "tag") return UUID_RE.test(value);
  if (key === "stage")
    return (Constants.public.Enums.development_stage as readonly string[]).includes(value);
  if (key === "health")
    return (Constants.public.Enums.health_status as readonly string[]).includes(value);
  return false;
}

/**
 * Filter / sort / search controls for the collection. Search stays inline; the
 * dropdowns live behind a "Filters" button (with an active-count badge) that opens
 * a bottom sheet — so the default grid isn't crowded by a row of selects. Every
 * control edits the URL query the server reads, so results stay shareable and
 * survive refresh. Search is debounced; selects apply immediately.
 */
export function CollectionToolbar({ locations, tags }: { locations: Option[]; tags: Option[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tStage = useTranslations("stages");
  const tHealth = useTranslations("health");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drive the native modal from state (controlled — the effect re-syncs on every
  // change, so it never drifts the way a bare `open` prop can).
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (filtersOpen && !d.open) d.showModal();
    else if (!filtersOpen && d.open) d.close();
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [filtersOpen]);

  // Cancel a pending search debounce if the toolbar unmounts (e.g. navigating to a
  // tree) so a late timer can't fire router.replace and yank the user back here.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Build writes from the LIVE URL, not the render-captured searchParams: a debounced
  // q-write (or a second select change) firing after another write must merge onto the
  // latest params, not a stale snapshot that would clobber it. Safe here — only called
  // from client event handlers / the debounce timer, never during render.
  function navigate(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(window.location.search);
    mutate(params);
    const qs = params.toString();
    router.replace(qs ? `/collection?${qs}` : "/collection", { scroll: false });
  }

  function setParam(key: string, value: string) {
    navigate((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setParam("q", value.trim()), 300);
  }

  // Clear the filters/sort but keep the user's search text (it's outside the sheet).
  function clearFilters() {
    navigate((params) => {
      for (const key of CLEARABLE_KEYS) params.delete(key);
    });
  }

  const activeFilterCount = FILTER_KEYS.filter((k) =>
    isActiveFilter(k, searchParams.get(k)),
  ).length;
  // A non-default sort isn't counted (it's an ordering, not a filter) but still marks
  // the trigger "active", so a re-ordered grid isn't silent when the sheet is closed.
  const sortActive = SORT_VALUES.includes(searchParams.get("sort") ?? "");
  const triggerActive = activeFilterCount > 0 || sortActive;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or species"
          aria-label="Search trees"
          className={`${fieldClass} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            "focus-visible:ring-ring inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium outline-none focus-visible:ring-2",
            triggerActive
              ? "border-primary text-foreground"
              : "border-input text-muted-foreground hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
          {activeFilterCount > 0 ? (
            <span
              aria-label={`${activeFilterCount} active`}
              className="bg-primary text-primary-foreground inline-flex size-5 items-center justify-center rounded-full text-xs font-semibold"
            >
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setFiltersOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setFiltersOpen(false);
        }}
        aria-labelledby="collection-filters-title"
        className="bg-card text-foreground fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border-0 p-0 backdrop:bg-black/50"
      >
        {filtersOpen ? (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 id="collection-filters-title" className="text-lg font-semibold tracking-tight">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring -mr-1 rounded-md p-1 outline-none focus-visible:ring-2"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <Field id="filter-location" label="Location">
                <select
                  id="filter-location"
                  value={searchParams.get("location") ?? ""}
                  onChange={(e) => setParam("location", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">All locations</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="filter-tag" label="Tag">
                <select
                  id="filter-tag"
                  value={searchParams.get("tag") ?? ""}
                  onChange={(e) => setParam("tag", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">All tags</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="filter-stage" label="Development stage">
                <select
                  id="filter-stage"
                  value={searchParams.get("stage") ?? ""}
                  onChange={(e) => setParam("stage", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">All stages</option>
                  {Constants.public.Enums.development_stage.map((v) => (
                    <option key={v} value={v}>
                      {tStage(v)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="filter-health" label="Health">
                <select
                  id="filter-health"
                  value={searchParams.get("health") ?? ""}
                  onChange={(e) => setParam("health", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">All health</option>
                  {Constants.public.Enums.health_status.map((v) => (
                    <option key={v} value={v}>
                      {tHealth(v)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="filter-sort" label="Sort">
                <select
                  id="filter-sort"
                  value={searchParams.get("sort") ?? ""}
                  onChange={(e) => setParam("sort", e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name (A–Z)</option>
                </select>
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* Always enabled: disabling the button the user just pressed would drop
                  focus to <body> inside the open modal. A no-op when nothing is set. */}
              <button
                type="button"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
              >
                Clear filters
              </button>
              <Button type="button" onClick={() => setFiltersOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
