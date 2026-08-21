-- Task 6 is additive: legacy address, phone, WhatsApp and working-hours values remain untouched.
CREATE TYPE "BranchStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

ALTER TABLE "Branch"
  ADD COLUMN "governorateAr" TEXT,
  ADD COLUMN "governorateEn" TEXT,
  ADD COLUMN "areaAr" TEXT,
  ADD COLUMN "areaEn" TEXT,
  ADD COLUMN "streetAr" TEXT,
  ADD COLUMN "streetEn" TEXT,
  ADD COLUMN "landmarkAr" TEXT,
  ADD COLUMN "landmarkEn" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "socialLinks" JSONB,
  ADD COLUMN "services" JSONB,
  ADD COLUMN "managerId" TEXT,
  ADD COLUMN "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "whatsappNumber" TEXT;

-- Preserve the existing active/inactive meaning without changing any public branch data.
UPDATE "Branch" SET "status" = CASE WHEN "active" THEN 'ACTIVE'::"BranchStatus" ELSE 'INACTIVE'::"BranchStatus" END;

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Branch_status_active_idx" ON "Branch"("status", "active");
CREATE INDEX "Branch_managerId_idx" ON "Branch"("managerId");
