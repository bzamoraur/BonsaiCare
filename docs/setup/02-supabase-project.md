# Setup 02 — Create the Supabase Project (click-by-click, 2026)

> Audience: **non-expert owner.** This creates the **backend** (database + auth +
> photo storage). You can do Parts A–D **now**; Parts E–F happen during the
> schema/auth work.
>
> ⚠️ **UI-drift note:** Supabase's dashboard renders dynamically and changes
> wording occasionally. If a button label differs slightly, pick the nearest
> equivalent — **the values you enter are what matter.** Verified against
> Supabase docs in **June 2026**.
>
> 🔑 **Important 2026 change:** Supabase replaced the old `anon` / `service_role`
> keys with **Publishable** (`sb_publishable_…`) and **Secret** (`sb_secret_…`)
> keys. Brand-new projects only get the new keys. This guide uses the new system.

## Purpose
Stand up a free, EU-hosted Postgres database with authentication and private file
storage, and collect the four values the app needs:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, the **project
ref**, and (optionally, server-only) `SUPABASE_SECRET_KEY`.

---

## Part A — Create your account and organization (~2 min)

1. Open **https://supabase.com** in your browser.
2. Click **Start your project** (top-right green button). You land on the sign-in
   / sign-up page.
3. **Sign in.** Easiest: **Continue with GitHub** (reuses the GitHub account you
   already use for this repo). Authorize Supabase when GitHub asks. *(Email +
   password also works; it sends a confirmation email.)*
4. First time only, Supabase asks you to **create an Organization** (projects live
   inside an org; billing is per-org).
   - **Name:** anything, e.g. `bonsai`.
   - **Plan:** select the **Free** card ($0). *(The other cards are Pro / Team /
     Enterprise — leave those alone.)*
   - **No credit card** is required.
   - Click **Create organization**.

## Part B — Create the project (~2 min) ⚠️ region is permanent

