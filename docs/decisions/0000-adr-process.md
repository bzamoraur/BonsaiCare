# ADR-0000: How we record architecture decisions

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

This project must "preserve a decision trail" and avoid becoming a chaotic
prototype. Decisions made implicitly in code or chat are forgotten and
re-litigated. We need a lightweight, durable record of *why* significant
choices were made, so future-us (or a future collaborator) can understand the
reasoning instead of guessing.

## Decision

We use **Architecture Decision Records (ADRs)** — short markdown files in
`docs/decisions/`, one per significant decision, numbered sequentially
(`NNNN-title.md`). We follow a trimmed [MADR](https://adr.github.io/madr/)-style
template.

A decision warrants an ADR when it is **costly to reverse** or **shapes the
system**: platform, framework, hosting, data model, auth model, money, or
anything with meaningful lock-in. Routine choices (which utility library, file
naming) do **not** need an ADR — keep them in code and `CLAUDE.md`.

### Template

```
# ADR-NNNN: <short imperative title>

- **Status:** Proposed | Accepted | Amended by ADR-XXXX | Superseded by ADR-XXXX | Deprecated
- **Date:** YYYY-MM-DD
- **Deciders:** Owner + Claude

## Context
What is the decision and why now? What constraints apply (cost, time, skill,
privacy, scale)? Separate FACTS from ASSUMPTIONS.

## Options considered
Realistic alternatives with honest trade-offs. At least two.

## Decision
The option chosen, stated plainly.

## Consequences
Positive, negative, and the risks we are knowingly accepting. What this makes
easy and what it makes hard later. How we would reverse it if wrong.
```

Options considered is required for new ADRs; ADR-0011 onward complies strictly;
some early ADRs folded alternatives into the Decision and stand as accepted.

## Consequences

- **Positive:** Cheap to write, durable, greppable, versioned with the code.
  New decisions append; superseded ones are marked, not deleted (the trail
  stays intact).
- **Negative:** Requires discipline to keep writing them. Mitigation: the bar is
  "costly to reverse or shapes the system," not "every choice."
- ADRs are immutable once Accepted. To change a decision, write a new ADR that
  supersedes the old one and update the old one's status.

## Pending decisions

Open, system-shaping decisions surfaced by the 2026-07-12 documentation audit.
Each is a one-liner with the question it must answer; each becomes an ADR (or,
where noted, an operational record) when it is taken. Roughly priority-ordered.

- **Registration allowlist mechanism** *(P1, main pre-invite blocker)* — signup
  is open today; before inviting friends, do we gate it to invited emails, and
  via a Supabase auth hook vs an `allowed_emails` table check (plus a Turnstile
  CAPTCHA)?
- **Usage-analytics events shape + retention** *(P1)* — Vercel Web Analytics
  plus a `usage_events` table for key actions (logged care, created/completed
  task) feeding the owner metrics view: what event shape and what retention?
- **Wiring tracker** *(P1, extends [ADR-0005](./0005-unified-timeline-event-model.md))*
  — model the apply→remove window + recurring inspection + close-out as a
  promoted timeline event: what event/promotion shape?
- **Species-care category rules** *(P2)* — adopt the reserved `species.default_care`
  JSONB seam to drive suggested tasks/windows: what rule shape?
- **Data import merge/conflict semantics** *(P2, Phase-2 follow-on to
  [ADR-0008](./0008-data-ownership-and-export.md))* — JSON round-trip first, then
  a CSV mapper: what merge/conflict semantics on re-import?
- **Best-effort web push** *(P2, implements [ADR-0007](./0007-notifications-strategy.md))*
  — add `push_subscriptions` + VAPID + a service-worker handler as a best-effort
  layer over the pull-first dashboard?
- **Offline scope** *(M9)* — commit in an ADR to "app shell + queued care-log
  capture, nothing more" so Phase 2 never accidentally promises local-first?
- **Monetization / billing + entitlements** *(P3, evidence-gated)* — if/when
  monetized, which model (store publication, freemium + Pro, ads) and which
  billing provider + server-side entitlements architecture?
- **Google OAuth** *(P3, additive per [ADR-0010](./0010-auth-magic-link-first.md))*
  — add Google OAuth as an extra sign-in option only if the email round-trip
  becomes annoying?
- **Sentry adoption trigger** *(trigger-gated, extends [ADR-0013](./0013-error-observability-interim.md))*
  — what condition (error volume, need for alerting / stack traces / source
  maps, a second developer) flips the interim `app_errors` log to Sentry, once
  `@sentry/nextjs` installs cleanly on Next 16 / Turbopack?
- **Make the repo public?** *(owner's call; researched in the going-public plan)*
  — go public to unlock free branch protection + unlimited Actions minutes
  (license stays proprietary) vs stay private and gate Vercel deploys on CI?
- **Scheduled-cron resilience** *(operational)* — five scheduled workflows now
  depend on the repo staying active (keep-warm, backup, photo-backup, b2-purge,
  reconcile-storage) and GitHub disables crons after ~60 days of inactivity: does
  the durability/erasure story need monitoring so a disabled cron does not
  silently stop backups or the B2 purge?
- **Backup-key escrow + encrypted-restore drill** *(operational, not an ADR)* —
  confirm `BACKUP_ENCRYPTION_KEY` is armed and its passphrase is recoverably
  escrowed off-repo, and run a restore drill against an encrypted
  `backup.tar.gz.enc` (the 2026-07-08 drill used a pre-encryption plaintext
  dump, so the decrypt path is untested).
