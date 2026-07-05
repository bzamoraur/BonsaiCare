# Competitive & Product Benchmark

> **Status:** Current · **Updated:** 2026-07-05
> Compiled 2026-06-26 from structured web research (six parallel research
> streams). **Read the method caveat before trusting any number.**

## Method & honest caveats

Research was conducted via web search across app-store aggregators, vendor
sites, expert reviews, and bonsai community forums. **Direct fetches to the
Apple App Store, Google Play, Reddit, and most bonsai sites were blocked (HTTP
403) by the environment's egress policy.** Consequently:

- All store metrics (ratings, counts, prices) are **second-hand via search
  summaries**, not read off the live listings. Treat exact figures as
  *approximate and dated*; re-verify anything load-bearing on the live page.
- Where sources conflicted, both numbers are shown. Fabricated-looking SEO
  statistics ("67% of users…") were excluded.
- Facts are cited; inferences are labelled. This is decision-support research,
  not a published market report.

## The reference product — Bonsai Care App (Bonsai Empire)

**Positioning:** "Add your trees and set reminders, with smart advice based on
the tree species and time of year… add photos to track your tree's
progression." Lifestyle category; iOS + Android; launched ~Dec 2023; actively
maintained. Built on Bonsai Empire's education brand. ([bonsaicare.app](https://www.bonsaicare.app/), [bonsaiempire.com/blog/bonsai-app](https://www.bonsaiempire.com/blog/bonsai-app))

**Feature set (verified):** tree inventory with species-specific care; smart
**climate/season + species-aware reminders** that deep-link into Bonsai Empire
articles/videos; **seasonal photo prompts (~every 3 months) grouped by year**;
care-history log; bulk actions ("mark all fertilized"); collections, pots &
collectibles catalogue, collection valuation (Pro); a **social feed** (likes,
comments, badges); free video/article library.

**Monetization:** Freemium. Free = **5 trees** + basic reminders + library. Pro
≈ **$30/yr** (community-reported, **unverified/dated**) = unlimited trees, custom
reminders, collections, pots, valuation.

**Reception:** Google Play **4.72★ / ~250 ratings / ~42k installs**; iOS
**~4.4★** (count unverified). The iOS↔Android gap is real but unexplained.

**Recurring complaints (the exploitable gaps):**
| Complaint | Our response |
|---|---|
| **Notifications unreliable** — "silent for weeks, then 5 at once" | Pull-based dashboard is the reliable core; push is best-effort enhancement. ([ADR-0007](../decisions/0007-notifications-strategy.md)) |
| **Hemisphere/season bug** — Southern users got wrong season, couldn't fix | `profile.hemisphere` explicit + user-overridable; season logic unit-tested. |
| **Forced re-login / weak offline feel** | Persistent sessions; offline-tolerant PWA; minimal account friction. |
| **Stingy 5-tree free tier** breeds "free version is useless" | N/A for personal use; informs future monetization (paywall depth, not core loop). |
| **No web/desktop client** | Our PWA *is* a large-screen web client — a genuine differentiator for cataloguing. |

> Disambiguation: do **not** confuse with "Bonsai Care App: Bonsai Buddy" (a
> different, AI-first 2025 app by Carlos Domingues). Some "bug" reports online
> belong to that app, not Bonsai Empire's.

## The dedicated-bonsai landscape

| App | Platform | Price | Rating | Maintained | Notes |
|---|---|---|---|---|---|
| **Bonsai Care App** (Bonsai Empire) | iOS/Android | Free / ~$30·yr | 4.72★ (~250) | ✅ active | Brand + content moat; the default recommendation. |
| **Mirai Mobile** (Bonsai Mirai) | iOS/Android | In Mirai Live ~$29.99·mo | 4.84★ (~150) | ✅ active | Best-in-class **region+species seasonal work calendar** + technique videos. Premium, education-gated. |
| **Appy Bonsai** | iOS/Android | Free + Premium | n/a (new, 2024) | ✅ active | "Collection ERP": trees/pots/tools/stands, 18–20k species DB, soil-mix generator, financial tracking. |
| **Bonsai Album** (A. Nicolle) | iOS/Mac | ~$7.99 once | 5.0★ (~129) | ◑ slow | Veteran; styling/fert logs, **CSV import/export** — wins data-longevity trust. |
| **Jooni – Bonsai Care Tracker** | iOS/Android | freemium | — | ✅ | Per-tree event logging, progression timeline, genus care guides, community. Closest direct analogue. |
| **Bonsai Buddy** | iOS | Free + Premium | new | ✅ likely | AI species ID, AI care plans, **wiring schedules**, journal. Unproven. |
| **BonsaiDo** | iOS/Android | Free + Premium | **1.9★** | ❌ dead (2021) | Designed *exactly* the right features (wiring/repot/prune logs + timeline) — **execution + abandonment killed it.** |
| **MyBonsai** (Crespi) | (was both) | — | — | ❌ unpublished 2024 | Another thoughtful manager that didn't survive. |

**The decisive community signal:** many serious growers **reject dedicated apps
entirely**, using Google Sheets / Notion / binders because they don't trust a
small app to exist in 10 years — and BonsaiDo, MyBonsai, and Vera (below) prove
them right. **Data portability/longevity is the #1 trust barrier in this niche.**
Winners earn trust via a *brand* (Bonsai Empire, Mirai) or *local + CSV export*
(Bonsai Album). → **We treat data export as a first-class trust feature.**

