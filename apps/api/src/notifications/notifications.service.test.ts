import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service";

function setup(locale: "ar" | "en" = "en") {
  const auth = {
    getSession: vi.fn().mockResolvedValue({
      user: { id: "user-1", preferredLocale: locale },
    }),
  };
  const repository = {
    inbox: vi.fn().mockResolvedValue({
      unreadCount: 1,
      items: [
        {
          id: "notification-1",
          eventKey: "RESERVATION_UNDER_REVIEW",
          titleAr: "قيد المراجعة",
          titleEn: "Under review",
          bodyAr: "طلبك قيد المراجعة.",
          bodyEn: "Your request is under review.",
          important: true,
          readAt: null,
          createdAt: new Date("2026-07-26T08:00:00.000Z"),
          reservationId: "reservation-1",
        },
      ],
    }),
    markRead: vi.fn().mockResolvedValue({
      id: "notification-1",
      readAt: new Date("2026-07-26T09:00:00.000Z"),
    }),
    markAllRead: vi.fn().mockResolvedValue({
      readAt: new Date("2026-07-26T09:00:00.000Z"),
    }),
  };
  return {
    repository,
    service: new NotificationsService(auth as never, repository as never),
  };
}

describe("NotificationsService", () => {
  it("localizes only the authenticated user's safe inbox", async () => {
    const { service, repository } = setup("ar");
    await expect(service.inbox("session")).resolves.toMatchObject({
      unreadCount: 1,
      items: [
        {
          title: "قيد المراجعة",
          body: "طلبك قيد المراجعة.",
          target: { kind: "RESERVATION", id: "reservation-1" },
        },
      ],
    });
    expect(repository.inbox).toHaveBeenCalledWith("user-1");
  });

  it("marks an owned notification through the repository", async () => {
    const { service, repository } = setup();
    await expect(service.markRead("session", "notification-1")).resolves.toEqual({
      id: "notification-1",
      readAt: "2026-07-26T09:00:00.000Z",
    });
    expect(repository.markRead).toHaveBeenCalledWith("notification-1", "user-1", expect.any(Date));
  });

  it("does not reveal whether another user's notification exists", async () => {
    const { service, repository } = setup();
    repository.markRead.mockResolvedValue(null);
    await expect(service.markRead("session", "other-notification")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("marks all notifications only for the session owner", async () => {
    const { service, repository } = setup();
    await service.markAllRead("session");
    expect(repository.markAllRead).toHaveBeenCalledWith("user-1", expect.any(Date));
  });
});
