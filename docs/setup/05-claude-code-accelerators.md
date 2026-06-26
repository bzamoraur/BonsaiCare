# Setup 05 — Claude Code Accelerators (optional but recommended)

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
security risk (see the evaluation). **Per-developer environment config**, not a
repo artifact.

**Install (one command in Claude Code):**
```
/plugin install superpowers@claude-plugins-official
```
- Optional: disable telemetry with the env var `SUPERPOWERS_DISABLE_TELEMETRY=1`.
- It's opinionated and token-hungry; on tiny changes you can bypass its gates via
  `CLAUDE.md` overrides or uninstall with `/plugin`.

**Verify:** after install, Claude references its skills (e.g. brainstorming /
TDD) when you start a non-trivial task.

## 3. MCP servers (optional)

| Server | Use | ⚠️ Caution |
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
