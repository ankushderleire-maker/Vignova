-- Template a saved resume was created with. Without this, preview and download
-- fell back to one default for every resume regardless of what was chosen.
-- Nullable and additive; existing rows keep NULL and fall back at read time.
ALTER TABLE "GeneratedResume" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
