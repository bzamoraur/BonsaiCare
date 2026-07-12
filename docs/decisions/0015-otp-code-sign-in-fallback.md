# ADR-0015: Add a 6-digit email OTP as an additive fallback to magic-link sign-in

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Owner + Claude

This **amends [ADR-0010](./0010-auth-magic-link-first.md)** (magic-link-first),
mirroring the [ADR-0004](./0004-frontend-stack.md) → [ADR-0011](./0011-server-actions-and-validation.md)
precedent: it qualifies that ADR's literal "only auth method" wording without
reversing its passwordless posture, so ADR-0010's Status is annotated
`Amended by ADR-0015`.

## Context

[ADR-0010](./0010-auth-magic-link-first.md) chose email magic-link as the only
auth method for the MVP. A real-world failure surfaced: the magic link's PKCE
verifier lives in the cookies of the browser that **requested** the link, so a
link opened in a **different** browser — an iPhone mail app's in-app browser, a
link-scanner, a desktop-vs-phone hand-off — cannot complete the exchange and
dead-ends at sign-in. For an installed PWA this reads as the app being broken.
We need to fix it **without** reintroducing passwords.

## Options considered

1. **Keep magic-link only; advise users to open the link in the same browser.**
   Zero code. But it does not work for iPhone in-app browsers at all — a real
   dead-end for exactly the Spanish-speaking friends we are onboarding.
2. **Add email + password.** Familiar. But it reintroduces the passwords
   [ADR-0010](./0010-auth-magic-link-first.md) deliberately avoided (store,
   leak, reset) — against the minimization principle.
3. **Accept the 6-digit code the same email already carries, as an additive
   second path.** Chosen.

## Decision

Choose **option 3.** The `/login` "check your email" screen also accepts the
**6-digit code** from the same email (`supabase.auth.verifyOtp`, `type: 'email'`
in `src/app/login/login-form.tsx`). `verifyOtp` is a **direct token exchange** —
no PKCE verifier cookie needed — so it completes in the browser that started the
flow, even when the link opens elsewhere. On success the session is written to
cookies and a full navigation lets the server pick it up.

Owner-side configuration (hosted Supabase project):

- `{{ .Token }}` added to **both** the **Confirm signup** and **Magic Link**
  email templates (new users hit Confirm-signup on first sign-in; returning
  users hit Magic Link). `{{ .ConfirmationURL }}` is kept in both so the link
  still works wherever it can.
- The **Email OTP expiry is shortened** so a leaked code expires quickly.

This is **additive**: same passwordless email channel, magic-link stays primary,
no data-model change. Documented as a setup step in
[setup/02](../setup/02-supabase-project.md); the failure mode it fixes is
tracked as risk R11.

## Consequences

- **Positive:** fixes cross-browser / in-app-browser / PKCE dead-ends without a
  password and without re-architecture; the no-password posture of
  [ADR-0010](./0010-auth-magic-link-first.md) is intact.
- **Negative / accepted:** a short numeric code is a weaker secret than a signed
  link — mitigated by the shortened OTP expiry and the 1–3-user scale. The owner
  must keep `{{ .Token }}` in both templates for the fallback to work (a manual
  dashboard step, easy to forget on a fresh project — hence the setup-guide row).
- **Reversal:** additive. Removing the code input on the "check your email"
  screen reverts cleanly to magic-link only.
