# Setup 00 — Developer Onboarding & Session Handover (VS Code + Claude Code)

> **Status:** Historical · **Updated:** 2026-07-05
> The handover this doc describes (Phase 0 → local build) completed on 2026-06-27; M1–M2 have shipped since — kept for the record.

> **Start here** if you're moving development to your own machine in VS Code with
> Claude Code. This is the click-by-click handover from the web planning session
> to a local build session.
>
> Facts about Claude Code below are from the official docs
> (`code.claude.com/docs`), verified 2026-06-26. **UI/commands can change — if a
> step differs, check the linked doc.**

## Why move local? (short answer: yes, it's better for building)

The web session was great for **planning** (research, architecture, docs). For
**building**, a local VS Code + Claude Code setup is materially better because it
can:
- **Run your app** (`pnpm dev`) and see it in the browser, persistently.
- **Run tests, linters, and the Supabase CLI** directly, and iterate fast.
- **Install accelerators** (the superpowers plugin) and **local MCP servers**
  (Playwright to drive the browser, Supabase to inspect a dev DB).
- Keep a **persistent workspace** (the web sandbox is ephemeral and reclaimed).

> ⚠️ **Prerequisite gotcha:** Local Claude Code requires a **paid Claude plan
> (Pro/Max/Team/Enterprise)** *or* an **Anthropic Console** (API billing) account
> — it does **not** run on the free tier.
> ([auth docs](https://code.claude.com/docs/en/authentication.md))

---

## Step 1 — Install the base tools (one-time)

Install these first (see [setup/01](./01-prerequisites-and-local-dev.md) for
detail and verification):

| Tool | Why | Get it |
|---|---|---|
| **VS Code** | Your editor | https://code.visualstudio.com (needs **v1.98.0+** for the extension) |
| **Git** | Version control | https://git-scm.com (Windows: pick "Git for Windows" so Claude uses Bash) |
| **Node.js 20 or 22 LTS** | Runs the app & tooling | https://nodejs.org |
| **pnpm 9+** | Package manager | `npm install -g pnpm` |
| **Supabase CLI** | DB migrations, local stack, types | https://supabase.com/docs/guides/cli |

## Step 2 — Install Claude Code

**The CLI** (run in a terminal):
- **macOS / Linux / WSL:** `curl -fsSL https://claude.ai/install.sh | bash`
- **Windows PowerShell:** `irm https://claude.ai/install.ps1 | iex`
- *(alternatives: `brew install --cask claude-code` on macOS;
  `winget install Anthropic.ClaudeCode` on Windows)*

Verify: `claude --version` prints a version.
([install docs](https://code.claude.com/docs/en/setup.md))

**The VS Code extension** (optional but nice):
1. Open VS Code → Extensions (`Cmd/Ctrl+Shift+X`) → search **"Claude Code"**
   (publisher **Anthropic**) → **Install**.
2. Launch it via the **Spark icon** in the editor toolbar / activity bar, or
   Command Palette (`Cmd/Ctrl+Shift+P`) → "Claude Code: Open".
   > Note: the extension bundles its own CLI for the chat panel, but to run
   > `claude` in VS Code's **integrated terminal** you still need the standalone
   > CLI from above. ([VS Code docs](https://code.claude.com/docs/en/vs-code.md))

## Step 3 — Sign in
Run `claude` once; it opens a browser to log in (press `c` to copy the URL if it
doesn't). Sign in with your **Claude Pro/Max** account (or Console). Re-auth any
time with `/login`. ([auth docs](https://code.claude.com/docs/en/authentication.md))

## Step 4 — Get the project on your machine

First decide the base:
- **Recommended:** review and **merge PR #1** (the foundation) into `main` on
  GitHub first, so your local `main` already contains the foundation. Then build
  Sprint 01 on a fresh branch.
- Or keep working on the existing `claude/focused-keller-4gz784` branch.

```bash
# Clone (HTTPS — GitHub will prompt for username + a Personal Access Token)
git clone https://github.com/bzamoraur/BonsaiCare.git
cd BonsaiCare

# If you merged PR #1, you're on main with the foundation. Otherwise:
# git checkout claude/focused-keller-4gz784

# Open in VS Code
code .
```

> **Git auth:** HTTPS is simplest — when prompted, use your GitHub username and a
> **Personal Access Token** (GitHub → Settings → Developer settings → Tokens;
> `repo` scope). SSH works too if you have a key in `~/.ssh`.

## Step 5 — Hand over to a fresh Claude Code session

In the repo, start Claude Code (`claude` in the integrated terminal, or the
extension panel). `CLAUDE.md` is **auto-loaded** as project context, so Claude
already knows the working agreement. Then paste the kickoff prompt below as your
first message.

**Kickoff prompt (copy-paste):**

```text
Take over development of Bonsai Companion — a production-grade personal bonsai
care & tracking PWA. The Phase 0 foundation (research, architecture, decisions,
roadmap) is already in this repo. Your job is to BUILD it per the plan, not
redesign it.

STEP 1 — Load context. Read these in order, then give me a 5–10 line summary
confirming the locked decisions and flagging any gap or inconsistency you find
BEFORE writing code:
- CLAUDE.md (working agreement)
- docs/README.md (doc map)
- docs/product/product-brief.md, docs/product/mvp-scope.md
- docs/architecture/overview.md, docs/architecture/domain-model.md,
  docs/architecture/data-and-privacy.md
- docs/decisions/ (ADRs 0000–0010)
- docs/roadmap/sprint-01.md, docs/development/workflow.md,
  docs/development/testing-strategy.md

Locked decisions (do not re-litigate; a new significant decision needs a new
ADR): PWA + Next.js (App Router, TS strict); Supabase (Postgres + Auth +
Storage, RLS); Vercel hosting; email magic-link auth; unified timeline event
model (typed core + validated JSONB); editable interval+season recurrence;
pull-first dashboard (not push); data export as a first-class feature; scope =
mvp-scope.md only.

STEP 2 — Then begin Milestone M1 / Sprint 01 exactly as in docs/roadmap/sprint-01.md:
1. First propose a short plan + PR/issue breakdown and WAIT for my OK before
   writing significant code.
2. Work on a new branch (e.g. feature/m1-skeleton), in small single-purpose PRs,
   following the Definition of Done in docs/development/workflow.md. Keep CI green.
3. Scaffold Next.js (App Router, TS strict) + Tailwind + shadcn/ui + PWA (manifest
   + service worker); set up ESLint/Prettier/Vitest/Playwright; make the existing
   GitHub Actions CI pass.
4. Create initial Supabase migrations (profiles, species, locations, trees,
   tags/tree_tags) with RLS enabled + owner policies on EVERY owned table, a
   profile-on-signup trigger, and a small species seed. WRITE THE RLS CROSS-USER
   ISOLATION TEST FIRST (a user must never read another's rows).
5. Wire magic-link auth + session persistence; build the empty app shell with the
   5-destination nav (Today, Collection, Calendar, +, Settings) and a
   hemisphere/units setting.

Guardrails: domain logic pure in src/domain/ (unit-tested); data access in
src/server/ (RLS-aware); no secrets in the repo (env vars only, see .env.example);
free-first; if anything is ambiguous or expands scope, ask me rather than
guessing. If the superpowers plugin is installed, use its plan → TDD → review loop.

Context to remember: Supabase project is EU region; ~40–50 trees; 1 user now
(≤3 later); installable + fast PWA, no offline-sync in MVP.

Start now with STEP 1.
```

Resume this session later with `claude --continue` (most recent) or
`claude --resume` (pick one). Sessions are stored locally, per project.
([sessions docs](https://code.claude.com/docs/en/sessions.md))

## Step 6 — (Optional) Install accelerators locally

**superpowers plugin** (production-discipline loop — see
[setup/05](./05-claude-code-accelerators.md)):
```
/plugin install superpowers@claude-plugins-official
```

**MCP servers** — configure with `claude mcp add` (stored in your user config,
**not** committed, so tokens stay private). Examples:
```bash
# Playwright (lets Claude drive a browser for E2E checks) — no secret needed
claude mcp add playwright -- npx -y @playwright/mcp@latest

# GitHub (PRs/issues/CI) — use a PAT; user-scoped, not committed
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"
```
> **Supabase MCP:** only against a **dev project, read-only, single-project
> scope** — never production write (prompt-injection risk). See
> [data-and-privacy](../architecture/data-and-privacy.md). Manage servers with
> `claude mcp list` / `/mcp`.
>
> Do **not** commit secrets in a project `.mcp.json`. Prefer `claude mcp add`
> (user scope) for anything needing a token.

---

## Common errors & fixes

| Symptom | Cause | Fix |
|---|---|---|
| `claude: command not found` after install | PATH not updated / shell not reloaded | Reopen the terminal; re-run the install; see [troubleshooting](https://code.claude.com/docs/en/troubleshoot-install.md). |
| "Please log in" / can't authenticate | No paid plan / Console account | Local Claude Code needs Pro/Max or Console billing — not free tier. |
| Extension present but `claude` missing in terminal | Extension bundles its own CLI only | Install the standalone CLI (Step 2). |
| `git clone`/push asks for password and fails | GitHub dropped password auth | Use a **Personal Access Token** as the password, or set up SSH. |
| Claude doesn't seem to know the project rules | `CLAUDE.md` not at repo root / wrong folder open | Open the **repo root** in VS Code; confirm `CLAUDE.md` is there. |

## How to verify success
- `claude --version` works; `claude` starts and you're logged in (`/usage` shows
  your plan).
- In the repo, Claude references the project's conventions (it read `CLAUDE.md`).
- `pnpm install` then `pnpm dev` (from M1 onward) serves http://localhost:3000.

## Rollback
- Uninstall the extension from VS Code's Extensions panel; remove the CLI per the
  install method (e.g. `brew uninstall claude-code`).
- Nothing here changes the repo; your work is in git. Mistakes are recoverable via
  `git` and the foundation docs.

---

## Your to-do checklist (in order)

1. [ ] Confirm you have a **Claude Pro/Max** (or Console) plan for local Claude Code.
2. [ ] Review **PR #1** on GitHub; merge it to `main` when happy (or tell me changes).
3. [ ] Install base tools (Step 1) + Claude Code CLI & VS Code extension (Step 2).
4. [ ] `git clone` the repo and `code .` to open it (Step 4).
5. [ ] Start `claude`, sign in, paste the **kickoff prompt** (Step 5).
6. [ ] *(Optional)* install superpowers + Playwright/GitHub MCP (Step 6).
7. [ ] *(Can do now or in Sprint 01)* create the **Supabase project (EU region)**
       via [setup/02](./02-supabase-project.md) and fill `.env.local`
       ([setup/04](./04-environment-variables.md)).

Then the local session builds Sprint 01.
