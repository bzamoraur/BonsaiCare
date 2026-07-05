# Development Workflow & Conventions

> **Status:** Current · **Updated:** 2026-07-05
> How we work — even with one developer — so the project stays coherent and
> resumable. Lightweight, not bureaucratic.

## Branching & PRs
- `main` is always deployable; production deploys from it.
- Work on short-lived branches: `feature/…`, `fix/…`, `chore/…`,
  `docs/…`. (The project foundation itself landed through this same PR flow.)
- Open a **PR** for every change (even solo) — it gives a preview deploy, a CI
  run, and a review surface. Prefer **draft PRs** while in progress.
- Keep PRs small and single-purpose; a PR maps to a milestone task/issue.
- Merge only when **CI is green**. Squash-merge for a clean history.

## Commits
- Conventional, imperative messages: `feat: add tree archive`,
  `fix: correct season skip in southern hemisphere`, `docs: …`, `test: …`,
  `chore: …`.
- Small, logical commits; don't mix refactor + behavior change.

## Definition of Done (per change)
A change is done when:
1. It meets its acceptance criteria.
2. Tests added/updated where logic is non-trivial ([testing-strategy](./testing-strategy.md)).
3. `pnpm typecheck && pnpm lint && pnpm test` pass locally; CI green.
4. Docs updated if behavior/setup/decisions changed (incl. an **ADR** for
   significant decisions, per [ADR-0000](../decisions/0000-adr-process.md)).
5. No secrets added; env vars documented.
6. Tech debt, if any, logged in the [backlog](../roadmap/backlog.md).

## Coding standards
- **TypeScript strict**; no `any` without a written reason. Prefer precise domain
  types; let Zod infer types where possible.
- **Clear domain models; avoid premature abstraction**; avoid giant files (split
  by feature/responsibility); no hidden magic — explicit over clever.
- **Make failure modes explicit** — handle/loudly-surface errors; no silent
  catches. Validate inputs at boundaries (Zod).
- **Domain logic stays in `src/domain/`** (pure, testable), out of components.
- **Data access stays in `src/server/`** (RLS-aware), not scattered in UI.
- **Formatting/linting:** Prettier + ESLint enforce style; pre-commit via
  Husky + lint-staged. Don't hand-format; let the tools.
- Accessibility and the [UX principles](../ux/principles.md) are part of "correct,"
  not polish.

## Quality protocol (run before declaring a task complete)
From the project brief — a quick self-challenge:
- Requirements challenged? Hidden assumptions documented? Edge cases considered?
- Is there a simpler / cheaper / safer / more maintainable solution?
- Tests added where appropriate? Docs updated? Setup still clear?
- Tech debt documented? Production-oriented, not demo-oriented?

## Working with Claude Code
- `CLAUDE.md` (root) holds the always-loaded conventions; keep it lean and
  current.
- Significant decisions → an **ADR**, not just a chat message.
- See [the Claude Code accelerators guide](../setup/05-claude-code-accelerators.md)
  for optional accelerators (superpowers, MCP) and their safety rules.

## Contributing (for future collaborators)
Currently solo. If others join: read the [product brief](../product/product-brief.md),
[architecture overview](../architecture/overview.md), and the ADRs first; follow
this workflow; one PR per concern; respect the MVP scope gate. The project is
**proprietary** ([ADR-0009](../decisions/0009-licensing-proprietary-for-now.md)) —
no public redistribution.
