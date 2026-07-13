# AI Resource Workbench Agent Guide

This directory is the source of truth for the current Didian AI resource workbench plan. Read this file before editing any document here.

## Product Story

First version narrative:

```text
AI Inbox -> Missions / Codex Run -> Atlas -> System
```

Didian is not a better bookmark manager. It turns browser material into a local Codex Runtime workflow: capture messy inputs, let Codex understand and execute, keep evidence and artifacts, then save the result as recallable Atlas memory.

## Current Documents

- `README.md`: review order and document boundary.
- `01-product-requirements.md`: Runtime-first PRD.
- `02-technical-plan.md`: implementation strategy, route plan, model reuse, verification gates.
- `03-implementation-review.md`: recommended build order and risk controls.
- `04-browser-memory-bookmarks.md`: browser memory, search recall, and Karakeep-inspired capture/enrichment plan.

## Borrowed Ideas

- Karakeep: https://github.com/karakeep-app/karakeep
- Borrow the product capabilities and shape: bookmark-everything, browser capture, background enrichment, AI summary/tags, full-text search, archive/snapshot, notes/highlights, duplicate detection, rules/importers.
- Do not copy, rewrite, vendor, embed, or distribute Karakeep source code. Karakeep is AGPL-3.0; code reuse requires accepting AGPL obligations or getting separate authorization.

## Hard Decisions

- MVP navigation is AI Inbox, Missions, Atlas, System.
- AI Studio is System / Advanced or later, not MVP main navigation.
- Autopilot is later, based on real repeated capture/run/memory behavior; do not create a mock strategy page for MVP.
- Codex Runtime capability should be visible in Mission details: Inputs, Plan, Activity, Evidence, Review, Outputs.

## Maintenance Rules

- Keep `01`, `02`, `03`, `04`, `README`, `tasks/plan.md`, and `tasks/todo.md` consistent when product scope changes.
- Link to borrowed projects directly instead of pasting large external content.
- After each functional documentation improvement, make an atomic docs commit so the plan is easy to roll back.
