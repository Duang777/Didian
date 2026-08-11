-- Mission capability usage runs.

-- name: CreateIssuePersonalSkillRunsForTask :many
INSERT INTO issue_personal_skill_run (
    workspace_id,
    issue_id,
    issue_personal_skill_id,
    personal_skill_id,
    task_id,
    status,
    queued_at
)
SELECT
    ips.workspace_id,
    ips.issue_id,
    ips.id,
    ips.personal_skill_id,
    sqlc.arg('task_id')::uuid,
    'queued',
    now()
FROM issue_personal_skill ips
WHERE ips.issue_id = sqlc.arg('issue_id')::uuid
  AND ips.workspace_id = sqlc.arg('workspace_id')::uuid
  AND ips.personal_skill_id = ANY(sqlc.arg('personal_skill_ids')::uuid[])
ON CONFLICT (issue_personal_skill_id, task_id) DO UPDATE SET
    status = 'queued',
    updated_at = now()
RETURNING *;

-- name: MarkIssuePersonalSkillRunsRunningForTask :many
UPDATE issue_personal_skill_run SET
    status = 'running',
    started_at = COALESCE(started_at, now()),
    updated_at = now()
WHERE task_id = $1
  AND status IN ('queued', 'running')
RETURNING *;

-- name: MarkIssuePersonalSkillRunsSucceededForTask :many
UPDATE issue_personal_skill_run SET
    status = 'succeeded',
    result_summary = sqlc.arg('result_summary')::text,
    error = '',
    completed_at = now(),
    updated_at = now()
WHERE task_id = sqlc.arg('task_id')::uuid
  AND status IN ('queued', 'running')
RETURNING *;

-- name: MarkIssuePersonalSkillRunsFailedForTask :many
UPDATE issue_personal_skill_run SET
    status = 'failed',
    error = sqlc.arg('error')::text,
    completed_at = now(),
    updated_at = now()
WHERE task_id = sqlc.arg('task_id')::uuid
  AND status IN ('queued', 'running')
RETURNING *;

-- name: MarkIssuePersonalSkillRunsCancelledForTask :many
UPDATE issue_personal_skill_run SET
    status = 'cancelled',
    error = sqlc.arg('error')::text,
    completed_at = now(),
    updated_at = now()
WHERE task_id = sqlc.arg('task_id')::uuid
  AND status IN ('queued', 'running')
RETURNING *;

-- name: ListIssuePersonalSkillRuns :many
SELECT
    ipsr.id,
    ipsr.workspace_id,
    ipsr.issue_id,
    ipsr.issue_personal_skill_id,
    ipsr.personal_skill_id,
    ipsr.task_id,
    ipsr.status,
    ipsr.result_summary,
    ipsr.error,
    ipsr.queued_at,
    ipsr.started_at,
    ipsr.completed_at,
    ipsr.created_at,
    ipsr.updated_at,
    ps.name,
    ps.capability,
    atq.agent_id,
    atq.status AS task_status
FROM issue_personal_skill_run ipsr
JOIN personal_skill ps
  ON ps.id = ipsr.personal_skill_id
 AND ps.workspace_id = ipsr.workspace_id
JOIN agent_task_queue atq
  ON atq.id = ipsr.task_id
WHERE ipsr.issue_id = $1
  AND ipsr.workspace_id = $2
ORDER BY ipsr.created_at DESC;
