ALTER TABLE "Reservation"
  ADD COLUMN "customerNameSnapshot" TEXT,
  ADD COLUMN "customerEmailSnapshot" TEXT,
  ADD COLUMN "customerPhoneSnapshot" TEXT,
  ADD COLUMN "nationalitySnapshot" TEXT,
  ADD COLUMN "addressSnapshot" TEXT,
  ADD COLUMN "emergencyContactNameSnapshot" TEXT,
  ADD COLUMN "emergencyContactPhoneSnapshot" TEXT,
  ADD COLUMN "customerDetailsCompletedAt" TIMESTAMP(3);
