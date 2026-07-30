# PRD: Skill Operating Loop

Date: 2026-07-30
Status: Draft for implementation

## Objective

Turn Didian Skills from generated cards into an operating layer that local agent runtimes can reliably use, audit, and improve. The user-facing loop should feel like:

```text
Save webpage -> Didian detects whether it is Skill-worthy
-> user chooses "做成 Skill" and optionally describes intent
-> local Codex reads the source and proposes concrete Skill directions in-place
-> user confirms/edit directions
-> local Codex generates the Skill
-> Skill is stored in Didian
-> Mission can select the Skill
-> local runtime receives the selected Skill
-> Mission shows what was injected, used, skipped, or failed
-> Skill can be edited, regenerated, deleted, or reused
```

The product promise is not "AI summarized a page". The promise is "this source became a reusable capability that local agents can use again with traceable results".

## Users And Jobs

- Personal builder: saves GitHub repos, docs, papers, blogs, product pages, and tutorials, then wants Codex Local to turn them into reusable workflows.
- Operator: wants to know which Skills were used by a Mission, whether local runtime actually received them, and why a Skill was skipped or failed.
- Curator: wants to prune bad Skills, regenerate stale Skills, and see which saved pages became useful capabilities.

## Product Principles

- One user-facing flow: `做成 Skill`. Automatic recommendations and manual choices both enter the same confirmation dialog.
- AI direction analysis is not a normal Mission. It may reuse task infrastructure internally, but must not appear in ordinary Mission lists, boards, or search unless explicitly filtered as internal diagnostics.
- Platform heuristics are only screening. Do not show precise rule scores as if they are AI confidence. Show qualitative signals and evidence instead.
- Local Codex decides the concrete Skill direction after reading the source, then the user confirms or edits it.
- Skills are Mission-selectable runtime context, not permanent agent defaults unless the user explicitly binds them to an agent.
- Mission detail is the audit surface: selected Skills, injection status, runtime, task, and later actual usage feedback all belong there.
- Deletion must exist everywhere a Skill is surfaced: Skill library, capture card, and Mission planned Skill relation.
- All public API changes must be additive, typed, and validated at boundaries.

## MVP Scope

### In Scope

- A durable PRD and implementation task list for the Skill operating loop.
- Defensive hiding of internal Skill direction-analysis Missions from normal frontend caches and realtime updates.
- Skill direction dialog remains the only visible analysis surface for captures.
- Mission detail continues to support manual Skill selection and planned-skill removal.
- Generated capture card Skills can create a Mission and bind the Skill.
- Skill library and capture cards support deleting generated Skills.
- Runtime claim injects Mission-level planned Skills and records injected usage.
- Health/diagnostic copy should distinguish backend offline, Codex Local offline, and no generated Skill.

### Out Of Scope For This Phase

- Marketplace distribution.
- Team sharing policy.
- Semantic embedding recommendation.
- Automatic silent Skill injection.
- Cross-workspace Skill copy.
- Version diff UI beyond basic `updated_at` and source metadata.

## Core Flows

### Flow 1: Save Webpage To Candidate Skill

1. Browser capture stores title, URL, preview text, favicon, screenshot, and page type.
2. Platform rule screening decides whether to show a Skill candidate affordance.
3. Candidate panel displays qualitative reasons:
   - reusable workflow
   - instruction density
   - future reuse
   - evidence snippets
4. User can still choose `做成 Skill` from any saved page even without automatic recommendation.

Acceptance:

- No exact percentage scores in user-facing candidate panel.
- Manual `做成 Skill` exists for non-recommended captures.
- No noisy SPA payload, tree JSON, or error-page dump is sent as primary source context.

### Flow 2: Confirm Direction Before Generation

1. User clicks `做成 Skill`.
2. Dialog shows source page, qualitative signal, optional "你的需求".
3. User can click `让 Codex 推荐方向`.
4. Backend creates an internal direction-analysis task with metadata:
   - `didian_internal = true`
   - `didian_internal_kind = "skill_direction_analysis"`
5. Dialog polls comments on that internal task and renders the latest Codex recommendation.
6. User edits structured direction fields and confirms generation.

Acceptance:

- Internal direction task does not show in normal Mission list, board, cache, or realtime-created rows.
- Dialog does not force users to open Mission detail to read the analysis.
- Direction fields include name, primary use case, capability, trigger examples, expected inputs, expected outputs, boundaries, and success criteria.

### Flow 3: Generate And Store Skill

1. User confirms a direction draft.
2. Backend creates a generation Mission for local Codex, with the confirmed direction and cleaned source context.
3. Local Codex creates or updates a platform Skill.
4. Skill stores provenance in config:
   - source URL
   - capture ID
   - generation Mission ID
   - confirmed direction
   - generated by runtime / agent where available
5. Capture card changes to `已生成` and links to Skill detail.

Acceptance:

- Duplicate generated Skill is not created for the same capture.
- Capture card exposes `打开 Skill`, `删除 Skill`, and `用 Skill 创建 Mission`.
- Deleting generated Skill clears the capture card's generated state after refetch.

### Flow 4: Use Skill In Mission

