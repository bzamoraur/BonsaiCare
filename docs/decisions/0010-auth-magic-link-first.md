# ADR-0010: Authentication via email magic-link for the MVP

- **Status:** Accepted — amended by [ADR-0015](./0015-otp-code-sign-in-fallback.md) (additive 6-digit OTP code sign-in; passwordless posture unchanged)
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

We need authentication for 1 user now, up to ~3 trusted users later
([risks](../product/risks-and-assumptions.md)). Privacy/minimization is a core
principle, and a competitor pain point was **forced re-login**. Supabase Auth
([ADR-0002](./0002-backend-supabase.md)) supports magic-link, email+password, and
OAuth providers. The owner delegated the method choice to Claude ("your call as
an expert").

## Options considered

1. **Email magic-link (passwordless).** No password to store/leak/reset; simplest
   setup; great UX; Supabase built-in. Cons: depends on email delivery (built-in
   sender is rate-limited — fine for ≤3 users); a per-login email round-trip
   (mitigated by long-lived sessions).
2. **Email + password.** Familiar. Cons: passwords to manage, reset, and
   potentially leak — against the minimization principle; more surface.
3. **Google OAuth.** One-tap, no email round-trip. Cons: requires setting up a
   Google Cloud OAuth client + consent screen now (extra manual config);
   assumes users have/ want to use Google.

## Decision

Use **email magic-link as the only auth method for the MVP.** It gives the best
privacy posture (no passwords) for the least setup, and email-delivery limits are
irrelevant at 1–3 users. We **persist sessions** so users rarely re-authenticate
(directly fixing the "forced re-login" complaint).

**Google OAuth is deferred to Phase 2** as a purely additive option if the email
round-trip becomes annoying — it needs no re-architecture.

## Consequences

- **Positive:** nothing secret to store for users; minimal setup (no Google Cloud
  project now); clean UX; aligns with privacy-by-construction.
- **Negative / accepted:** magic-link UX depends on email deliverability. The
  Supabase built-in sender can be slow / land in spam. **Mitigation:** acceptable
  at our scale; if delivery is poor, configure a free custom SMTP (e.g. Resend
  free tier) in Supabase — documented as a fallback in
  [setup/02 Part C](../setup/02-supabase-project.md) and the
  [runbook](../operations/runbook.md). Not required for MVP.
- **Reversal:** adding OAuth or password auth later is additive in Supabase; no
  data-model change.
