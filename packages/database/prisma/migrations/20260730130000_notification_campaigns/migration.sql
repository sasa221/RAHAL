-- CreateTable
CREATE TABLE "NotificationCampaign" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "targetPath" TEXT,
    "channels" "NotificationChannel"[],
    "important" BOOLEAN NOT NULL DEFAULT false,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "recipientCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationCampaign_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "campaignId" TEXT,
ADD COLUMN "targetPath" TEXT;

-- CreateIndex
CREATE INDEX "NotificationCampaign_createdById_createdAt_idx" ON "NotificationCampaign"("createdById", "createdAt");
CREATE INDEX "NotificationCampaign_audience_createdAt_idx" ON "NotificationCampaign"("audience", "createdAt");
CREATE INDEX "Notification_campaignId_createdAt_idx" ON "Notification"("campaignId", "createdAt");

-- AddForeignKey
ALTER TABLE "NotificationCampaign" ADD CONSTRAINT "NotificationCampaign_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "NotificationCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add notification campaign permission and grant it to the default sales role.
INSERT INTO "Permission" ("id", "key", "category", "description", "isCritical")
VALUES ('perm-notifications-send', 'notifications.send', 'Notifications', 'Create customer notification campaigns', true)
ON CONFLICT ("key") DO UPDATE SET
  "category" = EXCLUDED."category",
  "description" = EXCLUDED."description",
  "isCritical" = EXCLUDED."isCritical";

INSERT INTO "StaffRolePermission" ("staffRoleId", "permissionId")
SELECT role."id", permission."id"
FROM "StaffRole" role
CROSS JOIN "Permission" permission
WHERE role."name" = 'Sales Agent' AND permission."key" = 'notifications.send'
ON CONFLICT ("staffRoleId", "permissionId") DO NOTHING;
