# Roadmap

> Status: v1, 2026-06-26. Phased, scope-disciplined. Each phase has an exit
> criterion. We do not start a phase's "nice-to-haves" until its core ships.
> Estimates are rough effort for a solo dev working part-time; treat as relative,
> not promises.

## Phase 0 — Foundation ✅ (this PR)

Research, product brief, MVP scope, architecture + ADRs, repo structure, docs,
roadmap, risks, setup guides, CI scaffold, GitHub hygiene. **Exit:** the
foundation is reviewed and the stack/scope are agreed. No production code yet.

## Phase 1 — MVP (the usable product)

Goal: **the owner runs their real collection on it for a season.** Built as
milestones; each is independently demoable and merges behind CI.

### M1 — Skeleton & spine *(infra + auth + schema)* ✅
- Scaffold Next.js + TS (strict) + Tailwind + shadcn/ui + PWA manifest/SW.
- ESLint/Prettier/Vitest/Playwright + GitHub Actions CI green.
- Supabase project (EU region); first migrations: `profiles`, `species`,
  `locations`, `trees`, `tags/tree_tags`, **RLS on all**; seed a few species.
- Auth (magic link); protected app shell; the 5-tab navigation skeleton.
- **Exit:** sign in, see an empty Today, RLS isolation test passes, CI green,
  deployed preview works.

### M2 — Trees & photos *(the collection)* ✅
- Trees CRUD; structured profile with progressive disclosure; archive.
- Collection grid (photo-first); filter/sort/search; tags & locations.
- Photo upload/capture → client compression → private bucket + signed URLs;
  cover photo.
- **Exit:** owner can add their real trees with photos and organize them.

### M3 — Timeline & care logging *(history)*
- `care_log_entries` (unified model, [ADR-0005](../decisions/0005-unified-timeline-event-model.md)) with per-type Zod schemas.
- Quick-add care event (global **+**); attach photos.
- Tree timeline (photos + events merged, editable dates, filter by type).
- **Exit:** owner logs real care quickly; a tree shows a coherent timeline.

### M4 — Tasks, recurrence & dashboard *(the daily loop)*
- Tasks CRUD; recurrence (interval + season window, [ADR-0006](../decisions/0006-task-scheduling-and-recurrence.md)); complete/skip → optional event + next occurrence.
- Calendar (list + month); **Today dashboard** (overdue/today/upcoming + health).
- Pure, unit-tested season/recurrence/overdue logic (incl. hemisphere + season-skip).
- **Exit:** the dashboard is trustworthy; fertilization schedules work end-to-end.

### M5 — Trust, polish & production
- **Export** (CSV/JSON + photo archive, [ADR-0008](../decisions/0008-data-ownership-and-export.md)).
- Empty states, dark mode, accessibility pass, performance pass (image loading).
- Production deploy; keep-warm ping; backups/runbook verified; e2e of F1–F7.
- **Exit (Phase 1 done):** deployed, stable, the owner uses it as the primary
  record with no data loss. This is the **success definition**.

## Phase 2 — Enhancements (only after MVP is loved)

Prioritize by the owner's lived friction, roughly:
- **Proactive reminders:** scheduled **email digest** (robust) and best-effort
  **web push** ([ADR-0007](../decisions/0007-notifications-strategy.md)).
- **Bonsai depth:** per-branch **wiring tracker** (apply→remove window +
  inspection), **decandling/defoliation** species-window helpers, "don't stack
  heavy work" guard rails.
- **Species-care rules:** category-level then per-species guidance via
  `species.default_care` (the reserved seam).
- **Data import** (round-trip / from spreadsheet).
- **Multi-user polish** for trusted users (invites, clean per-user separation).
- Light **observability** (error reporting) if needed.

## Phase 3 — Optional commercial (only if pursued)

Public landing page, monetization (transparent, no dark patterns), native shell
(Capacitor/Expo), social/sharing, AI assists — each gated by a real decision and
its own ADR. Hosting moves off Vercel Hobby before any commercial launch (R5).

## Guiding rule

If a proposed task isn't in the current phase's exit criteria, it goes to the
[backlog](./backlog.md) — not into the current milestone. Scope discipline is how
this avoids becoming "a tool that technically exists but isn't pleasant enough to
use."
