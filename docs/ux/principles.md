# UX Principles & Visual Direction

> **Status:** Current · **Updated:** 2026-07-05
>
> The felt-quality bar. The app must feel **calm, premium, simple, and natural
> for bonsai care** — never a generic CRUD admin panel. This doc sets the
> principles; the base theme and tokens shipped with M1 (shadcn/ui + Tailwind
> tokens) and evolve incrementally.

## Experience principles

1. **Calm over busy.** Generous whitespace, few elements per screen, one clear
   primary action. The opposite of the cluttered, nagging category norm.
2. **Photo-first.** The tree's image is the hero — in the collection grid, the
   profile, and the timeline. A bonsai is visual; the UI should feel like a
   beautiful album that happens to track care.
3. **Quick capture.** The two most frequent actions — *log a care event* and
   *add a photo* — must be reachable in one tap from anywhere and completable in
   seconds, one-handed, outdoors. A persistent quick-add affordance.
4. **Tell me what matters, immediately.** The dashboard opens on "what needs
   attention" (overdue / today / upcoming). No hunting.
5. **Low cognitive load.** Smart defaults (today's date, last-used fertilizer),
   progressive disclosure (advanced fields hidden until needed), never a wall of
   inputs.
6. **Legible hierarchy.** Clear typographic scale; the important thing on each
   screen is obvious within a second.
7. **Restraint with notifications & motion.** Motion only to aid understanding
   (state transitions), never decoration. Reminders are grouped and gentle.
8. **Trust signals.** Visible "your data is yours" (export), honest empty states,
   no dark patterns, no manufactured urgency.

## Visual direction (starting point, to refine)

- **Mood:** natural, earthy, serene — wabi-sabi restraint. Think gallery, not
  dashboard.
- **Palette:** muted greens and warm neutrals (bark, clay, moss, stone) as the
  base; a single restrained accent for primary actions; strong support for
  **light and dark** modes (the garden is bright; the desk at night is dark).
- **Type:** a humanist, highly legible sans for UI; consider a refined serif for
  tree names/headings to add warmth and craft. System fonts acceptable for v1 to
  keep it fast.
- **Imagery:** let user photos carry the color; chrome stays neutral so photos
  pop. Rounded, soft cards; subtle shadows; never harsh borders.
- **Iconography:** lucide-react, thin and consistent.
- **Density:** comfortable, thumb-friendly touch targets (mobile-first); the
  desktop/web view uses the extra space for multi-column catalogue and larger
  photo progression, not more clutter.

## Accessibility (non-negotiable baseline)

- WCAG AA contrast; real focus states; full keyboard operability.
- Honor `prefers-reduced-motion` and `prefers-color-scheme`.
- Don't rely on color alone for status (overdue/health) — pair with icon/label.
- Respect large text settings; never truncate critical info.

## Anti-patterns (explicitly avoid — drawn from research)

- Midnight/again-and-again notifications; nagging tone.
- Fixed, un-editable schedules; inability to backdate.
- Paywall walls in onboarding; manipulative cancel flows (we have no paywall in
  MVP — and won't adopt dark patterns ever).
- Burying the user's own history; making logged data un-reviewable (Greg's flaw).
- A "generic plant app" feel that ignores how bonsai people think.
