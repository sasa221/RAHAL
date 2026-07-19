ALTER TABLE "AlternativeOffer"
ADD COLUMN "driverRateSnapshot" DECIMAL(12, 2);

ALTER TABLE "AlternativeOffer"
ADD CONSTRAINT "AlternativeOffer_driver_rate_non_negative"
CHECK (COALESCE("driverRateSnapshot", 0) >= 0);
