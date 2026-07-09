# Going public — friends → beta → App Store / Play Store (researched)

> **Status:** Proposed · **Created:** 2026-07-09 · A 4-stream, web-grounded
> research pass (distribution · security/legal · monetization · beta/launch;
> 60+ sources). The **last** milestone of the roadmap — captured now so every
> earlier decision (licensing, data model, auth) stays launch-compatible.

**The one-paragraph answer.** Ship **Google Play first** (a Trusted Web Activity
wraps our *live* PWA — almost no code change, low rejection risk, **$25 one-time**).
Treat the **iOS App Store as a separate, later, harder track**: Apple rejects thin
web wrappers (Guideline 4.2) and — the real blocker — our **Next.js RSC + Server
Actions can't be statically exported**, so an iOS Capacitor build needs a
client-rendered shell + Supabase Edge Functions, plus genuine native features
(local notifications, camera, Face ID). **Stay 100% free through public GA** — the
instant you charge a cent, Vercel Hobby is void (→ Pro), Pl@ntNet's free tier
becomes a breach (→ €1,000/yr), CC-BY-NC assets become infringing, and EU **DSA
"trader" disclosure** publishes your contact details. We already hold the
hardest-to-retrofit pieces: **per-user RLS, in-app account deletion, full export,
private photo bucket, backups.**

---

## The launch ladder

### Phase 0 · Harden the friends build (now — no store, no cost, no regret)

Real security/legal hardening that's valuable regardless of stores, and is a
prerequisite for opening signup later. These are legitimate near-term slices:

