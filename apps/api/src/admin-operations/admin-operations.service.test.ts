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
});
