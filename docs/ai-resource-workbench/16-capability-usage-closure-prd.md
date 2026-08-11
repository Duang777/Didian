# Capability Usage Closure PRD

## Goal

Make personal capabilities feel like real runtime tools, not static notes.
When a Mission selects capabilities, Didian should show whether those
capabilities are queued, running, succeeded, failed, or cancelled for each
local agent task.

## User Story

As a user, I can open a Mission and understand:

- which capabilities were selected for the Mission;
- whether the local agent has started using them;
- whether the latest run succeeded or failed;
- which task/run produced the result.

## Product Rules

- `issue_personal_skill` remains the durable Mission selection relation.
- Runtime usage gets its own history table. Selection and execution are not the
  same state.
- A single task can use multiple selected capabilities.
- Existing Missions without capabilities must behave unchanged.
- The Mission detail page should show usage state without requiring users to
  inspect agent context files or raw task logs.

## Data Contract

New table: `issue_personal_skill_run`.

Each row records one capability selected on one Mission for one agent task:

- `issue_personal_skill_id`: the selected capability link;
- `task_id`: the agent task that carried the capability context;
- `status`: `queued`, `running`, `succeeded`, `failed`, or `cancelled`;
- `result_summary`: short terminal outcome summary;
- `error`: terminal failure/cancellation reason;
- timestamps for queued/start/terminal lifecycle.

`GET /api/issues/{id}` extends `personal_skills[]` with `runs[]` and
`latest_run`. Existing fields stay additive and backwards compatible.

## Lifecycle

1. Mission task is queued with `context.personal_capabilities`.
2. Backend creates one `issue_personal_skill_run` row per selected capability.
3. `StartTask` marks matching rows `running`.
4. `CompleteTask` marks matching rows `succeeded` and stores a compact result
   summary.
5. `FailTask` marks matching rows `failed`.
6. `CancelTask` marks matching rows `cancelled`.
7. Mission detail renders latest state and the last few runs per capability.

## Acceptance

- Creating a Mission with selected capabilities creates queued usage records.
- Starting/completing/failing/cancelling the task updates those records.
- Mission detail API returns capability usage history.
- Mission detail UI shows latest state and recent runs under Capabilities.
- Existing task execution log remains unchanged.
