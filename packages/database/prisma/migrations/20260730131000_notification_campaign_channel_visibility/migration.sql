-- Campaigns may deliberately target only external channels.
ALTER TABLE "Notification"
ADD COLUMN "inAppVisible" BOOLEAN NOT NULL DEFAULT true;
