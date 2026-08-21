-- Safe phased CMS migration.
-- Existing draft/published JSON remains untouched and is read through the legacy fallback.
ALTER TABLE "ContentEntry"
ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "publishedSchemaVersion" INTEGER;

COMMENT ON COLUMN "ContentEntry"."schemaVersion" IS
  '1 = legacy generic body; 2 = section-specific typed CMS document';
COMMENT ON COLUMN "ContentEntry"."publishedSchemaVersion" IS
  'Schema version of the immutable published snapshot; null means legacy fallback';
