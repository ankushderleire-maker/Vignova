-- AlterTable
ALTER TABLE "GeneratedResume" ADD COLUMN     "extensionData" JSONB,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE INDEX "GeneratedResume_createdAt_idx" ON "GeneratedResume"("createdAt");

-- CreateIndex
CREATE INDEX "GeneratedResume_source_idx" ON "GeneratedResume"("source");

-- CreateIndex
CREATE INDEX "JobApplication_source_idx" ON "JobApplication"("source");
