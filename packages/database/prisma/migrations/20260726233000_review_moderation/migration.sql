CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Review"
ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "moderationNote" TEXT,
ADD COLUMN "moderatedAt" TIMESTAMP(3),
ADD COLUMN "moderatedById" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Review"
SET "status" = 'APPROVED'
WHERE "approvedAt" IS NOT NULL;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_moderatedById_fkey"
FOREIGN KEY ("moderatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");
CREATE INDEX "Review_vehicleId_status_approvedAt_idx"
ON "Review"("vehicleId", "status", "approvedAt");

DROP INDEX IF EXISTS "Review_vehicleId_approvedAt_idx";
