-- Personal Skill CRUD (V2 启用的个人能力，独立于公共 skill 表)

-- name: CreatePersonalSkill :one
INSERT INTO personal_skill (
    workspace_id,
    proposal_id,
    name,
    description,
    capability,
    page_type,
    trigger,
    expected_input,
    expected_output,
    instructions,
    source_url,
    source_domain,
    evidence_snippets,
    risk_notes,
    enabled,
    created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16
)
RETURNING *;

-- name: GetPersonalSkill :one
SELECT * FROM personal_skill
WHERE id = $1 AND workspace_id = $2;

-- name: GetPersonalSkillByProposalID :one
SELECT * FROM personal_skill
WHERE proposal_id = $1 AND workspace_id = $2;

-- name: ListPersonalSkillsByWorkspace :many
SELECT * FROM personal_skill
WHERE workspace_id = $1
  AND (sqlc.narg('enabled')::bool IS NULL OR personal_skill.enabled = sqlc.narg('enabled')::bool)
ORDER BY name ASC;

-- name: UpdatePersonalSkill :one
UPDATE personal_skill SET
    name = COALESCE(sqlc.narg('name'), name),
    description = COALESCE(sqlc.narg('description'), description),
    capability = COALESCE(sqlc.narg('capability'), capability),
    page_type = COALESCE(sqlc.narg('page_type'), page_type),
    trigger = COALESCE(sqlc.narg('trigger'), trigger),
    expected_input = COALESCE(sqlc.narg('expected_input'), expected_input),
    expected_output = COALESCE(sqlc.narg('expected_output'), expected_output),
    instructions = COALESCE(sqlc.narg('instructions'), instructions),
    enabled = COALESCE(sqlc.narg('enabled'), enabled),
    updated_at = now()
WHERE id = $1 AND workspace_id = $2
RETURNING *;

-- name: IncrementPersonalSkillUse :one
UPDATE personal_skill SET
    use_count = use_count + 1,
    updated_at = now()
WHERE id = $1 AND workspace_id = $2
RETURNING *;

-- name: DeletePersonalSkill :exec
-- Defense-in-depth: workspace_id is a SQL-layer tenant guard.
DELETE FROM personal_skill WHERE id = $1 AND workspace_id = $2;
