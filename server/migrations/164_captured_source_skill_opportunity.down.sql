ALTER TABLE captured_source
  DROP CONSTRAINT IF EXISTS captured_source_skill_opportunity_object_check;

ALTER TABLE captured_source
  DROP COLUMN IF EXISTS skill_opportunity;
