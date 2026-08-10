ALTER TABLE captured_source
  ADD COLUMN IF NOT EXISTS skill_opportunity JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'captured_source_skill_opportunity_object_check'
      AND conrelid = 'captured_source'::regclass
  ) THEN
    ALTER TABLE captured_source
      ADD CONSTRAINT captured_source_skill_opportunity_object_check
      CHECK (skill_opportunity IS NULL OR jsonb_typeof(skill_opportunity) = 'object');
  END IF;
END $$;
