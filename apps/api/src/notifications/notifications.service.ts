import { Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationInbox, NotificationReadResult } from "@rahal/contracts";
import { createHmac } from "node:crypto";
import { AuthService } from "../auth/auth.service";
import { loadApiConfig } from "../config";
import type { RemovePushSubscriptionDto, SavePushSubscriptionDto } from "./notifications.dto";
import { NotificationsRepository } from "./notifications.repository";
import { PushSubscriptionCryptoService } from "./push-subscription-crypto.service";

@Injectable()
export class NotificationsService {
  private readonly config = loadApiConfig();

  constructor(
    private readonly auth: AuthService,
    private readonly notifications: NotificationsRepository,
    private readonly pushCrypto: PushSubscriptionCryptoService = new PushSubscriptionCryptoService(),
  ) {}

  async inbox(token: string | undefined, requestedLocale?: string): Promise<NotificationInbox> {
    const session = await this.auth.getSession(token);
    const locale =
      requestedLocale === "ar" || requestedLocale === "en"
        ? requestedLocale
        : session.user.preferredLocale === "ar"
          ? "ar"
          : "en";
    const inbox = await this.notifications.inbox(session.user.id);
    return {
      unreadCount: inbox.unreadCount,
      items: inbox.items.map((item) => ({
        id: item.id,
        eventKey: item.eventKey,
        title: locale === "ar" ? item.titleAr : item.titleEn,
        body: locale === "ar" ? item.bodyAr : item.bodyEn,
        important: item.important,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        target: item.reservationId
          ? { kind: "RESERVATION" as const, id: item.reservationId }
          : null,
      })),
    };
  }

  async markRead(token: string | undefined, id: string): Promise<NotificationReadResult> {
    const session = await this.auth.getSession(token);
    const result = await this.notifications.markRead(id, session.user.id, new Date());
    if (!result?.readAt) throw new NotFoundException("The notification was not found.");
    return { id: result.id, readAt: result.readAt.toISOString() };
  }

  async markAllRead(token: string | undefined) {
    const session = await this.auth.getSession(token);
    const result = await this.notifications.markAllRead(session.user.id, new Date());
    return { readAt: result.readAt.toISOString() };
  }

  pushPublicKey() {
    return this.pushCrypto.publicKey();
  }

  async savePushSubscription(
    token: string | undefined,
    input: SavePushSubscriptionDto,
    userAgent?: string,
  ) {
    const session = await this.auth.getSession(token);
    if (!this.pushCrypto.available()) {
      throw new NotFoundException("Browser push is not available.");
    }
    await this.notifications.savePushSubscription({
      userId: session.user.id,
      tokenHash: this.pushTokenHash(input.endpoint),
      subscriptionCiphertext: this.pushCrypto.encrypt(session.user.id, {
        endpoint: input.endpoint,
        keys: { p256dh: input.p256dh, auth: input.auth },
      }),
      userAgent: userAgent?.slice(0, 500),
    });
    return { enabled: true };
  }

  async removePushSubscription(token: string | undefined, input: RemovePushSubscriptionDto) {
    const session = await this.auth.getSession(token);
    await this.notifications.removePushSubscription(
      session.user.id,
      this.pushTokenHash(input.endpoint),
    );
    return { enabled: false };
  }

  private pushTokenHash(endpoint: string) {
    return createHmac("sha256", this.config.authSecret).update(endpoint).digest("hex");
  }
}
