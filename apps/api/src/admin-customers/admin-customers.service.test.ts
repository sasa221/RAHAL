import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AdminCustomersService, maskEmail, maskPhone } from "./admin-customers.service";

const customer = {
  id: "customer-1",
  email: "customer@example.com",
  phone: "+201012345678",
  fullNameAr: "عميل رحال",
  fullNameEn: "Rahal Customer",
  status: "ACTIVE",
  preferredLocale: "ar",
  emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  phoneVerifiedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  _count: { reservations: 2, bookings: 1 },
  sessions: [{ lastSeenAt: new Date("2026-02-01T00:00:00.000Z") }],
  notificationPreference: null,
  reservations: [],
};

function setup(role: "CUSTOMER" | "SALES" | "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
  const auth = {
    getSession: vi.fn().mockResolvedValue({ user: { id: "admin-1", role } }),
  };
  const repository = {
    page: vi.fn().mockResolvedValue({
      items: [customer],
      summary: { total: 1, active: 1, pendingVerification: 1, restricted: 0 },
    }),
    detail: vi.fn().mockResolvedValue(customer),
    statusAudit: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue({ ...customer, status: "SUSPENDED" }),
  };
  return {
    repository,
    service: new AdminCustomersService(auth as never, repository as never),
  };
}

describe("AdminCustomersService", () => {
  it("rejects customer and sales sessions", async () => {
    for (const role of ["CUSTOMER", "SALES"] as const) {
      await expect(setup(role).service.page("session", { locale: "en" })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    }
  });

  it("returns masked contact details and bounded customer aggregates", async () => {
    const result = await setup().service.page("session", { locale: "en" });
    expect(result.items[0]).toMatchObject({
      displayName: "Rahal Customer",
      emailMasked: "cu******@example.com",
      phoneMasked: "+20*******678",
      reservationCount: 2,
      bookingCount: 1,
    });
    expect(JSON.stringify(result)).not.toContain("customer@example.com");
    expect(JSON.stringify(result)).not.toContain("+201012345678");
  });

  it("rejects unsupported filters and malformed cursors before database access", async () => {
    const { service, repository } = setup();
    await expect(service.page("session", { locale: "en", status: "ROOT" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.page("session", { locale: "en", cursor: "not-a-cursor" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.page).not.toHaveBeenCalled();
  });

  it("does not expose profile identity data in customer detail", async () => {
    const result = await setup().service.detail("session", "customer-1", "ar");
    expect(result.displayName).toBe("عميل رحال");
    expect(result.preferences).toEqual({
      inApp: true,
      push: true,
      email: true,
      whatsapp: true,
      marketing: false,
    });
    expect(result).not.toHaveProperty("nationality");
    expect(result).not.toHaveProperty("dateOfBirth");
    expect(result).not.toHaveProperty("documents");
  });

  it("requires a real customer and rejects no-op or archived status changes", async () => {
    const missing = setup();
    missing.repository.detail.mockResolvedValue(null);
    await expect(
      missing.service.updateStatus(
        "session",
        "missing",
        { status: "BLOCKED", reason: "Confirmed policy violation" },
        "en",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      setup().service.updateStatus(
        "session",
        "customer-1",
        { status: "ACTIVE", reason: "No effective account change" },
        "en",
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const archived = setup();
    archived.repository.detail.mockResolvedValue({ ...customer, status: "ARCHIVED" });
    await expect(
      archived.service.updateStatus(
        "session",
        "customer-1",
        { status: "ACTIVE", reason: "Attempt to restore archive" },
        "en",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("records the actor, reason, previous status and requested status", async () => {
    const { service, repository } = setup();
    await service.updateStatus(
      "session",
      "customer-1",
      { status: "SUSPENDED", reason: "Manual account security review" },
      "en",
    );
    expect(repository.updateStatus).toHaveBeenCalledWith("customer-1", "SUSPENDED", {
      actorId: "admin-1",
      reason: "Manual account security review",
      previousStatus: "ACTIVE",
    });
  });
});

describe("customer contact masking", () => {
  it("preserves routing context without revealing contact values", () => {
    expect(maskEmail("ab@example.com")).toBe("ab***@example.com");
    expect(maskPhone("+201012345678")).toBe("+20*******678");
  });
});
