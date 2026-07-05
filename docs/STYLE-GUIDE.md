# Documentation Style Guide

> **Status:** Living · **Updated:** 2026-07-05

The single source of truth for how documents in this repo are written. New docs
must follow it; existing docs were normalized to it in the 2026-07-05
standardization pass. When this guide and an older doc disagree, the guide wins —
fix the doc.

## Document statuses

Every doc (except the two READMEs and the CHANGELOG) opens with a one-line
blockquote immediately after the H1:

```markdown
> **Status:** <Living | Current | Historical> · **Updated:** YYYY-MM-DD
```

- **Living** — continuously maintained; expected to change every phase (backlog,
  risk register, this guide).
- **Current** — accurate as of the `Updated` date; refresh the date whenever the
  content is re-verified or materially edited.
- **Historical** — kept for the record; no longer maintained. Add one sentence
  saying what superseded it.

**ADRs are the exception**: they keep their own established metadata block
(`- **Status:** / - **Date:** / - **Deciders:**`). See "ADRs" below.

## Headings

- Exactly **one H1** per document. Title Case for the H1; sentence case for H2/H3.
- **No emoji in headings.** (Sole exception: the root `README.md` H1 may keep its
  🌳.) Emoji in body text is fine when it aids scanning (⚠️ for warnings).
- **No status markers inside headings**, with one deliberate exception: milestone
  headings in `roadmap.md` carry a uniform suffix — `— ✅ shipped`,
  `— 🔨 in progress`, or `— planned` — applied to *every* milestone, not just
  finished ones.
- No raw HTML in headings (no `<a id=…>` anchors — Markdown headings already
  generate anchors).
- Don't number H2s (`## 1. …`). If sequence matters, procedural guides may use a
  `Step N — <name>` prefix (see "Setup guides"); reference docs use plain
  headings.

## Links

- Use descriptive link text — [the risk register](product/risks-and-assumptions.md),
  not "here" or a bare path in backticks — whenever a link is possible.
- ADRs are cited as `ADR-000X` with a relative link to their file in
  `docs/decisions/`, e.g. [ADR-0005](decisions/0005-unified-timeline-event-model.md).
- Relative links only within the repo. Every link must resolve — link rot is a
  build failure of the docs.
- Never hardcode a contributor's local filesystem path; write "your local clone".

## Setup guides (`docs/setup/`)

Shared skeleton (the section **names** are required exactly; this order is
preferred for new guides — existing guides keep their order; a pure reference
doc like `04` may drop Steps/Rollback but keeps the shared section names):

1. `## Purpose` — one paragraph.
2. The procedure — `Step N — <name>` H2s for linear guides; `Part A — <name>` is
   grandfathered for `02` (external references point at its parts).
3. `## How to verify success`
4. `## Common errors & fixes`
5. `## Rollback`

These four shared section names are exact — no variants ("Verify", "Common
mistakes", "Rollback / undo", etc.).

## ADRs (`docs/decisions/`)

- Template per [ADR-0000](decisions/0000-adr-process.md): metadata block
  (bold-label form: `- **Status:**`, `- **Date:**`, `- **Deciders:**`), then
  `## Context`, `## Options considered`, `## Decision`, `## Consequences`.
  `Options considered` is **required for new ADRs** (some early ADRs folded
  alternatives into the Decision; they stand as accepted).
- `Deciders` is written exactly `Owner + Claude`.
- **Accepted ADRs are immutable records.** Never rewrite their reasoning. The
  only permitted edits are to the `Status` field (`Proposed`, `Accepted`,
  `Amended by ADR-XXXX`, `Superseded by ADR-XXXX`, `Deprecated` — the ADR-0000
  vocabulary) and fixing broken links.
- Titles are short and specific; the number prefix (`ADR-00XX:`) is part of the H1.

## Roadmap & sprint docs (`docs/roadmap/`)

- Milestone groupings are real headings (`### M3 — …`), never bold text, so they
  appear in outlines.
- Sprint docs carry the standard status line; a finished sprint flips to
  `**Status:** Historical` with its checkboxes checked and a one-line outcome
  note — the record of what actually shipped.
- Priority tags are uniform: `(P1)`, `(P2)`, `(P3)` — applied per item, not per
  section.

## Language & formatting

- **Dates:** ISO `YYYY-MM-DD`.
- **Phases and milestones:** `Phase 2` (space, no hyphen); `M1`…`M5`.
- **Currency:** vendor prices in their native currency (usually USD); add a `≈ €`
  conversion only when the euro figure is the decision-relevant one, and label it.
- Tables have a real header row (no `| | |` headerless tables).
- Sentence-case section headings spell out "and" in prose headings; `&` is fine
  where space is tight (tables, compound titles like "Data, Security & Privacy").
- No trailing whitespace; one blank line after every heading.
- Checkboxes reflect reality — a shipped item is `- [x]`, not left unchecked.

## CHANGELOG

Keep-a-Changelog structure with one project-specific convention, kept
deliberately: entries under `## [Unreleased]` are grouped as
`### Added — Milestone <Mx>: <name>` (plus plain `### Changed` / `### Fixed`
subsections), because milestones — not versions — are this project's release
rhythm until it ships versioned releases.

## Freshness discipline

- Any doc that states project status ("we are in Phase 0", "M1 is next") must be
  updated **in the same PR** that changes that status. Stale status in
  `CLAUDE.md`/`README.md` is treated as a bug, not a nit: agents and humans load
  those files as ground truth.
- Fast-decaying facts (star counts, prices, version numbers) carry an inline
  as-of date.
- Point-in-time artifacts (audits, exports) live in `docs/archive/` with a
  `Historical` status, never at the repo root. Archived docs are kept
  **verbatim** apart from the status header — the formatting rules above do not
  apply retroactively inside `docs/archive/`.
