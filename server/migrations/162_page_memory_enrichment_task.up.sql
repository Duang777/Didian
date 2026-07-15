ALTER TABLE page_memory
  ADD COLUMN IF NOT EXISTS enrichment_task_id UUID REFERENCES agent_task_queue(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE page_memory
  DROP CONSTRAINT IF EXISTS page_memory_status_check;

ALTER TABLE page_memory
  ADD CONSTRAINT page_memory_status_check
  CHECK (status IN ('pending', 'processing', 'ready', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_memory_enrichment_task
  ON page_memory (enrichment_task_id)
  WHERE enrichment_task_id IS NOT NULL;
