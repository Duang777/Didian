-- Skill Proposal CRUD (V2 个人 Skill 草稿)

-- name: CreateSkillProposal :one
INSERT INTO skill_proposal (
    workspace_id,
    captured_source_id,
    proposed_title,
    proposed_capability,
    page_type,
    confidence,
    why_useful,
    trigger_examples,
    expected_inputs,
    expected_outputs,
    reusable_workflow_score,
    instruction_density_score,
    future_use_score,
    evidence_snippets,
    risk_notes,
    draft_description,
    draft_trigger,
    draft_instructions,
    status,
    created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
)
RETURNING *;

-- name: GetSkillProposal :one
SELECT * FROM skill_proposal
WHERE id = $1 AND workspace_id = $2;

-- name: ListSkillProposalsByWorkspace :many
SELECT * FROM skill_proposal
WHERE workspace_id = $1
  AND (sqlc.narg('status')::text IS NULL OR skill_proposal.status = sqlc.narg('status')::text)
ORDER BY created_at DESC;

-- name: UpdateSkillProposalDraft :one
UPDATE skill_proposal SET
    draft_description = COALESCE(sqlc.narg('draft_description'), draft_description),
    draft_trigger = COALESCE(sqlc.narg('draft_trigger'), draft_trigger),
    draft_instructions = COALESCE(sqlc.narg('draft_instructions'), draft_instructions),
    status = COALESCE(sqlc.narg('status'), status),
    updated_at = now()
WHERE id = $1 AND workspace_id = $2
RETURNING *;

-- name: DeleteSkillProposal :exec
DELETE FROM skill_proposal WHERE id = $1 AND workspace_id = $2;
