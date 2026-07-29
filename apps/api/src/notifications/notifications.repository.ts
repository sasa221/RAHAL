import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async inbox(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.client.notification.findMany({
        where: { userId, archivedAt: null },
        orderBy: [{ important: "desc" }, { createdAt: "desc" }],
        take: 50,
        select: {
          id: true,
          eventKey: true,
          titleAr: true,
          titleEn: true,
          bodyAr: true,
          bodyEn: true,
          important: true,
          readAt: true,
          createdAt: true,
          reservationId: true,
        },
      }),
      this.prisma.client.notification.count({
        where: { userId, archivedAt: null, readAt: null },
      }),
    ]);
    return { items, unreadCount };
  }

  async markRead(id: string, userId: string, readAt: Date) {
    const owned = await this.prisma.client.notification.findFirst({
      where: { id, userId, archivedAt: null },
      select: { id: true, readAt: true },
    });
    if (!owned) return null;
    if (owned.readAt) return { id: owned.id, readAt: owned.readAt };
    const updated = await this.prisma.client.notification.updateMany({
      where: { id, userId, archivedAt: null, readAt: null },
      data: { readAt },
    });
    if (!updated.count) {
      return this.prisma.client.notification.findFirst({
        where: { id, userId, archivedAt: null, readAt: { not: null } },
        select: { id: true, readAt: true },
      });
    }
    return { id, readAt };
  }

  async markAllRead(userId: string, readAt: Date) {
    await this.prisma.client.notification.updateMany({
      where: { userId, archivedAt: null, readAt: null },
      data: { readAt },
    });
    return { readAt };
  }

  savePushSubscription(input: {
    userId: string;
    tokenHash: string;
    subscriptionCiphertext: string;
    userAgent?: string;
  }) {
    return this.prisma.client.pushSubscription.upsert({
      where: { tokenHash: input.tokenHash },
      create: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        subscriptionCiphertext: input.subscriptionCiphertext,
        platform: "WEB_PUSH",
        userAgent: input.userAgent,
        active: true,
      },
      update: {
        userId: input.userId,
        subscriptionCiphertext: input.subscriptionCiphertext,
        userAgent: input.userAgent,
        active: true,
        lastSeenAt: new Date(),
      },
      select: { id: true },
    });
  }

  async removePushSubscription(userId: string, tokenHash: string) {
    const result = await this.prisma.client.pushSubscription.updateMany({
      where: { userId, tokenHash, active: true },
      data: { active: false, subscriptionCiphertext: null },
    });
    return result.count;
  }

  claimNextEvent(now = new Date()) {
    return this.prisma.client.$transaction(async (transaction) => {
      const event = await transaction.notificationEvent.findFirst({
        where: {
          status: { in: ["PENDING", "FAILED"] },
          availableAt: { lte: now },
          attempts: { lt: 8 },
        },
        orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          eventKey: true,
          aggregateId: true,
          payload: true,
          attempts: true,
        },
      });
      if (!event) return null;
      const claimed = await transaction.notificationEvent.updateMany({
        where: {
          id: event.id,
          status: { in: ["PENDING", "FAILED"] },
          availableAt: { lte: now },
        },
        data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null },
      });
      return claimed.count ? { ...event, attempts: event.attempts + 1 } : null;
    });
  }

  deliveryContext(eventKey: string, reservationId: string, userId: string) {
    return this.prisma.client.notification.findFirst({
      where: { eventKey, reservationId, userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        bodyAr: true,
        bodyEn: true,
        important: true,
        reservationId: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            preferredLocale: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
            notificationPreference: {
              select: {
                inAppEnabled: true,
                pushEnabled: true,
                emailEnabled: true,
                whatsappEnabled: true,
                quietHoursStart: true,
                quietHoursEnd: true,
              },
            },
            pushSubscriptions: {
              where: { active: true, subscriptionCiphertext: { not: null } },
              select: { id: true, subscriptionCiphertext: true },
            },
          },
        },
      },
    });
  }

  upsertDelivery(notificationId: string, channel: "IN_APP" | "PUSH" | "EMAIL" | "WHATSAPP") {
    return this.prisma.client.$transaction(async (transaction) => {
      const existing = await transaction.notificationDelivery.findUnique({
        where: { notificationId_channel: { notificationId, channel } },
        select: { id: true, attempts: true, status: true },
      });
      if (existing?.status === "SENT") return existing;
      if (existing) {
        return transaction.notificationDelivery.update({
          where: { id: existing.id },
          data: { status: "QUEUED", attempts: { increment: 1 }, lastError: null },
          select: { id: true, attempts: true, status: true },
        });
      }
      return transaction.notificationDelivery.create({
        data: { notificationId, channel, status: "QUEUED", attempts: 1 },
        select: { id: true, attempts: true, status: true },
      });
    });
  }

  markDelivery(
    id: string,
    input: {
      status: "SENT" | "FAILED";
      providerId?: string;
      error?: string;
    },
  ) {
    return this.prisma.client.notificationDelivery.update({
      where: { id },
      data: {
        status: input.status,
        providerId: input.providerId,
        lastError: input.error?.slice(0, 300),
        ...(input.status === "SENT" ? { sentAt: new Date() } : {}),
      },
    });
  }

  markEventProcessed(id: string) {
    return this.prisma.client.notificationEvent.update({
      where: { id },
      data: { status: "PROCESSED", processedAt: new Date(), lastError: null },
    });
  }

  retryEvent(id: string, attempts: number, error: string) {
    const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
    return this.prisma.client.notificationEvent.update({
      where: { id },
      data: {
        status: attempts >= 8 ? "FAILED" : "PENDING",
        availableAt: new Date(Date.now() + delayMinutes * 60_000),
        lastError: error.slice(0, 300),
      },
    });
  }

  deferEvent(id: string, availableAt: Date) {
    return this.prisma.client.notificationEvent.update({
      where: { id },
      data: {
        status: "PENDING",
        availableAt,
        attempts: { decrement: 1 },
        lastError: null,
      },
    });
  }

  deactivatePushSubscription(id: string) {
    return this.prisma.client.pushSubscription.update({
      where: { id },
      data: { active: false, subscriptionCiphertext: null },
    });
  }
}
