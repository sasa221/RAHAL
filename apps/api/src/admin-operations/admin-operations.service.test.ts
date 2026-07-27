import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AdminOperationsService } from "./admin-operations.service";

const adminSession = {
  user: { id: "admin-1", role: "ADMIN", preferredLocale: "en" },
};

describe("AdminOperationsService", () => {
  it("returns live aggregates without raw audit payloads", async () => {
    const repository = {
      overview: vi.fn().mockResolvedValue([
        3,
        2,
        1,
        5,
        1,
        0,
        0,
        2,
        [{ status: "AVAILABLE", _count: { _all: 5 } }],
        [{ submittedAt: new Date(), completedAt: null }],
        [
          {
            id: "audit-1",
            action: "RESERVATION_REVIEWED",
            entityType: "RESERVATION",
            entityId: "reservation-1",
            succeeded: true,
            createdAt: new Date("2026-07-26T09:00:00.000Z"),
            actor: { fullNameAr: null, fullNameEn: "Rahal Admin", systemRole: "ADMIN" },
          },
        ],
      ]),
    };
    const service = new AdminOperationsService(
      { getSession: vi.fn().mockResolvedValue(adminSession) } as never,
      { require: vi.fn() } as never,
      repository as never,
    );

    const result = await service.overview("session", "en");

    expect(result.metrics.find((item) => item.key === "ATTENTION_REQUIRED")?.value).toBe(3);
    expect(result.recentActivity[0]).toEqual(
      expect.not.objectContaining({
        previousData: expect.anything(),
        newData: expect.anything(),
        ipHash: expect.anything(),
        userAgent: expect.anything(),
      }),
    );
  });

  it("rejects the overview for non-admin staff", async () => {
    const service = new AdminOperationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { ...adminSession.user, role: "SALES" },
        }),
      } as never,
      { require: vi.fn() } as never,
      { overview: vi.fn() } as never,
    );

    await expect(service.overview("session", "en")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires audit.view and caps audit responses at 40 entries", async () => {
    const requireAccess = vi.fn();
    const entries = Array.from({ length: 41 }, (_, index) => ({
      id: `audit-${index}`,
      action: "STAFF_UPDATED",
      entityType: "USER",
      entityId: `user-${index}`,
      succeeded: true,
      createdAt: new Date("2026-07-26T09:00:00.000Z"),
      actor: { fullNameAr: null, fullNameEn: "Admin", systemRole: "ADMIN" },
    }));
    const service = new AdminOperationsService(
      { getSession: vi.fn().mockResolvedValue(adminSession) } as never,
      { require: requireAccess } as never,
      {
        audit: vi.fn().mockResolvedValue({
          items: entries,
          actions: [{ action: "STAFF_UPDATED" }],
          entityTypes: [{ entityType: "USER" }],
        }),
      } as never,
    );

    const result = await service.audit("session", "en", {});

    expect(requireAccess).toHaveBeenCalledWith(adminSession, "audit.view");
    expect(result.items).toHaveLength(40);
    expect(result.nextCursor).toBe("audit-39");
  });

  it("exposes bounded document oversight only to administrators with audit access", async () => {
    const requireAccess = vi.fn();
    const documentAccess = vi.fn().mockResolvedValue({
      items: [
        {
          id: "access-1",
          action: "VIEW_INLINE",
          reason: "Reviewing identity 29801011234567 for reservation eligibility",
          succeeded: true,
          createdAt: new Date("2026-07-27T08:00:00.000Z"),
          actor: {
            fullNameAr: "موظف رحال",
            fullNameEn: "Rahal Sales",
            systemRole: "SALES",
          },
          document: {
            type: "NATIONAL_ID_BACK",
            status: "UNDER_REVIEW",
            reservation: { id: "reservation-1", reference: "RHL-001" },
          },
        },
      ],
      actions: [{ action: "VIEW_INLINE" }],
    });
    const service = new AdminOperationsService(
      { getSession: vi.fn().mockResolvedValue(adminSession) } as never,
      { require: requireAccess } as never,
      { documentAccess } as never,
    );

    const result = await service.documentAccess("session", "en", {});

    expect(requireAccess).toHaveBeenCalledWith(adminSession, "audit.view");
    expect(result.items[0]).toMatchObject({
      actorName: "Rahal Sales",
      reservationReference: "RHL-001",
      documentType: "NATIONAL_ID_BACK",
      reason: "Reviewing identity 29••••••••••67 for reservation eligibility",
    });
    expect(result.items[0]?.reason).not.toContain("29801011234567");
    expect(result.items[0]).not.toHaveProperty("ipHash");
    expect(result.items[0]).not.toHaveProperty("storageKey");
  });

  it("rejects document oversight for non-admin staff even with an audit permission", async () => {
    const service = new AdminOperationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { ...adminSession.user, role: "SALES" },
        }),
      } as never,
      { require: vi.fn() } as never,
      { documentAccess: vi.fn() } as never,
    );

    await expect(service.documentAccess("session", "en", {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
