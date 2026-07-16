ALTER TABLE captured_source
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'captured_source_description_check'
      AND conrelid = 'captured_source'::regclass
  ) THEN
    ALTER TABLE captured_source
      ADD CONSTRAINT captured_source_description_check
      CHECK (description IS NULL OR char_length(description) <= 2000);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'captured_source_preview_image_url_check'
      AND conrelid = 'captured_source'::regclass
  ) THEN
    ALTER TABLE captured_source
      ADD CONSTRAINT captured_source_preview_image_url_check
      CHECK (preview_image_url IS NULL OR char_length(preview_image_url) <= 4096);
  END IF;
END $$;
