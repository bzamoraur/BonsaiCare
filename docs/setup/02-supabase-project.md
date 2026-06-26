# Setup 02 — Supabase Project (database, auth, storage, migrations)

> Audience: non-expert owner. This is the **backend**. You can do most of this
> now (it's independent of app code); the migrations/types steps happen during
> Sprint 01.
>
> ⚠️ **UI drift note:** if a label differs, find the nearest equivalent — the
> *values* are what matter.

## Purpose
Create the cloud database, authentication, and photo storage the app uses, in an
**EU region**, on the **free** tier — and learn the few values the app needs.

---

## Part A — Create the project (do this once)

1. Go to **https://supabase.com** → **Start your project** / **Sign in**. Sign in
   **with GitHub** (simplest; reuses your GitHub identity).
2. If prompted, create an **Organization**: name it e.g. `bonsai` ,
   plan **Free**.
3. Click **New project**. Fill in:
   - **Name:** `bonsai-companion` (anything memorable).
   - **Database Password:** click **Generate a password**, then **copy it and
     save it in your password manager**. ⚠️ You need this for direct DB access;
     it is shown once.
   - **Region:** choose an **EU** region for data residency — e.g.
     **West EU (Ireland)** or **Central EU (Frankfurt)**. Pick the one nearest
     you. ⚠️ **Region cannot be changed later** — choose deliberately.
   - **Pricing plan:** **Free**.
4. Click **Create new project** and wait ~2 minutes for provisioning.

## Part B — Get the values the app needs

1. In the project, open **Project Settings** (gear icon) → **API**.
2. Copy these into your notes / password manager:
   - **Project URL** → env var `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon` `public` key** → env var `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role` `secret` key** → env var `SUPABASE_SERVICE_ROLE_KEY`
     ⚠️ **Secret. Server-only. Never put in client code or commit it.** The MVP
     largely avoids needing it; keep it out of the browser bundle.
3. **Project Settings → General**: note the **Reference ID** (`project ref`,
   looks like `abcdwxyz...`) → used by the CLI and the keep-warm ping.

> Full list & meanings: [setup/04-environment-variables.md](./04-environment-variables.md).

## Part C — Configure Authentication (magic link)

1. **Authentication → Providers → Email.** Ensure **Email** is enabled. For the
   simplest passwordless flow, enable **magic link** (and you may disable
   "Confirm password"/password sign-in if you only want magic links).
2. **Authentication → URL Configuration:**
   - **Site URL:** for local dev set `http://localhost:3000`. After deploying,
     change to your production URL (e.g. `https://bonsai-companion.vercel.app`).
   - **Redirect URLs:** add **both** `http://localhost:3000/**` and your
     production URL `https://<your-domain>/**`. ⚠️ If a redirect URL isn't
     listed, magic-link sign-in will fail with a redirect error.
3. (Free tier) The built-in email sender is rate-limited and fine for personal
   use. For reliable delivery later, configure a custom SMTP (Phase 2).

## Part D — Create the photo storage bucket

1. **Storage → New bucket.**
   - **Name:** `tree-photos`
   - **Public bucket:** **OFF** (keep it **private**). Photos are personal.
   - Create.
2. Access policies: we manage these as **migrations** (versioned, reviewable)
   rather than clicking, so they're reproducible. The init migration restricts
   objects to paths prefixed by the owner's user id and grants signed-URL access
   to the owner only. (If you must do it in the dashboard for a quick test, add a
   policy that allows `auth.uid()` to manage objects under their own folder — but
   prefer the migration.)

## Part E — Migrations & types (during Sprint 01, with the CLI)

```bash
# Link your local repo to the hosted project (uses the project ref from Part B)
supabase login                       # opens browser to create an access token
supabase link --project-ref <your-project-ref>

# Create & edit migrations under supabase/migrations/, then push to the project:
supabase db push                     # applies migrations to the hosted DB

# Generate TypeScript types from the live schema:
supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```

> Day-to-day you develop migrations against the **local** stack
> (`supabase db reset`) and only `db push` to the hosted project when ready.

## Part F — Keep-warm (avoid the free-tier pause, Risk R1)

Free Supabase projects **pause after ~7 days of inactivity**. To keep a personal
"production" app responsive, a **free scheduled GitHub Action** pings the project
every few days. See [operations/runbook.md](../operations/runbook.md#keep-warm)
for the workflow. It needs two GitHub **Action secrets**: the project URL and
anon key.

---

## Common errors & fixes

| Symptom | Cause | Fix |
|---|---|---|
| Magic link → "redirect not allowed" | URL not in **Redirect URLs** | Add `http://localhost:3000/**` and prod URL in **Auth → URL Configuration**. |
| App reads nothing / RLS denies everything | RLS on but policies missing/wrong, or not signed in | Confirm policies in the migration; confirm a valid session; see [data-and-privacy](../architecture/data-and-privacy.md). |
| `supabase link` fails | Not logged in / wrong ref | `supabase login`; recheck the project ref (Settings → General). |
| Project unreachable after a week | Free-tier **pause** | Open the dashboard to resume; set up keep-warm (Part F). |
| Photo upload denied | Bucket public/policy wrong | Bucket must be **private** with owner-scoped policy; re-check migration. |

## How to verify success
- The project shows **Active/Healthy** in the dashboard.
- You captured URL + anon key (+ service_role stored securely).
- Email auth enabled; Site URL + Redirect URLs set.
- `tree-photos` bucket exists and is **private**.
- (Sprint 01) `supabase db push` applied migrations; types generated.

## Rollback / fixing mistakes
- **Wrong region** (can't change): create a new project in the right region and
  re-link; delete the old one (no data yet).
- **Leaked a key:** **Project Settings → API → Reset** the relevant key, update
  `.env*` and GitHub/Vercel secrets.
- **Bad migration:** fix forward with a new migration; locally `supabase db reset`
  to rebuild from scratch. Never hand-edit the hosted schema outside migrations.
- **Delete the project:** Project Settings → General → Danger zone (irreversible).
