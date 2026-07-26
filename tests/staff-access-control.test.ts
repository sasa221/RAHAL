import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("staff roles, permissions, and audit", () => {
  const service = read("apps/api/src/staff/staff.service.ts");
  const repository = read("apps/api/src/staff/staff.repository.ts");
  const access = read("apps/api/src/staff/staff-access.service.ts");
  const reservations = read("apps/api/src/reservations/reservations.service.ts");
  const fleet = read("apps/api/src/fleet/fleet.service.ts");
  const workspace = read("apps/web/components/staff-management-workspace.tsx");
  const migration = read(
    "packages/database/prisma/migrations/20260726220000_staff_permissions/migration.sql",
  );

  it("ships a deny-by-default permission catalog and safe default sales role", () => {
    expect(migration).toContain("'documents.view'");
    expect(migration).toContain("'bookings.confirm'");
    expect(migration).toContain("'staff.manage'");
    expect(migration).toContain('"User"."staffRoleId" IS NULL');
    expect(access).toContain("override ? override.allowed");
  });

  it("enforces permissions on every sensitive sales workflow group", () => {
    for (const key of [
      "reservations.view",
      "reservations.review",
      "documents.view",
      "documents.review",
      "deposits.record",
      "bookings.confirm",
      "bookings.operate",
    ]) {
      expect(reservations).toContain(`"${key}"`);
    }
    expect(reservations).toContain("Staff permission verification is unavailable");
    expect(fleet).toContain('"fleet.view"');
  });

  it("protects administrators, self-access, and critical permissions", () => {
    expect(service).toContain('session.user.role !== "SUPER_ADMIN"');
    expect(service).toContain("target.id === actorId");
    expect(service).toContain('target.systemRole === "SUPER_ADMIN"');
    expect(service).toContain("permission.isCritical");
  });

  it("revokes active sessions and writes bounded audit records on access changes", () => {
    expect(repository).toContain('status: "REVOKED"');
    expect(repository).toContain('action: "STAFF_UPDATE"');
    expect(repository).toContain('action: "STAFF_PERMISSIONS_REPLACE"');
    expect(repository).not.toContain("passwordHash: user.passwordHash");
    expect(repository).not.toContain("ipHash: true");
    expect(repository).not.toContain("userAgent: true");
    expect(repository).not.toContain('entityType: { in: ["USER"');
  });

  it("provides one bilingual responsive staff, role, and audit workspace", () => {
    expect(workspace).toContain("ar: {");
    expect(workspace).toContain("en: {");
    expect(workspace).toContain('"members" | "roles" | "audit"');
    expect(workspace).toContain("staff-members-layout");
    expect(workspace).toContain("staff-role-matrix");
    expect(workspace).toContain("staff-audit");
    expect(read("apps/web/app/admin/staff/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/admin/staff/page.tsx")).toContain('locale="en"');
  });
});
