ALTER TABLE "NotificationCampaign" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "NotificationCampaign_archivedAt_createdAt_idx"
  ON "NotificationCampaign"("archivedAt", "createdAt");
