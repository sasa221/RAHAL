import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AccountService } from "./account.service";

const accountRecord = {
  id: "customer-1",
  fullNameAr: "سارة أحمد",
  fullNameEn: "Sara Ahmed",
  email: "sara@example.test",
  phone: "+201000000001",
  emailVerifiedAt: new Date("2026-07-01T10:00:00.000Z"),
  phoneVerifiedAt: new Date("2026-07-01T10:05:00.000Z"),
  preferredLocale: "en",
  dateOfBirth: new Date("1995-03-12T00:00:00.000Z"),
  nationality: "Egyptian",
  address: "A fictional Cairo test address",
  emergencyContactName: "Emergency Contact",
  emergencyContactPhone: "+201000000002",
  createdAt: new Date("2026-06-01T10:00:00.000Z"),
  notificationPreference: null,
};

function setup(role: "CUSTOMER" | "SALES" = "CUSTOMER") {
  const auth = {
    getSession: vi.fn().mockResolvedValue({
      user: { id: "customer-1", role, preferredLocale: "en" },
    }),
  };
  const repository = {
    findCustomer: vi.fn().mockResolvedValue(accountRecord),
    updateProfile: vi.fn().mockResolvedValue(accountRecord),
    updateNotifications: vi.fn().mockResolvedValue({
      ...accountRecord,
      notificationPreference: {
        inAppEnabled: true,
        emailEnabled: false,
        whatsappEnabled: true,
        pushEnabled: false,
        marketingEnabled: false,
        marketingConsentDecidedAt: new Date("2026-07-30T12:00:00.000Z"),
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
      },
    }),
  };
  return {
    repository,
    service: new AccountService(auth as never, repository as never),
  };
}

describe("AccountService", () => {
  it("returns safe defaults before preferences have been created", async () => {
    const { service } = setup();
    await expect(service.overview("session")).resolves.toMatchObject({
      profile: {
        email: "sara@example.test",
        phone: "+201000000001",
        emailVerified: true,
        phoneVerified: true,
      },
      notifications: {
        inAppEnabled: true,
        emailEnabled: true,
        whatsappEnabled: true,
        pushEnabled: true,
        marketingEnabled: false,
        marketingConsentDecided: false,
      },
    });
  });

  it("prevents staff accounts from using customer self-service", async () => {
    const { service, repository } = setup("SALES");
    await expect(service.overview("session")).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findCustomer).not.toHaveBeenCalled();
  });

  it("rejects a future date of birth", async () => {
    const { service, repository } = setup();
    await expect(
      service.updateProfile("session", {
        fullNameEn: "Sara Ahmed",
        fullNameAr: "سارة أحمد",
        preferredLocale: "en",
        dateOfBirth: "2999-01-01",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it("rejects a calendar date that normalizes into another month", async () => {
    const { service } = setup();
    await expect(
      service.updateProfile("session", {
        fullNameEn: "Sara Ahmed",
        preferredLocale: "en",
        dateOfBirth: "2025-02-31",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("records changed field names without passing old profile values into audit input", async () => {
    const { service, repository } = setup();
    await service.updateProfile("session", {
      fullNameEn: "Sara Mostafa",
      fullNameAr: "سارة مصطفى",
      preferredLocale: "ar",
      dateOfBirth: "1995-03-12",
      nationality: "Egyptian",
      address: "A new fictional Cairo test address",
      emergencyContactName: "New Emergency Contact",
      emergencyContactPhone: "+201000000003",
    });
    expect(repository.updateProfile).toHaveBeenCalledWith(
      "customer-1",
      expect.objectContaining({ fullNameEn: "Sara Mostafa" }),
      expect.arrayContaining(["fullNameEn", "address", "emergencyContactPhone"]),
    );
    expect(repository.updateProfile.mock.calls[0]?.[2]).not.toContain(
      "A new fictional Cairo test address",
    );
  });

  it("requires quiet-hour start and end together", async () => {
    const { service, repository } = setup();
    await expect(
      service.updateNotifications("session", {
        emailEnabled: true,
        whatsappEnabled: true,
        pushEnabled: false,
        marketingEnabled: false,
        quietHoursStart: "22:00",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateNotifications).not.toHaveBeenCalled();
  });

  it("rejects an all-day zero-length quiet window", async () => {
    const { service } = setup();
    await expect(
      service.updateNotifications("session", {
        emailEnabled: true,
        whatsappEnabled: true,
        pushEnabled: false,
        marketingEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "22:00",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("keeps in-app enabled while saving optional channels independently", async () => {
    const { service, repository } = setup();
    await expect(
      service.updateNotifications("session", {
        emailEnabled: false,
        whatsappEnabled: true,
        pushEnabled: false,
        marketingEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
      }),
    ).resolves.toMatchObject({
      notifications: {
        inAppEnabled: true,
        emailEnabled: false,
        whatsappEnabled: true,
        pushEnabled: false,
        marketingEnabled: false,
        marketingConsentDecided: true,
      },
    });
    expect(repository.updateNotifications).toHaveBeenCalledWith(
      "customer-1",
      expect.objectContaining({
        emailEnabled: false,
        whatsappEnabled: true,
        marketingEnabled: false,
      }),
      expect.objectContaining({ inAppEnabled: true }),
    );
  });
});