- **Auth hardening for eventual open signup** (all currently off in
  `supabase/config.toml`): enable **CAPTCHA** (Cloudflare Turnstile / hCaptcha) on
  signup/sign-in/reset, a **production SMTP** provider with SPF/DKIM/DMARC
  (Supabase's default sender is ~2 emails/hr — unusable publicly), **leaked-password
  protection**, DB **SSL enforcement**, tuned per-IP auth rate limits, MFA on the
  Supabase org account.
- **User-facing legal pages** as real app routes (none exist today — only the
  internal `docs/architecture/data-and-privacy.md`): **`/privacy`**, **`/terms`**,
  and a **plant-care liability disclaimer** ("general information, not professional
  advice, provided AS-IS"). Sign the **Supabase + Vercel DPAs** and name them as
  sub-processors.
- **GDPR paperwork** (EU controller; the <250-employee exemption doesn't apply to
  regular software processing): a short **Records of Processing (RoPA)** and a
  **72-hour breach-notification runbook** to the AEPD.

### Phase 1 · Friends beta (PWA URL, €0)

Keep distributing the installable PWA behind the current allowlist — this **is** the
beta, and the same friends satisfy Google's tester gate. Instrument privacy-first:
**Umami or PostHog** (EU region, anonymous events only), **Sentry** free (PII
scrubbed in `beforeSend`), a **Better Stack** status page (free, commercial-use OK —
unlike UptimeRobot), and an in-app feedback link. **Gate:** the M7 "friends-gates"
all green (RLS, deletion, export, offline verified).

### Phase 2 · Google Play (TWA — the easy store, $25 one-time)

- Package the PWA as a **TWA** via Bubblewrap / PWABuilder → an AAB running the full
  Chrome engine; needs **Digital Asset Links** (`assetlinks.json`) + **Lighthouse
  ≥ 80**. It loads our live Vercel PWA — **no static-export refactor needed.**
- **Closed testing with ≥ 12 opted-in friends for 14 consecutive days** before
  production (mandatory for new personal accounts — our friends beta *is* this).
- Complete the **Data Safety** form (email, photos, care data) — must match reality
  or risk an account ban. Decide **DSA trader status** (declare *not a trader* while
  free; monetizing later flips this to a public-contact-details requirement).

### Phase 3 · Public GA (still free)

Play **staged rollout** (1–5% → ramp, halt on regressions). Publish the landing
page (free on Vercel). Socialize **genuinely** (mods' permission) in r/Bonsai,
Bonsai Nut, Bonsai Empire forums, FB groups; a **Product Hunt** launch; long-tail
**ASO** ("bonsai watering reminder", not "plant app"). Open public signup only once
CAPTCHA + SMTP + privacy declarations are live.

### Phase 4 · iOS App Store (later — the real engineering lift)

- **Capacitor** shell for iOS (one project could later serve both stores). **Must**
  bundle web assets locally (loading the Vercel URL → "web clip" rejection) → this
  requires the **RSC/Server-Actions → client-rendered-shell refactor** (direct
  Supabase JS + RLS; server-only logic → Edge Functions). Biggest single task.
- Add native features to clear **Guideline 4.2**: **`@capacitor/local-notifications`**
  for offline care reminders (no server/APNs, and counts as native value),
  `@capacitor/camera`, share, **Face ID**. (iOS Web Push does *not* work in a
  WKWebView — don't assume the PWA's web-push carries over.)
- Build iOS **in the cloud** from Windows (Codemagic / Xcode Cloud — free tiers) — no
  Mac purchase needed initially. **$99/yr** Apple + TestFlight beta (mind 90-day
  build expiry). Expect one or two 4.2 review round-trips.

### Phase 5 · Monetize (only on traction **and** a real free-tier breach)

Don't monetize at launch. Flip it on only when (1) a few hundred engaged users and
(2) you're provably about to hit **Supabase's 1 GB photo-storage wall** (the first
ceiling for a photo app). Then:

- **Freemium + auto-renewing subscription** — keep watering/reminders/log/export
  free; put advanced diagnosis, unlimited trees, cloud photo backup, plant-ID behind
  **"Bonsai Pro" ~€19–25/yr** (undercuts Planta €35.99 / PictureThis €39.99).
- **StoreKit + Play Billing are mandatory** for in-app digital subs (Stripe is
  prohibited); front them with **RevenueCat** (free < $2,500 MTR). Enroll Apple
  **Small Business Program** → **15%** cut (not 30%).
- **Throw the paid-infra switches FIRST:** Vercel → **Pro ($20/mo)** the *same day*
  you charge (Hobby is non-commercial by policy, not capacity), Supabase → **Pro
  ($25/mo)**. Resolve the **licensing landmines**: Pl@ntNet commercial (€1,000/yr) or
  drop it; purge CC-BY-NC assets; audit deps for **AGPL/GPL** copyleft. Verify **DSA
  trader** with public business contact. Break-even ≈ **30–40 subscribers**.

---

## Cost ladder

| Stage | Recurring | One-time |
|---|---|---|
| Friends beta (now) | **€0** | — |
| Google Play GA | €0 | **$25** |
| + iOS App Store | **$99/yr** (Apple) | — |
| + Monetized | **~€42/mo** (Vercel Pro $20 + Supabase Pro $25) + Pl@ntNet €1,000/yr *if kept* | — |

Analytics/errors/status all have **€0 tiers** (Umami/PostHog EU, Sentry free, Better
Stack). Optional lawyer review of the privacy policy + care disclaimer is the main
discretionary spend (EU + advice-liability exposure).

## Landmines to respect from now

- **Apple 4.2 + the RSC static-export blocker** — the iOS track is a real refactor;
  don't promise iOS on a timeline until it's scoped.
- **Vercel Hobby is non-commercial** — monetizing without Pro first is a ToS breach.
- **Pl@ntNet free tier is non-commercial** (K-3 in the knowledge plan) — fine while
  free, a €1,000/yr trap the day you charge.
- **DSA trader disclosure** publishes real contact details in the EU — use a
  business/virtual address before submitting a paid or trader listing.
- **Store privacy declarations must match data flows** (adding analytics or Pl@ntNet
  = a new disclosure) — mismatches now cause account bans, not warnings.
- **Plant-care liability** — the care-sheet disclaimer isn't cosmetic.

Full source list + per-stream detail is in the 2026-07-09 go-public research run;
this doc is the distilled plan of record. Sits after the
[knowledge & collection modules](./knowledge-and-collection-plan.md) as the final
milestone.
