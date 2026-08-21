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
    resetAccess: vi.fn().mockResolvedValue(staffRecord),
    replaceOverrides: vi.fn().mockResolvedValue(staffRecord),
    replaceRolePermissions: vi.fn(),
    permissionAccess: vi.fn().mockResolvedValue({
      permissionOverrides: [],
      staffRole: { permissions: [{ permissionId: "staff-manage" }] },
    }),
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

  it("lets an administrator issue audited temporary access for sales", async () => {
    const { service, repository, passwords } = setup("ADMIN");
    await expect(
      service.resetAccess("session", "staff-2", {
        temporaryPassword: "Temporary-456",
        reason: "Sales employee requested recovery",
      }),
    ).resolves.toMatchObject({ id: "staff-2" });
    expect(passwords.hash).toHaveBeenCalledWith("Temporary-456");
    expect(repository.resetAccess).toHaveBeenCalledWith(
      "staff-2",
      "safe-hash",
      expect.objectContaining({ actorId: "actor-1" }),
    );
  });
});

describe("StaffAccessService", () => {
  const session = (role: "CUSTOMER" | "SALES" | "ADMIN" | "SUPER_ADMIN") => ({
    user: {
      id: "staff-2",
      role,
      email: "",
      phone: "",
      fullName: "",
      preferredLocale: "en" as const,
      status: "ACTIVE" as const,
      emailVerified: true,
      mfaEnabled: true,
      securityAction: null,
    },
    expiresAt: new Date().toISOString(),
  });

  it("lets an explicit deny override an inherited role permission", async () => {
    const repository = {
      permissionAccess: vi.fn().mockResolvedValue({
        permissionOverrides: [{ allowed: false }],
        staffRole: { permissions: [{ permissionId: "permission-1" }] },
      }),
    };
    const access = new StaffAccessService(repository as never);
    await expect(access.require(session("SALES"), "documents.view")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("lets administrators manage sales staff while super administrators retain critical access", async () => {
    const repository = {
      permissionAccess: vi.fn().mockResolvedValue({
        permissionOverrides: [],
        staffRole: { permissions: [] },
      }),
    };
    const access = new StaffAccessService(repository as never);

    await expect(access.require(session("ADMIN"), "reservations.review")).resolves.toBeUndefined();
    await expect(access.require(session("ADMIN"), "staff.manage")).resolves.toBeUndefined();
    await expect(access.require(session("SUPER_ADMIN"), "staff.manage")).resolves.toBeUndefined();
  });

  it("never grants a staff API permission to a customer", async () => {
    const repository = { permissionAccess: vi.fn() };
    const access = new StaffAccessService(repository as never);
    await expect(access.require(session("CUSTOMER"), "reservations.view")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.permissionAccess).not.toHaveBeenCalled();
  });
});
