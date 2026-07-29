import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationOutboxService, quietHoursEnd } from "./notification-outbox.service";

describe("NotificationOutboxService", () => {
  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.BREVO_SENDER_NAME;
    vi.unstubAllGlobals();
  });

  it("records in-app delivery and processes a claimed event once", async () => {
    const repository = {
      claimNextEvent: vi.fn().mockResolvedValue({
        id: "event-1",
        eventKey: "BOOKING_DELIVERED",
        aggregateId: "booking-1",
        payload: {
          reservationId: "reservation-1",
          customerId: "customer-1",
          userId: "staff-1",
        },
        attempts: 1,
      }),
      deliveryContext: vi.fn().mockResolvedValue({
        id: "notification-1",
        titleAr: "قيد المراجعة",
        titleEn: "Under review",
        bodyAr: "طلبك قيد المراجعة.",
        bodyEn: "Your request is under review.",
        important: true,
        reservationId: "reservation-1",
        user: {
          id: "staff-1",
          email: "customer@example.test",
          phone: "+201000000001",
          preferredLocale: "en",
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          notificationPreference: {
            inAppEnabled: true,
            pushEnabled: false,
            emailEnabled: false,
            whatsappEnabled: false,
            quietHoursStart: null,
            quietHoursEnd: null,
          },
          pushSubscriptions: [],
        },
      }),
      upsertDelivery: vi.fn().mockResolvedValue({
        id: "delivery-1",
        status: "QUEUED",
      }),
      markDelivery: vi.fn(),
      markEventProcessed: vi.fn(),
      retryEvent: vi.fn(),
      deferEvent: vi.fn(),
    };
    const worker = new NotificationOutboxService(repository as never, {} as never);

    await expect(worker.drainOne()).resolves.toBe(true);
    expect(repository.deliveryContext).toHaveBeenCalledWith(
      "BOOKING_DELIVERED",
      "reservation-1",
      "staff-1",
    );
    expect(repository.upsertDelivery).toHaveBeenCalledWith("notification-1", "IN_APP");
    expect(repository.markDelivery).toHaveBeenCalledWith(
      "delivery-1",
      expect.objectContaining({ status: "SENT" }),
    );
    expect(repository.markEventProcessed).toHaveBeenCalledWith("event-1");
    expect(repository.retryEvent).not.toHaveBeenCalled();
  });

  it("sends verified-customer email notifications through Brevo", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    process.env.BREVO_SENDER_EMAIL = "rahal.sender@gmail.com";
    process.env.BREVO_SENDER_NAME = "RAHAL | رحال";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ messageId: "brevo-notification-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const repository = {
      claimNextEvent: vi.fn().mockResolvedValue({
        id: "event-email-1",
        eventKey: "RESERVATION_UNDER_REVIEW",
        aggregateId: "reservation-email-1",
        payload: { customerId: "customer-email-1" },
        attempts: 1,
      }),
      deliveryContext: vi.fn().mockResolvedValue({
        id: "notification-email-1",
        titleAr: "طلبك قيد المراجعة",
        titleEn: "Your request is under review",
        bodyAr: "يراجع فريق رحال طلبك الآن.",
        bodyEn: "The Rahal team is reviewing your request.",
        important: true,
        reservationId: "reservation-email-1",
        user: {
          id: "customer-email-1",
          email: "customer@example.com",
          phone: "+201000000001",
          preferredLocale: "en",
          emailVerifiedAt: new Date("2026-07-29T00:00:00.000Z"),
          phoneVerifiedAt: null,
          notificationPreference: {
            inAppEnabled: false,
            pushEnabled: false,
            emailEnabled: true,
            whatsappEnabled: false,
            quietHoursStart: null,
            quietHoursEnd: null,
          },
          pushSubscriptions: [],
        },
      }),
      upsertDelivery: vi.fn().mockResolvedValue({
        id: "delivery-email-1",
        status: "QUEUED",
      }),
      markDelivery: vi.fn(),
      markEventProcessed: vi.fn(),
      retryEvent: vi.fn(),
      deferEvent: vi.fn(),
    };
    const worker = new NotificationOutboxService(repository as never, {} as never);

    await expect(worker.drainOne()).resolves.toBe(true);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.brevo.com/v3/smtp/email");
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      to: Array<{ email: string }>;
    };
    expect(requestBody.to).toEqual([{ email: "customer@example.com" }]);
    expect(repository.markDelivery).toHaveBeenCalledWith(
      "delivery-email-1",
      expect.objectContaining({
        status: "SENT",
        providerId: "brevo-notification-1",
      }),
    );
    expect(repository.markEventProcessed).toHaveBeenCalledWith("event-email-1");
  });

  it("does not resend a channel that already succeeded on an earlier attempt", async () => {
    const repository = {
      claimNextEvent: vi.fn().mockResolvedValue({
        id: "event-3",
        eventKey: "RESERVATION_UNDER_REVIEW",
        aggregateId: "reservation-3",
        payload: { customerId: "customer-3" },
        attempts: 2,
      }),
      deliveryContext: vi.fn().mockResolvedValue({
        id: "notification-3",
        titleAr: "قيد المراجعة",
        titleEn: "Under review",
        bodyAr: "طلبك قيد المراجعة.",
        bodyEn: "Your request is under review.",
        reservationId: "reservation-3",
        user: {
          id: "customer-3",
          email: "customer@example.test",
          phone: "+201000000001",
          preferredLocale: "en",
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          notificationPreference: {
            inAppEnabled: true,
            pushEnabled: false,
            emailEnabled: false,
            whatsappEnabled: false,
            quietHoursStart: null,
            quietHoursEnd: null,
          },
          pushSubscriptions: [],
        },
      }),
      upsertDelivery: vi.fn().mockResolvedValue({
        id: "delivery-3",
        status: "SENT",
      }),
      markDelivery: vi.fn(),
      markEventProcessed: vi.fn(),
      retryEvent: vi.fn(),
      deferEvent: vi.fn(),
    };
    const worker = new NotificationOutboxService(repository as never, {} as never);

    await expect(worker.drainOne()).resolves.toBe(true);
    expect(repository.markDelivery).not.toHaveBeenCalled();
    expect(repository.markEventProcessed).toHaveBeenCalledWith("event-3");
  });

  it("schedules a bounded retry without exposing event payloads", async () => {
    const repository = {
      claimNextEvent: vi.fn().mockResolvedValue({
        id: "event-2",
        eventKey: "RESERVATION_UPDATE",
        aggregateId: "reservation-2",
        payload: {},
        attempts: 2,
      }),
      retryEvent: vi.fn(),
    };
    const worker = new NotificationOutboxService(repository as never, {} as never);

    await expect(worker.drainOne()).resolves.toBe(false);
    expect(repository.retryEvent).toHaveBeenCalledWith(
      "event-2",
      2,
      "Notification event has no recipient.",
    );
  });

  it("calculates same-day and overnight quiet-hour deferrals in Cairo time", () => {
    const midday = new Date("2026-07-28T10:30:00.000Z");
    expect(quietHoursEnd("12:00", "14:00", midday, "Africa/Cairo")?.toISOString()).toBe(
      "2026-07-28T11:00:00.000Z",
    );
    const late = new Date("2026-07-28T21:30:00.000Z");
    expect(quietHoursEnd("23:00", "07:00", late, "Africa/Cairo")?.toISOString()).toBe(
      "2026-07-29T04:00:00.000Z",
    );
    expect(quietHoursEnd("08:00", "10:00", midday, "Africa/Cairo")).toBeNull();
  });
});
