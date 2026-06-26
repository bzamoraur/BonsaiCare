# ADR-0000: How we record architecture decisions

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Project owner (with Claude Code as architecture partner)

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

- Status: Proposed | Accepted | Superseded by ADR-XXXX | Deprecated
- Date: YYYY-MM-DD
- Deciders: <who>

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

## Consequences

- **Positive:** Cheap to write, durable, greppable, versioned with the code.
  New decisions append; superseded ones are marked, not deleted (the trail
  stays intact).
- **Negative:** Requires discipline to keep writing them. Mitigation: the bar is
  "costly to reverse or shapes the system," not "every choice."
- ADRs are immutable once Accepted. To change a decision, write a new ADR that
  supersedes the old one and update the old one's status.
