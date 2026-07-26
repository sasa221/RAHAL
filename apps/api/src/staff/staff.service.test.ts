import { ConflictException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { StaffAccessService } from "./staff-access.service";
import { StaffService } from "./staff.service";

const staffRecord = {
  id: "staff-2",
  email: "staff@example.test",
  phone: "+201000000002",
  fullNameAr: null,
  fullNameEn: "Demo Staff",
  systemRole: "SALES" as const,
  status: "ACTIVE" as const,
  preferredLocale: "en",
  staffRoleId: "role-sales",
  createdAt: new Date("2026-07-26T08:00:00.000Z"),
  updatedAt: new Date("2026-07-26T08:00:00.000Z"),
  staffRole: {
    name: "Sales Agent",
    permissions: [{ permission: { key: "reservations.view" } }],
  },
  permissionOverrides: [],
  sessions: [],
};

function setup(role: "SALES" | "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
  const auth = {
    getSession: vi.fn().mockResolvedValue({
      user: { id: "actor-1", role, preferredLocale: "en" },
    }),
  };
  const passwords = { hash: vi.fn().mockResolvedValue("safe-hash") };
  const repository = {
    overview: vi.fn().mockResolvedValue({
      staff: [staffRecord],
      roles: [],
      permissions: [],
      recentAudit: [],
    }),
    findStaff: vi.fn().mockResolvedValue(staffRecord),
    findRole: vi.fn().mockResolvedValue({ id: "role-sales", name: "Sales Agent" }),
    findPermissions: vi.fn().mockResolvedValue([]),
    createStaff: vi.fn().mockResolvedValue(staffRecord),
    updateStaff: vi.fn().mockResolvedValue(staffRecord),
    replaceOverrides: vi.fn().mockResolvedValue(staffRecord),
    replaceRolePermissions: vi.fn(),
    permissionAccess: vi.fn(),
  };
  return {
    auth,
    passwords,
    repository,
    service: new StaffService(auth as never, passwords as never, repository as never),
  };
}

describe("StaffService", () => {
  it("rejects staff-management access for sales employees", async () => {
    const { service } = setup("SALES");
    await expect(service.overview("session")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("prevents an administrator from creating another administrator", async () => {
    const { service, repository } = setup("ADMIN");
    await expect(
      service.create("session", {
        email: "admin@example.test",
        phone: "+201000000010",
        fullNameEn: "New Admin",
        temporaryPassword: "Temporary-123",
        preferredLocale: "en",
        systemRole: "ADMIN",
        reason: "Approved administrative hire",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.createStaff).not.toHaveBeenCalled();
  });

  it("does not allow an administrator to change their own access", async () => {
    const { service, repository } = setup("SUPER_ADMIN");
    repository.findStaff.mockResolvedValue({ ...staffRecord, id: "actor-1" });
    await expect(
      service.update("session", "actor-1", {
        status: "SUSPENDED",
        reason: "Attempted self suspension",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("requires a super administrator for critical permission overrides", async () => {
    const { service, repository } = setup("ADMIN");
    repository.findPermissions.mockResolvedValue([
      { id: "perm-documents-view", key: "documents.view", isCritical: true },
    ]);
    await expect(
      service.replaceOverrides("session", "staff-2", {
        overrides: [{ permissionKey: "documents.view", allowed: true }],
        reason: "Temporary document review duty",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("StaffAccessService", () => {
  it("lets an explicit deny override an inherited role permission", async () => {
    const repository = {
      permissionAccess: vi.fn().mockResolvedValue({
        permissionOverrides: [{ allowed: false }],
        staffRole: { permissions: [{ permissionId: "permission-1" }] },
      }),
    };
    const access = new StaffAccessService(repository as never);
    await expect(
      access.require(
        {
          user: {
            id: "staff-2",
            role: "SALES",
            email: "",
            phone: "",
            fullName: "",
            preferredLocale: "en",
            status: "ACTIVE",
            emailVerified: true,
            phoneVerified: true,
          },
          expiresAt: new Date().toISOString(),
        },
        "documents.view",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
