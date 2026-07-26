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
    skill_opportunity,
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
    $21, $22, $23, $24, $25, $26
)
RETURNING *;

-- name: GetCapturedSourceInWorkspace :one
SELECT * FROM captured_source
WHERE id = $1 AND workspace_id = $2;

-- name: FindCapturedSourceDuplicate :one
SELECT * FROM captured_source
WHERE workspace_id = $1
  AND normalized_url = $2
  AND (
    (sqlc.narg('text_hash')::text IS NOT NULL AND text_hash = sqlc.narg('text_hash')::text)
    OR (sqlc.narg('text_hash')::text IS NULL AND text_hash IS NULL)
  )
ORDER BY created_at DESC
LIMIT 1;

-- name: UpdateCapturedSourcePreviewMetadata :one
UPDATE captured_source
SET favicon_url = COALESCE(sqlc.narg('favicon_url'), favicon_url),
    description = COALESCE(sqlc.narg('description'), description),
    preview_image_url = COALESCE(sqlc.narg('preview_image_url'), preview_image_url),
    skill_opportunity = COALESCE(sqlc.narg('skill_opportunity'), skill_opportunity),
    updated_at = now()
WHERE id = $1 AND workspace_id = $2
RETURNING *;

-- name: ListCapturedSources :many
SELECT * FROM captured_source
WHERE captured_source.workspace_id = $1
  AND (sqlc.narg('memory_state')::text IS NULL OR captured_source.memory_state = sqlc.narg('memory_state')::text)
  AND (
    COALESCE(sqlc.narg('query')::text, '') = ''
    OR LOWER(captured_source.title) LIKE '%' || LOWER(sqlc.narg('query')::text) || '%'
    OR LOWER(captured_source.url) LIKE '%' || LOWER(sqlc.narg('query')::text) || '%'
    OR LOWER(captured_source.domain) LIKE '%' || LOWER(sqlc.narg('query')::text) || '%'
    OR EXISTS (
      SELECT 1 FROM page_memory
      WHERE page_memory.captured_source_id = captured_source.id
        AND page_memory.workspace_id = captured_source.workspace_id
        AND LOWER(page_memory.search_text) LIKE '%' || LOWER(sqlc.narg('query')::text) || '%'
    )
  )
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountCapturedSources :one
SELECT count(*)::bigint FROM captured_source
WHERE captured_source.workspace_id = $1
  AND (sqlc.narg('memory_state')::text IS NULL OR captured_source.memory_state = sqlc.narg('memory_state')::text)
  AND (
    COALESCE(sqlc.narg('query')::text, '') = ''
    OR LOWER(captured_source.title) LIKE '%' || LOWER(sqlc.narg('query')::text) || '%'
    OR LOWER(captured_source.url) LIKE '%' || LOWER(sqlc.narg('query')::text) || '%'
    OR LOWER(captured_source.domain) LIKE '%' || LOWER(sqlc.narg('query')::text) || '%'
    OR EXISTS (
      SELECT 1 FROM page_memory
      WHERE page_memory.captured_source_id = captured_source.id
        AND page_memory.workspace_id = captured_source.workspace_id
        AND LOWER(page_memory.search_text) LIKE '%' || LOWER(sqlc.narg('query')::text) || '%'
    )
  );

-- name: UpdateCapturedSourceMemoryState :one
UPDATE captured_source
SET memory_state = $3,
    updated_at = now()
WHERE id = $1 AND workspace_id = $2
RETURNING *;

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

-- name: GetPageMemoryByEnrichmentTask :one
SELECT * FROM page_memory
WHERE enrichment_task_id = $1;

-- name: ListPendingPageMemoryCaptures :many
SELECT captured_source.* FROM captured_source
JOIN page_memory ON page_memory.captured_source_id = captured_source.id
WHERE page_memory.status = 'pending'
  AND captured_source.summary_status = 'pending'
ORDER BY page_memory.created_at ASC
LIMIT $1;

-- name: UpdatePageMemoryEnrichment :one
UPDATE page_memory
SET summary = $3,
    one_line_takeaway = $4,
    key_points = $5,
    topics = $6,
    entities = $7,
    keywords = $8,
    search_text = $9,
    model_provider = sqlc.narg('model_provider'),
    model_name = sqlc.narg('model_name'),
    status = 'ready',
    failure_reason = NULL,
    generated_at = now(),
    updated_at = now()
WHERE captured_source_id = $1 AND workspace_id = $2
RETURNING *;

-- name: MarkPageMemoryEnrichmentProcessing :one
UPDATE page_memory
SET status = 'processing',
    enrichment_task_id = $3,
    failure_reason = NULL,
    updated_at = now()
WHERE captured_source_id = $1 AND workspace_id = $2
  AND status IN ('pending', 'failed')
  AND (enrichment_task_id IS NULL OR enrichment_task_id = $3)
RETURNING *;

-- name: MarkPageMemoryEnrichmentFailed :one
UPDATE page_memory
SET status = 'failed',
    failure_reason = sqlc.narg('failure_reason'),
    updated_at = now()
WHERE captured_source_id = $1 AND workspace_id = $2
RETURNING *;

-- name: UpdateCapturedSourceEnrichmentStatus :one
UPDATE captured_source
SET summary_status = $3,
    status = CASE
        WHEN $3 = 'success' THEN 'ready'
        WHEN $3 = 'failure' THEN 'failed'
        ELSE status
    END,
    failure_reason = sqlc.narg('failure_reason'),
    updated_at = now()
WHERE id = $1 AND workspace_id = $2
RETURNING *;
