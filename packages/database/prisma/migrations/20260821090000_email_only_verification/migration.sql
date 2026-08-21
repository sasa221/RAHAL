-- Phase 1: phone becomes optional. Legacy verification/delivery values remain readable
-- until a separately confirmed cleanup migration removes historical rows safely.
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

ALTER TABLE "Branch"
  ADD COLUMN "whatsappVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "whatsappMessageAr" TEXT,
  ADD COLUMN "whatsappMessageEn" TEXT;
