import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";
import { PushSubscriptionCryptoService } from "./push-subscription-crypto.service";
import { NotificationOutboxService } from "./notification-outbox.service";

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    PushSubscriptionCryptoService,
    NotificationOutboxService,
  ],
})
export class NotificationsModule {}
