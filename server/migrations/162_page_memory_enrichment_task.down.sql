DROP INDEX IF EXISTS idx_page_memory_enrichment_task;

ALTER TABLE page_memory
  DROP CONSTRAINT IF EXISTS page_memory_status_check;

ALTER TABLE page_memory
  ADD CONSTRAINT page_memory_status_check
  CHECK (status IN ('pending', 'ready', 'failed'));

ALTER TABLE page_memory
  DROP COLUMN IF EXISTS failure_reason,
  DROP COLUMN IF EXISTS enrichment_task_id;
