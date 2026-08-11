# Skill Center Discoverability Plan

## Objective

Make the newly added Skill Center discoverable from the existing workspace chrome without changing the underlying personal-skill behavior.

The user-facing loop remains:

1. Save or capture a web page.
2. Generate a Skill draft when it is useful.
3. Review and enable the draft.
4. Reuse or delete the enabled personal Skill in Skill Center.

## Scope

- Add a Skill Center entry to the existing sidebar.
- Keep the entry under the System group so the primary AI Workbench flow stays stable.
- Localize the nav label in every layout locale file.
- Cover the sidebar route in tests.

## Out of Scope

- No backend schema or API changes.
- No changes to the legacy workspace Skills asset page.
- No visual redesign of the sidebar or Skill Center page.

## Implementation Tasks

- [x] Add Skill Center navigation entry under the System group.
- [x] Localize the new nav label in all layout locale files.
- [x] Add sidebar tests for rendering and active-route highlighting.
- [x] Update view-level docs to describe Skill Center as a System-side personal capability surface.

## Verification

- `pnpm -C packages/views test -- layout/app-sidebar.test.tsx locales/parity.test.ts`
- `pnpm -C apps/web typecheck`

## Code Standards

- Use the existing `paths.workspace(slug).skillProposals()` route builder instead of hardcoded paths in shared views.
- Keep nav copy in locale JSON.
- Keep this slice additive and reversible.
