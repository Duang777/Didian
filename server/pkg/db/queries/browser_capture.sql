-- name: CreateCapturedSource :one
INSERT INTO captured_source (
    workspace_id,
    creator_id,
    source_type,
    source,
    capture_scope,
    source_tab_id,
    url,
    normalized_url,
    title,
    domain,
    favicon_url,
    description,
    preview_image_url,
    selected_text,
    readable_text,
    links,
    text_hash,
    page_hash,
    status,
    metadata_status,
    archive_status,
    summary_status,
    embedding_status,
    memory_state,
    captured_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
    $21, $22, $23, $24, $25
)
RETURNING *;

-- name: GetCapturedSourceInWorkspace :one
SELECT * FROM captured_source
WHERE id = $1 AND workspace_id = $2;

-- name: FindCapturedSourceDuplicate :one
SELECT * FROM captured_source
WHERE workspace_id = $1
  AND normalized_url = $2
  AND text_hash = $3
  AND text_hash IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;

-- name: UpdateCapturedSourcePreviewMetadata :one
UPDATE captured_source
SET favicon_url = COALESCE(sqlc.narg('favicon_url'), favicon_url),
    description = COALESCE(sqlc.narg('description'), description),
    preview_image_url = COALESCE(sqlc.narg('preview_image_url'), preview_image_url),
    updated_at = now()
WHERE id = $1 AND workspace_id = $2
RETURNING *;

-- name: ListCapturedSources :many
SELECT * FROM captured_source
WHERE workspace_id = $1
  AND (sqlc.narg('memory_state')::text IS NULL OR memory_state = sqlc.narg('memory_state')::text)
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountCapturedSources :one
SELECT count(*)::bigint FROM captured_source
WHERE workspace_id = $1
  AND (sqlc.narg('memory_state')::text IS NULL OR memory_state = sqlc.narg('memory_state')::text);

-- name: CreatePendingPageMemory :one
INSERT INTO page_memory (
    captured_source_id,
    workspace_id,
    search_text,
    keywords,
    status
) VALUES ($1, $2, $3, $4, 'pending')
ON CONFLICT (captured_source_id) DO UPDATE
SET search_text = EXCLUDED.search_text,
    keywords = EXCLUDED.keywords,
    updated_at = now()
RETURNING *;

-- name: GetPageMemory :one
SELECT * FROM page_memory
WHERE captured_source_id = $1 AND workspace_id = $2;
