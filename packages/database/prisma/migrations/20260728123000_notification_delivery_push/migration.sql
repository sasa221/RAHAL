ALTER TABLE "PushSubscription"
ADD COLUMN "subscriptionCiphertext" TEXT;

CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key"
ON "NotificationDelivery"("notificationId", "channel");