## Generic plant-care apps (for UX/monetization lessons only)

None has **any** bonsai-specific support — bonsai is treated as a generic
species with fixed-interval watering. They are UX/business references, not
direct competitors.

- **Planta** — best all-round care UX; ~$35.99/yr. Praised: clean design, task
  organization, empathetic copy (dead plants → a "graveyard"). Faulted:
  **rigid schedules you can't easily edit**, paywalled depth, schedule-based
  overwatering. ([getplanta.com](https://getplanta.com/), [popsci](https://www.popsci.com/diy/are-plant-care-apps-good/), [janeperrone.com](https://www.janeperrone.com/blog/2023/9/20/plant-apps))
- **Greg** — best community + "zero-guesswork" watering (FAO crop-water model);
  $29.99/yr or $49.99 lifetime; generous free tier. Faulted: **no fertilizer
  tracking**, **"nowhere to review your own logged history"**, ID ~50% wrong.
  ([greg.app](https://greg.app/), [biologyinsights.com](https://biologyinsights.com/greg-plant-app-reviews-should-you-trust-it-with-your-plants/))
- **PictureThis** — category download leader (100M+ claimed), ID accuracy
  benchmark (~76–78% independent); **the anti-example for billing** — trial→
  auto-renew, in-app "cancel" that doesn't cancel, surprise charges, BBB
  complaints. ([gardenmyths](https://www.gardenmyths.com/the-best-plant-id-app-we-tested-7-different-ones/), [identifythis.app](https://identifythis.app/picture-this-app-review))
- **Pl@ntNet** — free, nonprofit, science-first ID (~68% independent),
  multi-organ photos, citizen-science verification. Trust/accuracy model for ID;
  no care layer. ([cirad.fr](https://www.cirad.fr/en/our-activities-our-impact/our-impact/success-stories/pl-ntnet))
- **Vera** (Bloomscape) — *discontinued Feb 2024*. The cleanest free care-log
  UX template (per-plant profiles, photos, journal, no ads/paywall) — but tied
  its DB to a retailer's catalogue and crashed on photo upload. A cautionary
  tale about apps as a retailer side-bet. ([insightweeds.com](https://insightweeds.com/vera-plant-care-app-disappears-appstore/))

**Category-wide UX failures to avoid:** notification fatigue (midnight alerts →
users disable then delete), fixed-interval schedules that ignore species/pot/
season, dark-pattern paywalls. **Regulatory note:** an FTC/ICPEN/GPEN 2024 sweep
found ~76% of subscription apps used ≥1 dark pattern. ([FTC](https://www.ftc.gov/news-events/news/press-releases/2024/07/ftc-icpen-gpen-announce-results-review-use-dark-patterns-affecting-subscription-services-privacy))

## What this means for us — table stakes vs differentiators

**Table stakes (must have, everyone has them):** tree inventory + profiles,
progress photos, care logging, reminders/tasks, fertilization tracking, notes.

**Differentiators we will pursue (gaps competitors leave open):**
1. **Bonsai-native data model** — species *category* drives scheduling;
   first-class wiring (apply→remove window), repotting (root work + soil mix),
   decandling/defoliation, styling stages. (BonsaiDo proved the demand; nobody
   executes it reliably.)
2. **A reliable, pull-based "what needs attention" dashboard** — neutralizes the
   universal notification-reliability complaint and the PWA's push weakness.
3. **Fully editable, signal-driven scheduling + always-reviewable history** —
   the direct antidote to Planta's rigidity and Greg's "can't review my log."
4. **Data ownership & export (CSV/JSON)** — the bonsai community's #1 trust
   barrier, met head-on.
5. **Web/large-screen PWA** — no major bonsai app has one.
6. **Calm, photo-first, premium UX with restrained notifications** — against a
   category of nagging, cluttered, paywall-pushing apps.

**Explicitly NOT competing on (for MVP):** a content/education library (Bonsai
Empire & Mirai's moat — we won't out-content them), AI species ID (accuracy is
mediocre category-wide; high effort), or a social feed.

## Sources

Full source URLs are preserved in the raw research transcripts. Key anchors:
[bonsaicare.app](https://www.bonsaicare.app/) ·
[bonsaiempire.com/blog/bonsai-app](https://www.bonsaiempire.com/blog/bonsai-app) ·
[bonsaimirai.com/blog/mirai-mobile](https://bonsaimirai.com/blog/mirai-mobile) ·
[appybonsai.com](https://appybonsai.com/en/) ·
[andrewnicolle.com/all_apps/bonsaialbum](https://andrewnicolle.com/all_apps/bonsaialbum) ·
[home.jooni.app](https://home.jooni.app/) ·
[getplanta.com](https://getplanta.com/) · [greg.app](https://greg.app/) ·
BonsaiNut record-keeping threads ([1](https://www.bonsainut.com/threads/how-do-you-document-organize-your-trees-through-the-years.37554/), [2](https://www.bonsainut.com/threads/best-way-to-track-bonsai-work.67517/)).
