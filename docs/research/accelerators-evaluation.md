# Tooling & Accelerator Evaluation

> Status: v1, 2026-06-26. Evaluates dev-tooling accelerators for this repo.
> Verdicts are evidence-based; facts cited, opinions labelled.

The brief asks us to evaluate accelerators — especially `obra/superpowers` —
and not adopt anything blindly.

## obra/superpowers — verdict: **adopt (trial), document, don't hard-wire**

**What it is (fact):** a skills framework + opinionated dev methodology shipped
as a Claude Code **plugin** (markdown `SKILL.md` files + a `SessionStart` hook
that injects a "use your skills" instruction). Headline loop: brainstorm → write
a plan → git worktree → subagent-driven TDD (red-green-refactor) → fresh-agent
code review. It is **not** a model, binary, or MCP server. ([GitHub](https://github.com/obra/superpowers), [Simon Willison](https://simonwillison.net/2025/Oct/10/superpowers/))

**Maintenance (fact, GitHub API 2026-06-26):** ~239k stars, MIT, last push
2026-06-25, latest release v6.0.3 (2026-06-18). Author **Jesse Vincent**
(`obra`) — long track record (Request Tracker, Perl, Keyboardio). Best-in-class
health signals.

**Security (fact + assessment):** the bundled `SessionStart` hook only reads a
local file and prints it — no network calls, no remote code execution; manifest
declares no MCP servers and no extra permissions; optional telemetry (version
only) disabled via `SUPERPOWERS_DISABLE_TELEMETRY`. **It never touches our
Supabase/data path.** Low intrinsic risk. The realistic costs are (a) running a
third party's bash hook each session — acceptable: short, auditable, MIT,
reputable author; (b) it is token-hungry and opinionated — the mandatory gates
add friction on tiny changes.

**Decision:** **Trial it** via the official marketplace
(`/plugin install superpowers@claude-plugins-official`). Its enforced
plan→TDD→fresh-review loop is a direct substitute for the peer review a solo
developer lacks — squarely aligned with our "production quality, not a
prototype" goal. Because it's per-developer Claude Code environment config (not a
repo artifact, and this remote environment is ephemeral), the durable
deliverable is **documentation + a recommendation**, not a committed file. See
the install note in [`docs/setup/09-claude-code-accelerators.md`](../setup/09-claude-code-accelerators.md).
Dial it back via `CLAUDE.md` overrides if the gates outweigh the value on a
project this small.

## Prioritized accelerators for THIS repo

| Priority | Accelerator | Why | Cost / risk |
|---|---|---|---|
| 1 | **Project `CLAUDE.md` + project skills/subagents** | Highest fit, zero external trust. Encodes *our* conventions (RLS rules, App-Router patterns, domain model). Already created (`CLAUDE.md`, `.claude/`). | Free, in-repo. |
| 2 | **GitHub Actions CI** (typecheck, lint, test, build) | Automated quality gate; catches regressions before merge. | Free (public/solo limits ample). |
| 3 | **superpowers plugin** | Production-discipline loop (above). | Free; token-hungry. |
| 4 | **Playwright** (+ optional Playwright MCP, Microsoft, official) | E2E tests of critical flows; the MCP lets Claude drive the browser. | Free. |
| 5 | **Supabase MCP — read-only, dev project only** | Speeds schema/query work. **⚠️ documented prompt-injection class vuln** — a crafted DB row can trick the agent into exfiltrating data. **Never point at production with write access.** Use a dev/branch project, read-only mode, single-project scope. ([Supabase docs](https://supabase.com/docs/guides/ai-tools/mcp), [General Analysis](https://generalanalysis.com/blog/supabase-mcp-blog)) | Free; **security-sensitive — see [data-and-privacy](../architecture/data-and-privacy.md).** |
| 6 | **ESLint + Prettier + lint-staged + Husky** | Consistent style, pre-commit hygiene. | Free. |

**Deliberately deferred:** heavyweight design systems, doc generators beyond
TypeDoc-if-needed, and any MCP that requires production credentials.

## Key takeaway

The single most security-relevant finding is **not** about superpowers (low
risk) — it's that the **Supabase MCP has a real prompt-injection exfiltration
risk**. That constraint is recorded in the data-and-privacy doc and must be
honored whenever an AI agent is connected to our database.
