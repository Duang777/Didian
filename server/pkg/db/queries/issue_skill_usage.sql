-- Mission Skill usage. The database model still calls Missions "issues";
-- these rows track per-Mission selected skills without changing agent defaults.

-- name: ListIssueSkillUsages :many
SELECT
    isu.id,
    isu.workspace_id,
    isu.issue_id,
    isu.skill_id,
    s.name AS skill_name,
    s.description AS skill_description,
    s.config AS skill_config,
    isu.task_id,
    isu.agent_id,
    a.name AS agent_name,
    isu.runtime_id,
    ar.name AS runtime_name,
    isu.source,
    isu.status,
    isu.reason,
    isu.skill_version,
    isu.metadata,
    isu.created_by,
    isu.created_at,
    isu.updated_at
FROM issue_skill_usage isu
JOIN skill s ON s.id = isu.skill_id
LEFT JOIN agent a ON a.id = isu.agent_id
LEFT JOIN agent_runtime ar ON ar.id = isu.runtime_id
WHERE isu.workspace_id = $1 AND isu.issue_id = $2
ORDER BY isu.created_at ASC, s.name ASC;

-- name: ListIssueSkillsForClaim :many
SELECT s.*
FROM issue_skill_usage isu
JOIN skill s ON s.id = isu.skill_id
WHERE isu.workspace_id = $1
  AND isu.issue_id = $2
  AND isu.status IN ('planned', 'injected', 'used')
ORDER BY isu.created_at ASC, s.name ASC;

-- name: UpsertIssueSkillUsagePlanned :one
INSERT INTO issue_skill_usage (
    workspace_id, issue_id, skill_id, source, status, reason, created_by
)
SELECT i.workspace_id, i.id, s.id, sqlc.arg('source'), 'planned', sqlc.arg('reason'), sqlc.arg('created_by')
FROM issue i
JOIN skill s ON s.id = sqlc.arg('skill_id') AND s.workspace_id = i.workspace_id
WHERE i.id = sqlc.arg('issue_id') AND i.workspace_id = sqlc.arg('workspace_id')
ON CONFLICT (issue_id, skill_id) DO UPDATE SET
    source = EXCLUDED.source,
    status = CASE
        WHEN issue_skill_usage.status = 'planned' THEN 'planned'
        ELSE issue_skill_usage.status
    END,
    reason = EXCLUDED.reason,
    updated_at = now()
RETURNING *;

-- name: DeletePlannedIssueSkillUsage :execrows
DELETE FROM issue_skill_usage
WHERE workspace_id = $1
  AND issue_id = $2
  AND skill_id = $3
  AND status = 'planned';

-- name: GetIssueSkillUsageBySkill :one
SELECT *
FROM issue_skill_usage
WHERE workspace_id = $1
  AND issue_id = $2
  AND skill_id = $3;

-- name: MarkPlannedIssueSkillsInjected :many
UPDATE issue_skill_usage
SET
    status = 'injected',
    task_id = $3,
    agent_id = $4,
    runtime_id = $5,
    updated_at = now()
WHERE workspace_id = $1
  AND issue_id = $2
  AND status = 'planned'
RETURNING *;
