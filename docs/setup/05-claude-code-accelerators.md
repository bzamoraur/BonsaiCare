# Setup 05 — Claude Code Accelerators (optional but recommended)

> **Status:** Current · **Updated:** 2026-07-05

> Audience: the owner developing with Claude Code. These speed up and harden
> development. All optional; rationale in
> [accelerators-evaluation](../research/accelerators-evaluation.md).

## 1. Project memory & agents (already in the repo)
- **`CLAUDE.md`** (repo root) — conventions, architecture pointers, guardrails.
  Claude reads it automatically. Keep it current as patterns emerge.
- **`.claude/`** — project-scoped agents/skills live here (committed, shared).

Nothing to install; these work out of the box when you open the repo in Claude
Code.

## 2. superpowers plugin (recommended trial)
A skills framework that enforces a plan → TDD → fresh-agent-review loop — a good
substitute for the peer review a solo dev lacks. MIT, actively maintained, low
security risk as of 2026-06 (see the evaluation). **Per-developer environment
config**, not a repo artifact.

**Install (one command in Claude Code):**
```
/plugin install superpowers@claude-plugins-official
```
- Optional: disable telemetry with the env var `SUPERPOWERS_DISABLE_TELEMETRY=1`.
- It's opinionated and token-hungry; on tiny changes you can bypass its gates via
  `CLAUDE.md` overrides or uninstall with `/plugin`.

## 3. MCP servers (optional)

| Server | Use | Caution |
|---|---|---|
| **Supabase MCP** (official) | Inspect schema, run queries during dev | **Use a dev project, READ-ONLY, single-project scope. Never production write** — documented prompt-injection/exfiltration risk. See [data-and-privacy](../architecture/data-and-privacy.md). |
| **Playwright MCP** (Microsoft, official) | Let Claude drive a browser for E2E checks | Test environment only. |
| **GitHub MCP** (official) | PRs, issues, CI logs | Scope tokens to this repo. |

Configure MCP servers per the Claude Code docs (`/mcp` or `.mcp.json`). Prefer
plain Supabase **CLI migrations** over agent-driven DB mutation for schema
changes.

## 4. What we deliberately did NOT adopt
Heavyweight design systems, broad doc generators, and any MCP requiring
**production** credentials — none clear the cost/risk bar for an MVP. Revisit in
Phase 2 if a concrete need appears.

## How to verify success
- `CLAUDE.md` / `.claude/` — Claude follows the repo conventions without being
  told (they load automatically when the repo is opened).
- superpowers — after install, Claude references its skills (e.g. brainstorming /
  TDD) when you start a non-trivial task.
- MCP servers — `/mcp` lists the server as connected, and a harmless read (e.g.
  listing tables on the **dev** project) works.

## Common errors & fixes
- **superpowers feels heavy on tiny changes** — bypass its gates via `CLAUDE.md`
  overrides, or uninstall (see Rollback).
- **MCP server not listed** — re-check `.mcp.json` syntax or re-run `/mcp`; MCP
  config is per-developer, not committed.
- **Supabase MCP asks for production credentials** — stop; only a dev project
  with read-only scope is permitted (see the caution table above).

## Rollback
- superpowers: `/plugin uninstall superpowers` (or manage via `/plugin`).
- MCP servers: remove the entry from `.mcp.json` (or your Claude Code MCP
  settings) — no repo changes involved.
- `CLAUDE.md` / `.claude/` are versioned — revert via git if an experiment
  misfires.
