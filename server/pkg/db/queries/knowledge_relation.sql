-- Knowledge Relation CRUD (V3 关系预留，V2 仅建表 + 最小读写)

-- name: CreateKnowledgeRelation :one
INSERT INTO knowledge_relation (
    workspace_id,
    from_type,
    from_id,
    to_type,
    to_id,
    relation_type,
    strength
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListKnowledgeRelations :many
SELECT * FROM knowledge_relation
WHERE workspace_id = $1
  AND (sqlc.narg('from_type')::text IS NULL OR knowledge_relation.from_type = sqlc.narg('from_type')::text)
  AND (sqlc.narg('from_id')::uuid IS NULL OR knowledge_relation.from_id = sqlc.narg('from_id')::uuid)
ORDER BY created_at DESC;

-- name: DeleteKnowledgeRelation :exec
DELETE FROM knowledge_relation WHERE id = $1 AND workspace_id = $2;
