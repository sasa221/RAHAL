import { Injectable, NotFoundException } from "@nestjs/common";
import type { NotificationInbox, NotificationReadResult } from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import { NotificationsRepository } from "./notifications.repository";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly auth: AuthService,
    private readonly notifications: NotificationsRepository,
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
}
