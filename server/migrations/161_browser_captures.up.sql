CREATE TABLE IF NOT EXISTS captured_source (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'link',
  source TEXT NOT NULL DEFAULT 'extension',
  capture_scope TEXT NOT NULL,
  source_tab_id TEXT,
  url TEXT NOT NULL,
  normalized_url TEXT NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  favicon_url TEXT,
  description TEXT,
  preview_image_url TEXT,
  skill_opportunity JSONB,
  selected_text TEXT,
  readable_text TEXT,
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  text_hash TEXT,
  page_hash TEXT,
  status TEXT NOT NULL DEFAULT 'captured',
  metadata_status TEXT NOT NULL DEFAULT 'pending',
  archive_status TEXT NOT NULL DEFAULT 'pending',
  summary_status TEXT NOT NULL DEFAULT 'pending',
  embedding_status TEXT NOT NULL DEFAULT 'pending',
  memory_state TEXT NOT NULL DEFAULT 'active',
  failure_reason TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_type IN ('link', 'text', 'asset', 'selection', 'rss_item', 'imported_bookmark')),
  CHECK (source IN ('web', 'extension', 'api', 'cli', 'rss', 'import', 'singlefile')),
  CHECK (capture_scope IN ('page', 'selection', 'tab_group', 'bookmark')),
  CHECK (status IN ('captured', 'processing', 'ready', 'failed')),
  CHECK (metadata_status IN ('pending', 'success', 'failure')),
  CHECK (archive_status IN ('pending', 'success', 'failure', 'skipped')),
  CHECK (summary_status IN ('pending', 'success', 'failure', 'skipped')),
  CHECK (embedding_status IN ('pending', 'success', 'failure', 'skipped')),
  CHECK (memory_state IN ('active', 'muted', 'pinned', 'archived')),
  CHECK (jsonb_typeof(links) = 'array'),
  CHECK (skill_opportunity IS NULL OR jsonb_typeof(skill_opportunity) = 'object'),
  CHECK (char_length(url) <= 4096),
  CHECK (char_length(normalized_url) <= 4096),
  CHECK (char_length(title) <= 500),
  CHECK (char_length(domain) <= 255),
  CHECK (favicon_url IS NULL OR char_length(favicon_url) <= 4096),
  CHECK (description IS NULL OR char_length(description) <= 2000),
  CHECK (preview_image_url IS NULL OR char_length(preview_image_url) <= 4096),
  CHECK (selected_text IS NULL OR char_length(selected_text) <= 10000),
  CHECK (readable_text IS NULL OR char_length(readable_text) <= 60000)
);

CREATE TABLE IF NOT EXISTS page_memory (
  captured_source_id UUID PRIMARY KEY REFERENCES captured_source(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  one_line_takeaway TEXT NOT NULL DEFAULT '',
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_text TEXT NOT NULL DEFAULT '',
  model_provider TEXT,
  model_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(key_points) = 'array'),
  CHECK (jsonb_typeof(topics) = 'array'),
  CHECK (jsonb_typeof(entities) = 'array'),
  CHECK (jsonb_typeof(keywords) = 'array'),
  CHECK (status IN ('pending', 'ready', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_captured_source_workspace_created
  ON captured_source (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_captured_source_workspace_state
  ON captured_source (workspace_id, memory_state, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_captured_source_workspace_url_hash
  ON captured_source (workspace_id, normalized_url, text_hash)
  WHERE text_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_captured_source_title_trgm
  ON captured_source USING gin (LOWER(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_page_memory_workspace
  ON page_memory (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_memory_search_text_trgm
  ON page_memory USING gin (LOWER(search_text) gin_trgm_ops);
