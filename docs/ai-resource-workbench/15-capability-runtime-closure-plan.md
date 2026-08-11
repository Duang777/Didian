# Capability Runtime Closure Plan

## Goal

Close the loop from captured knowledge to Mission execution:

1. Mission detail has a structured record of which personal capabilities were selected.
2. Bookmark ingestion can produce backend capability judgement and direction questions.
3. Local agent runtime receives selected capabilities through a structured protocol, not only through prose in the Mission description.

## Product Rules

- Personal capabilities remain stored in `personal_skill`.
- Mission usage is stored as a relation, not copied into the issue body.
- Users can still read the Mission description without capability boilerplate.
- Local agent runtimes receive compact capability context: id, name, trigger, expected input/output, instructions, source URL, and usage note.
- If no capability is selected, Mission behavior is unchanged.

## Implementation Slices

### Slice 1: Mission Capability Record

- Add `issue_personal_skill` table.
- Add sqlc queries for create/list/delete links.
- Extend `GET /api/issues/{id}` with `personal_skills`.
- Extend `POST /api/ai-inbox/missions` with `selected_personal_skill_ids`.
- Render a Capabilities section in Mission detail sidebar.

### Slice 2: Backend Bookmark Judgement

- Replace rule-only bookmark skill opportunity with an LLM-first backend evaluator when LLM is configured.
- Keep deterministic fallback for local/dev.
- Store the judgement in `captured_source.skill_opportunity`.
- Return explicit direction prompts for the user to refine before generating.

### Slice 3: Runtime Protocol

- Add selected capability payload to agent task `context`.
- Teach Mission creation and rerun/handoff paths to preserve the capability context.
- Keep issue description human-readable and use context JSON as the runtime contract.

## Acceptance

- Creating a Mission from AI Inbox with selected capabilities persists relations and shows them on Mission detail.
- Existing Missions without capabilities still render normally.
- Browser capture still works without LLM configured.
- The agent task row contains structured `personal_capabilities` when created from AI Inbox with selections.
