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
- Include selected capabilities in daemon claim responses.
- Write selected capabilities to `.agent_context/personal_capabilities.json`.
- Mention selected capabilities in `issue_context.md` and the provider runtime brief.
- Teach Mission creation and rerun/handoff paths to preserve the capability context.
- Keep issue description human-readable and use context JSON as the runtime contract.

## Runtime Context Contract

Issue-linked local agent tasks may carry selected personal capabilities in
`agent_task_queue.context.personal_capabilities`.

```json
{
  "personal_capabilities": [
    {
      "id": "personal-skill-id",
      "name": "Capability name",
      "description": "Short human-readable summary",
      "capability": "What this capability helps the agent do",
      "page_type": "github_repo",
      "trigger": "When to use it",
      "expected_input": "Inputs the user or Mission should provide",
      "expected_output": "Outputs the runtime should produce",
      "instructions": "Reusable execution guidance",
      "source_url": "https://example.com/source",
      "source_domain": "example.com",
      "usage_note": "Why this Mission selected it"
    }
  ]
}
```

The Mission description must not be used as the primary transport for selected
capabilities. It can mention user intent, but runtime tooling should read the
structured context first.

When a local daemon claims the task, the same capability array is delivered in
the claim response as `personal_capabilities`, then written into the task
workdir:

- `.agent_context/personal_capabilities.json` contains the structured contract.
- `.agent_context/issue_context.md` lists the selected capability names and
  points the agent to the JSON file.
- The provider runtime brief also points to the JSON file so the capability
  context is discoverable even before the agent opens sidecar files.

## Acceptance

- Creating a Mission from AI Inbox with selected capabilities persists relations and shows them on Mission detail.
- Existing Missions without capabilities still render normally.
- Browser capture still works without LLM configured.
- The agent task row contains structured `personal_capabilities` when created from AI Inbox with selections.
- Local daemon task setup writes selected capabilities into `.agent_context/personal_capabilities.json` and references them from the runtime brief.
