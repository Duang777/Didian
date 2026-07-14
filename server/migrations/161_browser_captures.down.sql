DROP INDEX IF EXISTS idx_page_memory_search_text_trgm;
DROP INDEX IF EXISTS idx_page_memory_workspace;
DROP INDEX IF EXISTS idx_captured_source_title_trgm;
DROP INDEX IF EXISTS idx_captured_source_workspace_url_hash;
DROP INDEX IF EXISTS idx_captured_source_workspace_state;
DROP INDEX IF EXISTS idx_captured_source_workspace_created;

DROP TABLE IF EXISTS page_memory;
DROP TABLE IF EXISTS captured_source;
