# ADR-0002: Use Supabase (Postgres + Auth + Storage) as the backend

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

We need a backend providing a database, authentication, file storage for photos,
and per-user data isolation — on a **free tier**, with **strong data integrity**
(the domain is highly relational: trees → photos → events → tasks), and
**minimal lock-in**.

## Options considered

1. **Supabase** — managed **Postgres** + Auth + Storage + auto-generated typed
   client + **Row-Level Security**. Open-source core (self-hostable → less
   lock-in). Free tier: ~500 MB DB, 1 GB storage, 50k MAU. **Caveat: free
   projects pause after ~1 week of inactivity.**
2. **Firebase** — mature; Auth + Storage + **Firestore (NoSQL)**. Cons: NoSQL is
   a poor fit for our relational, integrity-sensitive domain; heavier Google
   lock-in; security rules are a separate language.
3. **Neon/Postgres + separate auth + separate storage** — Postgres with
   near-instant cold start and no full pause. Cons: more moving parts to wire
   (auth, storage, RLS plumbing) → slower delivery.
4. **Local-first (SQLite + sync engine)** — best offline/ownership. Cons: sync
   complexity; overkill for MVP.

## Decision

Use **Supabase.** Postgres matches the relational domain and our **data
integrity** principle far better than Firestore; **RLS** gives database-enforced
privacy that satisfies our security principle; Auth + Storage + typed client
collapse three concerns into one well-integrated, free service, maximizing speed
of delivery. Open-source/Postgres underneath limits lock-in (we could self-host
or migrate the SQL).

## Consequences

- **Positive:** relational integrity + foreign keys; RLS isolation; one service
  for DB/Auth/Storage; generated TypeScript types; free; portable SQL.
- **Negative / accepted risks:**
  - **Free-tier pause after ~7 days idle** (R1). Mitigation: a free scheduled
    GitHub Action pings the DB to keep it warm; documented in the
    [runbook](../operations/runbook.md). Neon is the fallback if this is too
    annoying.
  - 1 GB free storage is finite — mitigated by client-side image compression (R4)
    and documented upgrade trigger in [cost-model](../operations/cost-model.md).
  - The **Supabase MCP prompt-injection risk** constrains how we use AI agents
    against the DB — see [data-and-privacy](../architecture/data-and-privacy.md)
    (R6).
- **Reversal:** schema lives in versioned SQL migrations; the data layer is
  isolated in `server/`, so migrating the Postgres elsewhere (e.g. Neon + a
  separate auth/storage) is bounded work, not a rewrite.
- **Action:** choose an **EU region** at project creation for data residency.
