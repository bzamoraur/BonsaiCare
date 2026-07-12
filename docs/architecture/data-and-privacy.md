# Data, Security & Privacy

> **Status:** Current · **Updated:** 2026-07-12
>
> This app holds personal photos and private collection data for an EU-based
> owner. Privacy is treated as a first-class constraint, not an afterthought.

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

## Operational error log (`app_errors`)

The interim error monitor (until a hosted tool is worth adding) is a durable
`app_errors` table, and it is **PII-poor by construction**:

- **What it records:** a machine `context` tag, the error `message`/`digest`,
  the **pathname only** (never the query string), the user-agent, and the
  release SHA. No collection content, no query params.
- **Owner-only read:** the owner reads it on `/admin` via `recent_app_errors`,
  gated on the `private.app_config` singleton and failing **closed**. The table
  has RLS **on with no policies** and its API grants revoked.
- **Safe to write while signed out:** the sole writer, `record_client_error`,
  is `SECURITY DEFINER` and self-stamps `owner_id` from `auth.uid()`, so a crash
  on `/login` records but is never attributable to another user.
- **Inert on display:** `/admin` renders every field escaped, so a crafted
  `message`/`user_agent` is shown as text and cannot execute.

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
- **Right to erasure:** account deletion is a real delete path, not a soft flag.
  `delete_my_account()` cascades every owned row and the user's Storage objects,
  and **enqueues the user's photo prefix for off-site purge** (`b2_purge_queue`)
  so the scheduled B2-mirror cleanup (`b2-purge.yml`) removes their photos from
  the off-site backup too — deletion reaches every copy, not just the live
  bucket. (Trees use soft-archive, but that's a user-facing convenience, not
  legal deletion.)
- **Data residency:** choose an **EU region** for the Supabase project at
  creation (see [setup/02](../setup/02-supabase-project.md)). Document where data
  lives.
- If the app ever becomes commercial/multi-tenant beyond trusted users, revisit
  with a proper privacy policy and DPA review. Tracked as a future task.

## Backups & durability

- The user-facing **export doubles as a manual backup**; encourage periodic
  exports.
- The free tier has no managed backups, so a **weekly `pg_dump`** runs in GitHub
  Actions (`backup.yml`, 35-day artifacts) and a **monthly photo-bytes mirror**
  copies the private bucket to Backblaze B2 (`photo-backup.yml`, incremental,
  never deletes). Restore verified once (drill, 2026-07-08). See R9 in
  [risks](../product/risks-and-assumptions.md).
- **The DB dump is encrypted (AES-256) before upload** and the job **fails loud**
  if `BACKUP_ENCRYPTION_KEY` is missing — a public-repo artifact must never carry
  a plaintext dump of `auth.users` (emails, password hashes, session tokens).
