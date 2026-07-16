-- No-op: migration 163 only backfills columns that belong to the canonical
-- captured_source schema in migration 161 for databases that had already marked
-- 161 as applied before those columns existed. Dropping them here would make
-- fresh databases drift away from the current schema.
SELECT 1;
