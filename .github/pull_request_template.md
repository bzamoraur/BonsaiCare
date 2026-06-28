<!-- Keep PRs small and single-purpose. Link the milestone task/issue. -->

## What & why
<!-- One or two sentences. Link the issue / roadmap item. -->

## Changes
-

## Checklist (Definition of Done — docs/development/workflow.md)
- [ ] Meets acceptance criteria; scope matches `docs/product/mvp-scope.md`
- [ ] Tests added/updated for non-trivial logic (domain logic + RLS where relevant)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass locally / CI green
- [ ] Docs updated if behavior/setup changed; **ADR** added for significant decisions
- [ ] No secrets added; env vars documented
- [ ] Privacy preserved (RLS on owned tables; no secret key in client)
- [ ] Tech debt (if any) logged in `docs/roadmap/backlog.md`
