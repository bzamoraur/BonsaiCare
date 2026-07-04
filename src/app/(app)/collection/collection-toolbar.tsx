"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { DEVELOPMENT_STAGE_LABELS, HEALTH_STATUS_LABELS } from "@/lib/tree-labels";
import { Constants } from "@/types/database.types";

type Option = { id: string; name: string };

const fieldClass =
  "border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-2.5 text-sm outline-none focus-visible:ring-2";

const FILTER_KEYS = ["q", "location", "tag", "stage", "health", "sort"] as const;

/**
 * Filter / sort / search controls for the collection. Edits the URL query (which
 * the server reads to filter), so results are shareable and survive refresh.
 * Search is debounced; selects apply immediately.
 */
export function CollectionToolbar({ locations, tags }: { locations: Option[]; tags: Option[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(params: URLSearchParams) {
    const qs = params.toString();
    router.replace(qs ? `/collection?${qs}` : "/collection", { scroll: false });
  }

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    navigate(params);
  }

  function onSearchChange(value: string) {
    setSearch(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setParam("q", value.trim()), 300);
  }

  function clearAll() {
    setSearch("");
    navigate(new URLSearchParams());
  }

  const hasFilters = FILTER_KEYS.some((k) => searchParams.get(k));

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by name or species"
        aria-label="Search trees"
        className={`${fieldClass} h-10`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={searchParams.get("location") ?? ""}
          onChange={(e) => setParam("location", e.target.value)}
          aria-label="Filter by location"
          className={fieldClass}
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("tag") ?? ""}
          onChange={(e) => setParam("tag", e.target.value)}
          aria-label="Filter by tag"
          className={fieldClass}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("stage") ?? ""}
          onChange={(e) => setParam("stage", e.target.value)}
          aria-label="Filter by development stage"
          className={fieldClass}
        >
          <option value="">All stages</option>
          {Constants.public.Enums.development_stage.map((v) => (
            <option key={v} value={v}>
              {DEVELOPMENT_STAGE_LABELS[v]}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("health") ?? ""}
          onChange={(e) => setParam("health", e.target.value)}
          aria-label="Filter by health"
          className={fieldClass}
        >
          <option value="">All health</option>
          {Constants.public.Enums.health_status.map((v) => (
            <option key={v} value={v}>
              {HEALTH_STATUS_LABELS[v]}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("sort") ?? ""}
          onChange={(e) => setParam("sort", e.target.value)}
          aria-label="Sort"
          className={fieldClass}
        >
          <option value="">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name (A–Z)</option>
        </select>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
