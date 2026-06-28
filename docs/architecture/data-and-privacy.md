# Data, Security & Privacy

> Status: v1, 2026-06-26. This app holds personal photos and private collection
> data for an EU-based owner. Privacy is treated as a first-class constraint, not
> an afterthought.

## Principles

1. **Least data.** Collect only what the product needs (collection data + the
   user's email for auth). No tracking, no ad SDKs, no selling data.
2. **Isolation by construction.** A user can never read another user's data —
   enforced in the database (RLS), not just the UI.
3. **Private by default.** Photos are in a private bucket; nothing is public
   unless explicitly made so (no public sharing in MVP).
4. **The user owns their data.** Export any time; deletion is real.
5. **Secrets never touch the repo.** Env vars only.

## Authorization model — Row-Level Security (RLS)

Every owned table carries `owner_id uuid references auth.users`. RLS is **enabled
on every such table** with policies of the form:

```sql
-- Example (trees). Mirrored for photos, care_log_entries, tasks, tags,
-- locations, profiles, and user-owned species rows.
alter table trees enable row level security;

create policy "owner can read own trees"
  on trees for select using (auth.uid() = owner_id);
create policy "owner can insert own trees"
  on trees for insert with check (auth.uid() = owner_id);
create policy "owner can update own trees"
  on trees for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner can delete own trees"
  on trees for delete using (auth.uid() = owner_id);
```

Rules we hold ourselves to:
- **No table with user data ships without RLS enabled and policies tested.** A
  test asserts that user B cannot read user A's rows.
- Seeded global `species` rows (`owner_id is null`) are world-readable but not
  writable by users; a user's custom species are owner-scoped.
- The **secret key is server-only** and never shipped to the client. The
  browser uses the publishable key + the user's JWT, which RLS constrains.

## Storage (photos)

- A **private** bucket (`tree-photos`). Storage RLS/policies restrict object
  paths to the owner (path prefixed by `auth.uid()`).
- The client never gets a public URL; it requests **short-lived signed URLs** for
  display.
- Images are **compressed/resized client-side** before upload (protects the free
  storage budget and speeds loads). Original EXIF GPS is stripped on processing
  to avoid leaking photo locations.

## Secrets & configuration

- All secrets via environment variables; see
  [`.env.example`](../../.env.example) and
  [setup/04](../setup/04-environment-variables.md).
- `NEXT_PUBLIC_*` vars are **public by definition** (shipped to the browser) —
  only the Supabase URL and publishable key go there. The **secret key**,
  if ever needed, is a server-only secret.
- `.gitignore` excludes all `.env*` files. CI uses GitHub Actions secrets.
- If a secret leaks: rotate it immediately in the Supabase dashboard, then
  invalidate (see [runbook](../operations/runbook.md)).

## AI-agent / MCP safety (important)

This repo is developed with AI agents. The **Supabase MCP server has a
documented prompt-injection class vulnerability**: malicious content stored in
the database (e.g. a crafted text field) can trick a connected agent into
exfiltrating other rows. ([Supabase docs](https://supabase.com/docs/guides/ai-tools/mcp),
[General Analysis](https://generalanalysis.com/blog/supabase-mcp-blog)) Therefore:

- **Never connect an AI agent to the production database with write access.**
- Use a **dev/branch project**, **read-only** mode, scoped to a **single
  project**, when using the Supabase MCP at all.
- Prefer plain migrations + the Supabase CLI for schema changes over agent-driven
  DB mutation.

## Privacy & compliance (EU owner)

For personal + trusted-user use this is light, but we build the right habits:
- **Lawful basis / minimization:** only email (auth) + user-entered collection
  data. No analytics/tracking by default.
- **Right to access / portability:** satisfied by the CSV/JSON **export**
  feature.
- **Right to erasure:** account deletion cascades to all owned rows and storage
  objects (implement a real delete path, not a soft flag, for *account* deletion;
  trees use soft-archive but that's user-facing, not legal deletion).
- **Data residency:** choose an **EU region** for the Supabase project at
  creation (see [setup/02](../setup/02-supabase-setup.md)). Document where data
  lives.
- If the app ever becomes commercial/multi-tenant beyond trusted users, revisit
  with a proper privacy policy and DPA review. Tracked as a future task.

## Backups & durability

- The user-facing **export doubles as a manual backup**; encourage periodic
  exports.
- Understand the free tier's backup limits during setup (see
  [runbook](../operations/runbook.md), R9 in
  [risks](../product/risks-and-assumptions.md)). Consider a scheduled `pg_dump`
  via GitHub Actions if free backups prove insufficient.
