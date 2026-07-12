# ADR-0008: Treat data export & ownership as a first-class MVP feature

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude
- **See also:** [ADR-0014](./0014-offsite-delete-purge-queue.md) implements the
  off-site (Backblaze B2 mirror) propagation of the "account deletion is real"
  corollary — enqueue at deletion + an out-of-band Actions purge job.

## Context

The clearest, most repeated signal in the bonsai-community research: **serious
growers distrust dedicated apps with their decade-long records** because apps
keep getting abandoned (BonsaiDo, MyBonsai, Vera all died). They fall back to
spreadsheets/Notion specifically to keep data **portable and durable**. The
dedicated app that retains trust (Bonsai Album) does so partly via **CSV
export**. A bonsai record is a multi-year/decade asset; lock-in is a dealbreaker.

## Decision

Ship **data export (CSV and JSON)** of the user's trees, care-log events, tasks,
and photo metadata **in the MVP**, not as a future add-on. Export must
**round-trip the meaningful data** (a tree's profile + full timeline). Photos
are exportable as a downloadable archive (or via their stored paths) so the
visual progression isn't trapped either.

Corollaries:
- **No lock-in by design:** the schema is plain Postgres; export is
  straightforward; we never obfuscate the user's own data.
- The export **doubles as a user-controlled backup** (mitigates the free-tier
  backup-limits risk, R9).
- Account deletion is **real** (cascades to rows + storage), honoring data
  ownership and EU erasure expectations.

## Consequences

- **Positive:** directly converts the niche's #1 trust barrier into a selling
  point; cheap to build on a relational schema; provides a backup path; aligns
  with the "never trap the user's data" principle.
- **Negative / accepted:** a small amount of extra MVP work and ongoing
  maintenance to keep the export current as the schema evolves (a test asserts
  export covers all core tables).
- **Future:** import (round-trip from another instance / spreadsheet) is a
  natural Phase-2 follow-on but is **not** required for MVP.
