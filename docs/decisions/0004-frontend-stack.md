# ADR-0004: Frontend stack — Next.js, Tailwind, shadcn/ui, TanStack Query, Zod

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Owner + Claude

## Context

Given the PWA decision ([ADR-0001](./0001-platform-pwa-first.md)) and Supabase
backend ([ADR-0002](./0002-backend-supabase.md)), we need concrete frontend
choices that deliver a **calm, premium, photo-first** UX (explicitly *not* a
generic CRUD admin panel), end-to-end TypeScript, good DX, and maintainability.

## Decision

| Concern | Choice | Why (vs alternatives) |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript (strict)** | Mature, RSC/SSR, first-class on Vercel, huge ecosystem, end-to-end types. (vs SvelteKit/Remix: smaller ecosystem / less Vercel-native for our needs.) |
| Styling | **Tailwind CSS** | Fast, consistent, no bespoke CSS sprawl; pairs with a design-token system for a calm look. |
| Components | **shadcn/ui** (Radix under the hood) | We **own the component code** (copy-in, not a dependency to fight), accessible primitives, fully restyleable to a premium aesthetic. (vs MUI/Chakra: harder to escape their look.) |
| Server state | **TanStack Query** | Best-in-class caching, background refetch, offline tolerance — important for a garden PWA. |
| Forms | **react-hook-form** | Performant, minimal re-renders, good DX for the many entry forms. |
| Validation | **Zod** | One schema reused for form validation **and** domain validation **and** inferred TS types. The shared-validation backbone. |
| Icons/motion | **lucide-react**, restrained CSS/Framer-Motion-lite | Clean iconography; motion only where it adds calm, never decoration. |
| PWA | **next-pwa / Serwist** (service worker + manifest) | Installability + offline shell with minimal config. |

## Consequences

- **Positive:** end-to-end TypeScript with Zod-inferred types; an owned,
  restyleable component layer for a distinctive premium feel; strong caching/
  offline behavior; minimal-friction forms for low-friction logging.
- **Negative / accepted:** shadcn/ui means we maintain copied component code (a
  deliberate trade for control); Tailwind classnames in markup (mitigated by
  component extraction and a tokenized design system — see
  [ux/principles](../ux/principles.md)).
- **Guardrails:** strict TS, ESLint + Prettier, no giant files (split features),
  domain logic stays out of components (lives in `domain/`).
