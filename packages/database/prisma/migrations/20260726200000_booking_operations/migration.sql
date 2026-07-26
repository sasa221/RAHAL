CREATE TYPE "BookingOperationType" AS ENUM ('DELIVERY', 'RETURN');

CREATE TABLE "BookingOperation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "BookingOperationType" NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "fuelLevelPercent" INTEGER NOT NULL,
    "conditionNote" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingOperation_bookingId_type_key"
ON "BookingOperation"("bookingId", "type");

CREATE INDEX "BookingOperation_actorId_recordedAt_idx"
ON "BookingOperation"("actorId", "recordedAt");

ALTER TABLE "BookingOperation"
ADD CONSTRAINT "BookingOperation_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingOperation"
ADD CONSTRAINT "BookingOperation_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingOperation"
ADD CONSTRAINT "BookingOperation_readings_valid"
CHECK (
  "odometerKm" >= 0 AND
  "fuelLevelPercent" >= 0 AND
  "fuelLevelPercent" <= 100
);