1. Click **New project** (or go straight to **https://database.new**).
2. Fill in the form:
   - **Name:** `bonsai-companion` (or anything memorable).
   - **Database Password:** click **Generate a password**, then **Copy** it and
     **paste it into your password manager right now.** ⚠️ Supabase does **not**
     store this for you; you need it for direct DB access. (You won't need it for
     normal app use, but save it anyway — it's painful to reset later.)
   - **Region:** choose the **EU** location closest to you (data stays in the EU →
     good for privacy/GDPR). From Spain, best options:
     - **West EU (Paris)** — `eu-west-3` *(closest, recommended)*
     - **Central EU (Frankfurt)** — `eu-central-1`
     - **West EU (Ireland)** — `eu-west-1`
     ⚠️ **Region cannot be changed after creation.** If you pick wrong, you must
     delete and recreate (fine now — there's no data yet).
   - **Compute:** the Free plan runs on the **Nano** instance automatically. If a
     size picker appears, leave it on **Nano** (the $0 option).
3. Click **Create new project**. Provisioning takes **~30 seconds to ~2 minutes**.
   When it finishes you land on the project dashboard (status **Active/Healthy**).

## Part C — Collect the values the app needs

> Two of these are public (go in `.env.local` with a `NEXT_PUBLIC_` prefix); the
> secret key is server-only and **optional** for the MVP. Full reference:
> [setup/04-environment-variables.md](./04-environment-variables.md).

1. **Project ref + Project URL.** ⚠️ The **Project URL is NOT on the API Keys
   page** — Supabase moved it. Two reliable ways to get both:
   - **Read it off the address bar (easiest):** the dashboard URL is
     `.../project/<project-ref>/...`. That `<project-ref>` slug (e.g.
     `abcdefgh1234`) **is your project ref**, and your **Project URL** is just
     `https://<project-ref>.supabase.co`.
   - **Or use the green `Connect` button** (top of the dashboard) → **App
     Frameworks** tab → it prints `NEXT_PUBLIC_SUPABASE_URL=https://…supabase.co`
     and the publishable key, ready to copy.
   - The Project URL is also shown under **Settings → Data API** (left sidebar,
     *Integrations* group); the project ref is also under **Settings → General**.
   - Put the URL in `NEXT_PUBLIC_SUPABASE_URL`.
2. **API keys** — go to **Settings → API Keys** → **Publishable and secret API
   keys** tab (or click **Connect** at the top of the dashboard).
   - **Publishable key** — starts with `sb_publishable_…`. **Safe for the
     browser.** → put in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - **Secret keys** — starts with `sb_secret_…`. **Server-only, bypasses
     security rules — never put it in client code or commit it.** The MVP avoids
     needing it; if a server route ever needs it, use `SUPABASE_SECRET_KEY`
     (no `NEXT_PUBLIC_` prefix).
   - *(A separate **Legacy API keys** tab may show old `anon`/`service_role`
     keys — ignore them; we use the new keys.)*
3. Put the public values into your local env file:
   ```bash
   cp .env.example .env.local   # then paste your values in
   ```

## Part D — Configure Authentication (magic link)

We use passwordless **magic-link** sign-in ([ADR-0010](../decisions/0010-auth-magic-link-first.md)).

1. **Authentication** (left sidebar) → **Sign In / Providers** → ensure **Email**
   is **enabled**. Magic links are sent for email sign-ins by default; you may
   turn **off** "Confirm password" if you want magic-link only.
2. **Authentication → URL Configuration:**
   - **Site URL:** `http://localhost:3000` for now (change to your Vercel URL
     after deploying).
   - **Redirect URLs:** click **Add URL** and add **both**:
     - `http://localhost:3000/**`
     - `https://YOUR-APP.vercel.app/**` (add after you deploy)
     ⚠️ If the URL you sign in from isn't listed here, magic links fail with a
     "redirect not allowed" error.
3. (Free tier) The built-in email sender is rate-limited but fine for 1–3 users.
   If delivery is slow/spammy later, add a free custom SMTP (e.g. Resend) under
   **Authentication → Emails / SMTP** — a Phase-2 nicety, not required now.

## Part E — Connect the CLI and push the schema

> The repo already includes the Supabase CLI (a devDependency) and the schema
> migration. These commands link your local repo to the hosted project and apply
> the schema. Run them in the project folder (`C:\Users\Pc\dev\BonsaiCare`).

```bash
# 1. Log the CLI into your Supabase account (opens a browser, paste the token)
pnpm exec supabase login

# 2. Link this repo to your hosted project (use the project ref from Part C)
pnpm exec supabase link --project-ref YOUR-PROJECT-REF
#    It will ask for the database password from Part B.

# 3. Apply all migrations (creates the tables, RLS, trigger, seeds species)
pnpm exec supabase db push

# 4. Generate the typed database client into the app
pnpm exec supabase gen types typescript --linked > src/types/database.types.ts
```

> Local-only alternative (needs Docker Desktop): `pnpm exec supabase start` then
> `pnpm exec supabase db reset` runs the whole stack on your machine with no
> cloud project. Not required — the hosted flow above is simpler to start.

## Part F — Create the photo storage bucket (needed in M2, not yet)

When we build photo upload (Milestone M2):
1. **Storage** (left sidebar) → **New bucket**.
   - **Name:** `tree-photos`
   - **Public bucket:** **OFF** — keep it **private** (photos are personal).
   - Create.
2. Access policies are managed as **migrations** (versioned, reviewable), not
   clicked, so they're reproducible. The M2 migration restricts each object to a
   path prefixed by the owner's user id. *(You can skip this part until M2.)*

## Part G — Keep-warm (avoid the free-tier pause, Risk R1)
Free projects **pause after ~7 days of inactivity** (and the Free plan allows up
to **2 active projects**, 500 MB DB, 50k monthly users). A free scheduled GitHub
Action pings the project to keep it responsive — see
[operations/runbook.md](../operations/runbook.md#keep-warm). It needs two GitHub
**Action secrets**: the project URL and the publishable key.

---

## Common errors & fixes

| Symptom | Cause | Fix |
|---|---|---|
| Magic link → "redirect not allowed" | Sign-in URL not in **Redirect URLs** | Add `http://localhost:3000/**` (and your prod URL) under **Auth → URL Configuration**. |
| App reads nothing / "permission denied" | Using a legacy/wrong key, or not signed in | Use the **Publishable** key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; confirm a valid session. |
| `supabase link` fails | Not logged in / wrong ref / wrong DB password | `pnpm exec supabase login`; recheck the ref (Settings → General) and the Part B password. |
| `supabase db push` says "must be logged in" | CLI not authenticated | Run `pnpm exec supabase login` first. |
| Project unreachable after a week | Free-tier **pause** | Open the dashboard once to resume; set up keep-warm (Part G). |

## How to verify success
- Project shows **Active/Healthy** in the dashboard.
- You saved: Project URL, **project ref**, **publishable key** (and the DB
  password) — and, if used, the **secret key** stored securely.
- Email auth enabled; **Site URL** + **Redirect URLs** set.
- After Part E: **Table Editor** shows the `trees`, `species`, `profiles`,
  `locations`, `tags`, `tree_tags` tables, and `species` already has ~15 rows.

## Rollback / fixing mistakes
- **Wrong region** (can't change): **Settings → General → Danger zone → Delete
  project**, then recreate in the right region (no data lost — there's none yet).
- **Leaked a key:** **Settings → API Keys** → rotate/revoke the secret key (or
  roll the publishable key); update `.env.local`, Vercel, and GitHub secrets.
- **Bad migration:** never hand-edit the hosted schema — fix forward with a new
  migration and `supabase db push` (locally, `supabase db reset` rebuilds from
  scratch).
