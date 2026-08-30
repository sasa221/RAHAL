import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async inbox(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.client.notification.findMany({
        where: { userId, archivedAt: null, inAppVisible: true },
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
          targetPath: true,
        },
      }),
      this.prisma.client.notification.count({
        where: { userId, archivedAt: null, inAppVisible: true, readAt: null },
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

  deliveryContext(
    eventKey: string,
    reservationId: string,
    userId: string,
    notificationId?: string,
  ) {
    return this.prisma.client.notification.findFirst({
      where: notificationId ? { id: notificationId, userId } : { eventKey, reservationId, userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        bodyAr: true,
        bodyEn: true,
        important: true,
        reservationId: true,
        targetPath: true,
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            preferredLocale: true,
            emailVerifiedAt: true,
            notificationPreference: {
              select: {
                inAppEnabled: true,
                pushEnabled: true,
                emailEnabled: true,
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

  upsertDelivery(notificationId: string, channel: "IN_APP" | "PUSH" | "EMAIL") {
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

  async campaignRecipients(input: {
    audience: "CUSTOMERS" | "SALES" | "CUSTOMERS_AND_SALES";
    marketing: boolean;
    marketingSince?: Date;
  }) {
    const roles =
      input.audience === "CUSTOMERS"
        ? (["CUSTOMER"] as const)
        : input.audience === "SALES"
          ? (["SALES"] as const)
          : (["CUSTOMER", "SALES"] as const);
    const accountScope =
      input.audience === "CUSTOMERS"
        ? { status: { in: ["ACTIVE" as const, "PENDING_VERIFICATION" as const] } }
        : input.audience === "SALES"
          ? { status: "ACTIVE" as const }
          : {
              OR: [
                {
                  systemRole: "CUSTOMER" as const,
                  status: { in: ["ACTIVE" as const, "PENDING_VERIFICATION" as const] },
                },
                { systemRole: "SALES" as const, status: "ACTIVE" as const },
              ],
            };
    return this.prisma.client.user.findMany({
      where: {
        systemRole: { in: [...roles] },
        ...accountScope,
        ...(input.marketing ? { notificationPreference: { is: { marketingEnabled: true } } } : {}),
        ...(input.marketing && input.marketingSince
          ? {
              notifications: {
                none: {
                  campaign: { is: { marketing: true, createdAt: { gte: input.marketingSince } } },
                },
              },
            }
          : {}),
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });
  }

  async campaignRecipientOptions(input: { query?: string; roles: Array<"CUSTOMER" | "SALES"> }) {
    const query = input.query?.trim();
    return this.prisma.client.user.findMany({
      where: {
        systemRole: { in: input.roles },
        OR: [
          {
            systemRole: "CUSTOMER",
            status: { in: ["ACTIVE", "PENDING_VERIFICATION"] },
          },
          { systemRole: "SALES", status: "ACTIVE" },
        ],
        ...(query
          ? {
              AND: [
                {
                  OR: [
                    { fullNameAr: { contains: query, mode: "insensitive" } },
                    { fullNameEn: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { phone: { contains: query } },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ fullNameEn: "asc" }, { id: "asc" }],
      take: 12,
      select: {
        id: true,
        fullNameAr: true,
        fullNameEn: true,
        systemRole: true,
        email: true,
        phone: true,
        notificationPreference: { select: { marketingEnabled: true } },
      },
    });
  }

  async campaignRecipientById(input: {
    id: string;
    roles: Array<"CUSTOMER" | "SALES">;
    marketing: boolean;
    marketingSince?: Date;
  }) {
    const recipient = await this.prisma.client.user.findFirst({
      where: {
        id: input.id,
        systemRole: { in: input.roles },
        OR: [
          {
            systemRole: "CUSTOMER",
            status: { in: ["ACTIVE", "PENDING_VERIFICATION"] },
          },
          { systemRole: "SALES", status: "ACTIVE" },
        ],
        ...(input.marketing ? { notificationPreference: { is: { marketingEnabled: true } } } : {}),
        ...(input.marketing && input.marketingSince
          ? {
              notifications: {
                none: {
                  campaign: { is: { marketing: true, createdAt: { gte: input.marketingSince } } },
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });
    return recipient ? [recipient] : [];
  }

  async createCampaign(input: {
    actorId: string;
    category: string;
    audience: string;
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
    targetPath?: string;
    channels: Array<"IN_APP" | "PUSH" | "EMAIL">;
    important: boolean;
    marketing: boolean;
    recipientIds: string[];
  }) {
    const campaignId = randomUUID();
    const notifications = input.recipientIds.map((userId) => ({
      id: randomUUID(),
      userId,
      campaignId,
      eventKey: `CAMPAIGN_${input.category}`,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      bodyAr: input.bodyAr,
      bodyEn: input.bodyEn,
      targetPath: input.targetPath,
      important: input.important,
      inAppVisible: input.channels.includes("IN_APP"),
    }));
    const createdAt = new Date();
    await this.prisma.client.$transaction(async (transaction) => {
      await transaction.notificationCampaign.create({
        data: {
          id: campaignId,
          createdById: input.actorId,
          category: input.category,
          audience: input.audience,
          titleAr: input.titleAr,
          titleEn: input.titleEn,
          bodyAr: input.bodyAr,
          bodyEn: input.bodyEn,
          targetPath: input.targetPath,
          channels: input.channels,
          important: input.important,
          marketing: input.marketing,
          recipientCount: input.recipientIds.length,
          createdAt,
        },
      });
      if (notifications.length) {
        await transaction.notification.createMany({ data: notifications });
        await transaction.notificationEvent.createMany({
          data: notifications.map((notification) => ({
            eventKey: notification.eventKey,
            aggregateType: "NOTIFICATION_CAMPAIGN",
            aggregateId: campaignId,
            payload: {
              userId: notification.userId,
              notificationId: notification.id,
              channels: input.channels,
              targetPath: input.targetPath ?? null,
            },
          })),
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "NOTIFICATION_CAMPAIGN_CREATED",
          entityType: "NOTIFICATION_CAMPAIGN",
          entityId: campaignId,
          reason: `${input.category}:${input.audience}:RECIPIENTS_${input.recipientIds.length}`,
          succeeded: true,
        },
      });
    });
    return { id: campaignId, recipientCount: input.recipientIds.length, createdAt };
  }

  async campaigns(createdById?: string) {
    const campaigns = await this.prisma.client.notificationCampaign.findMany({
      where: { ...(createdById ? { createdById } : {}), archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        category: true,
        audience: true,
        titleAr: true,
        titleEn: true,
        bodyAr: true,
        bodyEn: true,
        targetPath: true,
        channels: true,
        important: true,
        marketing: true,
        recipientCount: true,
        createdAt: true,
        createdBy: { select: { fullNameAr: true, fullNameEn: true } },
      },
    });
    const delivery = await Promise.all(
      campaigns.map(async (campaign) => {
        const [queued, sent, failed] = await Promise.all([
          this.prisma.client.notificationDelivery.count({
            where: { notification: { campaignId: campaign.id }, status: "QUEUED" },
          }),
          this.prisma.client.notificationDelivery.count({
            where: {
              notification: { campaignId: campaign.id },
              status: { in: ["SENT", "DELIVERED", "READ"] },
            },
          }),
          this.prisma.client.notificationDelivery.count({
            where: { notification: { campaignId: campaign.id }, status: "FAILED" },
          }),
        ]);
        return { queued, sent, failed };
      }),
    );
    return campaigns.map((campaign, index) => ({ ...campaign, delivery: delivery[index]! }));
  }

  async archiveCampaign(id: string, actorId: string, reason: string) {
    const archivedAt = new Date();
    return this.prisma.client.$transaction(async (transaction) => {
      const campaign = await transaction.notificationCampaign.findFirst({
        where: { id, archivedAt: null },
        select: { id: true },
      });
      if (!campaign) return null;
      await transaction.notificationCampaign.update({ where: { id }, data: { archivedAt } });
      await transaction.notification.updateMany({
        where: { campaignId: id, archivedAt: null },
        data: { archivedAt },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "NOTIFICATION_CAMPAIGN_ARCHIVED",
          entityType: "NOTIFICATION_CAMPAIGN",
          entityId: id,
          reason,
          succeeded: true,
        },
      });
      return { id, archivedAt };
    });
  }
}
