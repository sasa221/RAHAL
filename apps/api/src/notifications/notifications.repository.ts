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
}
