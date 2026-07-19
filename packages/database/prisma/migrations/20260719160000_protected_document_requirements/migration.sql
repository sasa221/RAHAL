CREATE TYPE "CustomerCategory" AS ENUM ('EGYPTIAN', 'FOREIGN');

ALTER TABLE "Reservation"
ADD COLUMN "customerCategorySnapshot" "CustomerCategory";

CREATE TABLE "DocumentRequirementRule" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "customerCategory" "CustomerCategory" NOT NULL,
  "documentType" "DocumentType" NOT NULL,
  "requiresSelfDrive" BOOLEAN NOT NULL DEFAULT false,
  "labelAr" TEXT NOT NULL,
  "labelEn" TEXT NOT NULL,
  "allowedMimeTypes" TEXT[] NOT NULL,
  "maxSizeBytes" INTEGER NOT NULL DEFAULT 8388608,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentRequirementRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentRequirementRule_key_key"
ON "DocumentRequirementRule"("key");

CREATE INDEX "DocumentRequirementRule_customerCategory_active_sortOrder_idx"
ON "DocumentRequirementRule"("customerCategory", "active", "sortOrder");
