# ADR-0007: Pull-first dashboard as the reliable core; push is best-effort

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

"Smart notifications" and "seasonal reminders" are headline features of the
reference app — and **notification reliability is the single most common
complaint across every competitor we researched**:
- Bonsai Empire: "silent for weeks, then 5 notifications at once."
- Greg: users with notifications enabled "still not receiving watering
  reminders."
- Category-wide: notification fatigue → midnight alerts → users disable, then
  delete the app.

Meanwhile our platform (PWA, [ADR-0001](./0001-platform-pwa-first.md)) has the
**weakest** push story (iOS web push is installed-PWA-only and historically
flaky). Betting the core experience on push would inherit the category's worst
failure on our weakest channel.

## Decision

Make the **pull-based dashboard the reliable core of the experience**, and treat
push as a **best-effort enhancement layered on top — never the source of truth.**

- The **dashboard** answers "what needs attention?" every time the user opens the
  app: **overdue**, **due today**, **upcoming**, per-tree and collection-wide.
  This is computed from task data and is **always correct and always available** —
  no delivery dependency.
- **Restrained** by design: grouped, calm, no nagging, no midnight pings.
- **Phase 2 (optional):** add **web push** (best-effort) and/or a **scheduled
  email digest** ("here's what's due this week") — email is a *robust* channel
  that sidesteps PWA push limits entirely. Both are additive; the dashboard
  remains the truth.

## Consequences

- **Positive:** neutralizes the category's #1 complaint by *not depending on
  notifications for correctness*; turns the PWA's push weakness into a non-issue;
  matches how the owner will actually use it (open the app in the garden);
  calm-by-default fits the premium UX principle.
- **Negative / accepted:** no proactive nudge in MVP — if you don't open the app,
  nothing reminds you. Mitigation: the optional email digest (Phase 2) covers
  proactive reminding far more reliably than push. Reminders are **not** a stored
  entity; they're a *view/delivery* over tasks, so adding channels later needs no
  data model change.
