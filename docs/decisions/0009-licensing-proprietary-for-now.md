# ADR-0009: Keep the project proprietary ("all rights reserved") for now

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

The project may become a commercial product later. Open-sourcing is effectively
**irreversible** (published code under an OSI license can't be un-published), so
the default choice should preserve optionality. There is no third-party
contribution need yet (solo developer + trusted users).

## Decision

Keep the repository **proprietary — "All rights reserved"** for now. Do **not**
add an OSI open-source license (MIT/Apache/etc.) at this stage. The repository
should be **private** on GitHub. Third-party dependencies retain their own
licenses (we comply with them); this decision concerns *our* code only.

## Consequences

- **Positive:** preserves the commercial path; no obligations created
  prematurely; simplest stance for a private personal project.
- **Negative / accepted:** no community contributions/visibility benefits of open
  source (not wanted yet).
- **Reversal:** we can choose to open-source later under any license. We cannot
  easily reverse the opposite. So we wait deliberately.
- **Note:** a short "© Owner — all rights reserved" notice goes in the README in
  place of a `LICENSE` file. Revisit if/when commercial or collaboration plans
  firm up.
