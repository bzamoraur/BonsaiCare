# Cost Model

> Status: v1, 2026-06-26. Free-first by policy. This documents what's free, the
> limits, and the **exact triggers** that would push us to pay — so cost is a
> deliberate decision, never a surprise bill.

## TL;DR
**The MVP runs at €0/month** for personal + a few trusted users. Every component
is on a free tier. The first realistic paid cost (~€20/mo) only appears if the
app goes **commercial** (Vercel) or photo storage outgrows 1 GB (Supabase).

## Per-service breakdown (free-tier limits as understood 2026-06; re-verify)

| Service | Free tier (approx) | Our usage (personal) | First paid trigger | Paid cost |
|---|---|---|---|---|
| **Vercel** (Hobby) | Generous bandwidth/builds; **non-commercial only** | Tiny | **Going commercial** (R5) → must move plan | **Pro ~$20/mo** (or migrate to Cloudflare Pages free) |
| **Supabase** | ~500 MB DB, **1 GB storage**, 50k MAU; **pauses after ~7 days idle** | A few users, mostly photos | **Storage > 1 GB** (R4) or needing no-pause/backups | **Pro ~$25/mo** |
| **GitHub** | Free private repos + Actions minutes (ample for solo) | CI + keep-warm | Heavy CI minutes (unlikely) | Usage-based |
| **Domain** (optional) | — | Optional custom domain | If you want a custom domain | ~€10–15/yr |
| **Email (auth)** | Supabase built-in sender (rate-limited) | Low volume | Reliable delivery / volume | Custom SMTP, often free tiers (e.g. Resend) |

> Numbers are from research and may be stale — **verify against current pricing
> pages during setup** before relying on them.

## The two costs worth planning for

1. **Photo storage (most likely first cost).** Photos dominate data growth.
   Mitigations keep us free far longer:
   - **Client-side compression/resize** before upload (target a sensible max
     dimension, e.g. ~1600px long edge, ~80% quality). A typical compressed photo
     is a few hundred KB → ~1 GB holds **thousands** of photos.
   - Track usage in the Supabase dashboard; the upgrade to Pro (~$25/mo, 8 GB+) is
     the lever if/when needed.
2. **Commerciality (Vercel license).** Hobby is non-commercial. The moment there's
   any commercial intent, move to **Vercel Pro** or **Cloudflare Pages** (free,
   commercial-OK) *before* launch. Not a surprise — a planned migration (R5).

## Avoided costs (by design)
- **No Apple Developer Program ($99/yr)** — PWA, not native ([ADR-0001](../decisions/0001-platform-pwa-first.md)).
- **No paid backend** — Supabase free vs. a managed Postgres + auth + storage
  stack that would cost money assembled separately.
- **No analytics/observability SaaS** in MVP — added only if reliability needs it.

## Lock-in posture
- **Supabase:** open-source/Postgres underneath → SQL + migrations are portable
  (Neon fallback). Low lock-in.
- **Vercel:** standard Next.js → portable to Cloudflare/Netlify; we avoid
  Vercel-proprietary features without a fallback.
- **Storage:** signed-URL + path convention is portable to any S3-compatible
  store.

## Review cadence
Re-check actual usage (storage especially) at each phase boundary and update this
file. If a paid step is taken, record **why**, the **monthly cost**, and the
**lock-in** in an ADR per the cost policy.
