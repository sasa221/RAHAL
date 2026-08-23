import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  HttpException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { NotificationsService } from "./notifications.service";

function setup(locale: "ar" | "en" = "en") {
  const auth = {
    getSession: vi.fn().mockResolvedValue({
      user: { id: "user-1", preferredLocale: locale, role: "SALES" },
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
    campaigns: vi.fn().mockResolvedValue([]),
    recentCampaignCount: vi.fn().mockResolvedValue(0),
    campaignRecipients: vi.fn().mockResolvedValue([{ id: "customer-1" }]),
    campaignRecipientOptions: vi.fn().mockResolvedValue([
      {
        id: "customer-1",
        fullNameAr: "عميل رحال",
        fullNameEn: "Rahal Customer",
        systemRole: "CUSTOMER",
        email: "customer@example.com",
        phone: "+201000000000",
        notificationPreference: { marketingEnabled: true },
      },
    ]),
    campaignRecipientById: vi.fn().mockResolvedValue([{ id: "customer-1" }]),
    createCampaign: vi.fn().mockResolvedValue({
      id: "campaign-1",
      recipientCount: 1,
      createdAt: new Date("2026-07-30T09:00:00.000Z"),
    }),
  };
  const access = { require: vi.fn().mockResolvedValue(undefined) };
  return {
    access,
    auth,
    repository,
    service: new NotificationsService(auth as never, repository as never, access as never),
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

  it("uses the active page locale without changing the account preference", async () => {
    const { service } = setup("en");
    await expect(service.inbox("session", "ar")).resolves.toMatchObject({
      items: [
        {
          title: "قيد المراجعة",
          body: "طلبك قيد المراجعة.",
        },
      ],
    });
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

  it("creates a bilingual customer campaign through the outbox", async () => {
    const { service, repository } = setup();
    await expect(
      service.createCampaign("session", {
        category: "NEW_VEHICLE",
        audience: "CUSTOMERS",
        titleAr: "سيارة جديدة",
        titleEn: "A new car",
        bodyAr: "اكتشف السيارة الجديدة المتاحة الآن.",
        bodyEn: "Discover the newly available vehicle.",
        channels: ["IN_APP", "EMAIL"],
        important: false,
        marketing: false,
        targetPath: "/cars",
      }),
    ).resolves.toMatchObject({
      id: "campaign-1",
      recipientCount: 1,
      queuedDeliveries: 2,
    });
    expect(repository.campaignRecipients).toHaveBeenCalledWith({
      audience: "CUSTOMERS",
      marketing: true,
    });
    expect(repository.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        marketing: true,
        recipientIds: ["customer-1"],
        targetPath: "/cars",
      }),
    );
  });

  it("returns masked customer recipient choices to sales", async () => {
    const { service, repository } = setup("ar");
    await expect(
      service.campaignRecipients("session", { locale: "ar", query: "customer" }),
    ).resolves.toEqual({
      items: [
        {
          id: "customer-1",
          name: "عميل رحال",
          role: "CUSTOMER",
          maskedContact: "cu***@example.com",
          marketingEnabled: true,
        },
      ],
    });
    expect(repository.campaignRecipientOptions).toHaveBeenCalledWith({
      query: "customer",
      roles: ["CUSTOMER"],
    });
  });

  it("sends to one eligible customer without broadening the sales audience", async () => {
    const { service, repository } = setup();
    await service.createCampaign("session", {
      category: "GENERAL_UPDATE",
      audience: "CUSTOMERS",
      recipientId: "customer-1",
      titleAr: "تحديث الطلب",
      titleEn: "Request update",
      bodyAr: "يوجد تحديث جديد بخصوص طلبك داخل رحال.",
      bodyEn: "There is a new update about your Rahal request.",
      channels: ["IN_APP"],
      important: true,
      marketing: false,
    });
    expect(repository.campaignRecipientById).toHaveBeenCalledWith({
      id: "customer-1",
      roles: ["CUSTOMER"],
      marketing: false,
    });
    expect(repository.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ audience: "INDIVIDUAL", recipientIds: ["customer-1"] }),
    );
  });

  it("prevents sales employees from targeting staff", async () => {
    const { service, repository } = setup();
    await expect(
      service.createCampaign("session", {
        category: "GENERAL_UPDATE",
        audience: "SALES",
        titleAr: "تحديث للفريق",
        titleEn: "Team update",
        bodyAr: "هذا تحديث تشغيلي لفريق رحال.",
        bodyEn: "This is an operational Rahal team update.",
        channels: ["IN_APP"],
        important: false,
        marketing: false,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.createCampaign).not.toHaveBeenCalled();
  });

  it("does not claim a marketing campaign was sent when nobody opted in", async () => {
    const { service, repository } = setup();
    repository.campaignRecipients.mockResolvedValueOnce([]);
    await expect(
      service.createCampaign("session", {
        category: "OFFER",
        audience: "CUSTOMERS",
        titleAr: "عرض جديد",
        titleEn: "New offer",
        bodyAr: "اكتشف عرض رحال الجديد لفترة محدودة.",
        bodyEn: "Discover the new limited Rahal offer.",
        channels: ["IN_APP", "EMAIL"],
        important: false,
        marketing: false,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.createCampaign).not.toHaveBeenCalled();
  });

  it("caps marketing campaigns per sender to prevent repeated broadcasts", async () => {
    const { service, repository } = setup();
    repository.recentCampaignCount.mockResolvedValue(5);
    await expect(
      service.createCampaign("session", {
        category: "OFFER",
        audience: "CUSTOMERS",
        titleAr: "عرض جديد",
        titleEn: "New offer",
        bodyAr: "اكتشف عرض رحال الجديد لفترة محدودة.",
        bodyEn: "Discover the new limited Rahal offer.",
        channels: ["IN_APP"],
        important: false,
        marketing: true,
      }),
    ).rejects.toSatisfy((error) => error instanceof HttpException && error.getStatus() === 429);
    expect(repository.campaignRecipients).not.toHaveBeenCalled();
  });

  it("marks all notifications only for the session owner", async () => {
    const { service, repository } = setup();
    await service.markAllRead("session");
    expect(repository.markAllRead).toHaveBeenCalledWith("user-1", expect.any(Date));
  });
});