1. User creates a Mission from a generated Skill or manually adds a Skill in Mission detail.
2. Mission stores usage row as `planned`.
3. Runtime claim merges:
   - agent default Skills
   - platform built-in Skills
   - Mission planned Skills
4. Claim marks planned rows as `injected` with task, agent, and runtime IDs.
5. Mission detail displays selected/injected Skills and status.

Acceptance:

- Mission-level Skill selection never mutates agent default Skills.
- Duplicate Skill IDs are deduped before claim payload is sent.
- Non-planned usage rows cannot be deleted as if they were ordinary form state.

### Flow 5: Operate Skill Library

1. Skill library lists generated and manually-created Skills.
2. Skill detail shows source/provenance, last use, usage count, and linked Missions.
3. Users can delete a Skill from Skill library or capture card.
4. Future phase: users can regenerate stale Skills from source.

Acceptance:

- Skill library is reachable from System and AI Inbox.
- Delete action is explicit and confirmed.
- Deleted Skill no longer appears in capture-generated mapping.

## API And Interface Contract

### Existing APIs To Preserve

- `GET /api/issues/{issueId}/skills`
- `POST /api/issues/{issueId}/skills`
- `DELETE /api/issues/{issueId}/skills/{skillId}`
- `POST /api/browser-captures/{id}/skill-direction-mission`
- `POST /api/browser-captures/{id}/skill-generation-mission`
- `DELETE /api/skills/{id}`

### Additive API Requirements

- `GET /api/issues` default behavior excludes `metadata.didian_internal = true`.
- Explicit diagnostics may request internal records via metadata filter.
- Frontend cache helpers must also treat `metadata.didian_internal = true` as non-listable to protect against realtime leaks.
- API clients should not need a new flag to hide internal rows; hiding is the default contract.

## Data Model Notes

- Keep using `issue_skill_usage` for Mission-level Skill records.
- Keep using `skill.config.origin.capture_id` and `skill.config.generation.direction` for generated provenance.
- Internal analysis tasks can remain `issue` rows for execution reuse, but the user-facing product must not call them Missions.
- Later usage feedback can extend `issue_skill_usage.metadata` before introducing a new table.

## UX Requirements

- Warm beige/brown product theme remains global.
- Skill candidate panel should be compact and calm, not a large marketing card.
- Dialog copy must explain:
  - platform did initial screening
  - local Codex will read the source and recommend direction
  - user can edit before generation
- Errors must be specific:
  - backend offline
  - no Codex Local agent
  - source could not be fetched
  - Skill already generated
  - Skill deletion blocked by usage history

## Code Standards

- Keep user-facing Skill flow code in `packages/views/ai-workbench` and Mission Skill usage UI in `packages/views/issues`.
- Keep shared API types in `packages/core/types` and API calls in `packages/core/api/client.ts`.
- Keep cache membership rules in `packages/core/issues/cache-helpers.ts`; do not duplicate filtering logic across components.
- Validate server inputs at handlers.
- Prefer additive fields over changing existing response shapes.
- Every behavior change gets tests before commit.
- Each functional slice gets its own commit.

## Testing Strategy

- Backend handler tests for API contracts and internal Mission hiding.
- Core cache unit tests for internal issue filtering and realtime update behavior.
- View tests for AI Inbox Skill dialog, capture card actions, and Mission Skill sidebar.
- Typechecks:
  - `pnpm --filter @didian/core typecheck`
  - `pnpm --filter @didian/views typecheck`
  - `pnpm --filter @didian/web typecheck` when route/app integration changes

## Implementation Plan

### Phase 1: Make The Current Loop Less Weird

- Hide internal Skill direction-analysis tasks defensively in frontend caches.
- Add copy/diagnostics so users know analysis happens in the dialog, not Mission list.
- Ensure generated Skill delete works from capture card and Skill library.

### Phase 2: Make Skills Feel Used

- Mission detail shows clearer Skill usage status and execution linkage.
- Claim prompt includes explicit Mission-selected Skill reasons.
- Add tests for prompt text and `planned -> injected`.

### Phase 3: Make Skills Operable

- Skill detail shows source capture, generated direction, linked Missions, usage count.
- Regenerate Skill from source with confirmed direction.
- Add stale-source and version hints.

### Phase 4: Make Recommendations Smarter

- Replace rule scores with source-type-specific extractors.
- GitHub repo, docs, paper, blog/tutorial, and product page each get separate signal extraction.
- Add local Codex analysis summary back into candidate dialog.

## Success Criteria

- A user can save a webpage, create a Skill, use it in a Mission, and see the usage record without visiting hidden internal analysis Missions.
- Internal direction-analysis tasks never appear in normal Mission lists from API responses or realtime cache updates.
- Generated Skills can be deleted and retried.
- Mission Skill records are auditable and cannot be confused with permanent agent Skill bindings.
- All changed packages pass targeted tests and typecheck.

## Open Questions

- Should generated Skills automatically attach to the first Mission created from the same capture, or always require user confirmation?
- Should deletion archive generated Skills that have usage history instead of hard delete?
- Should Skill direction analysis comments be persisted as Skill provenance after generation?
- Should the Skill library become a top-level Workbench item or remain under System plus AI Inbox shortcut?
