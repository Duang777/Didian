-- Mission ↔ personal capability links.

-- name: CreateIssuePersonalSkill :one
INSERT INTO issue_personal_skill (
    workspace_id,
    issue_id,
    personal_skill_id,
    selected_by,
    source,
    usage_note
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (issue_id, personal_skill_id) DO UPDATE SET
    selected_by = COALESCE(EXCLUDED.selected_by, issue_personal_skill.selected_by),
    source = EXCLUDED.source,
    usage_note = EXCLUDED.usage_note
RETURNING *;

-- name: ListIssuePersonalSkills :many
SELECT
    ips.id AS link_id,
    ips.issue_id,
    ips.workspace_id,
    ips.personal_skill_id,
    ips.selected_by,
    ips.source,
    ips.usage_note,
    ips.created_at AS linked_at,
    ps.proposal_id,
    ps.name,
    ps.description,
    ps.capability,
    ps.page_type,
    ps.trigger,
    ps.expected_input,
    ps.expected_output,
    ps.instructions,
    ps.source_url,
    ps.source_domain,
    ps.evidence_snippets,
    ps.risk_notes,
    ps.enabled,
    ps.use_count,
    ps.created_at,
    ps.updated_at
FROM issue_personal_skill ips
JOIN personal_skill ps
  ON ps.id = ips.personal_skill_id
 AND ps.workspace_id = ips.workspace_id
WHERE ips.issue_id = $1
  AND ips.workspace_id = $2
ORDER BY ips.created_at ASC;

-- name: DeleteIssuePersonalSkill :exec
DELETE FROM issue_personal_skill
WHERE issue_id = $1
  AND workspace_id = $2
  AND personal_skill_id = $3;
