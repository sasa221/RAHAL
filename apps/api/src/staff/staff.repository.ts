import { Injectable } from "@nestjs/common";
import type { StaffPermissionKey } from "@rahal/contracts";
import type { Prisma } from "@rahal/database";
import { PrismaService } from "../database/prisma.service";

const staffSelect = {
  id: true,
  email: true,
  phone: true,
  fullNameAr: true,
  fullNameEn: true,
  systemRole: true,
  status: true,
  preferredLocale: true,
  staffRoleId: true,
  createdAt: true,
  updatedAt: true,
  staffRole: {
    select: {
      id: true,
      name: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  },
  permissionOverrides: {
    select: {
      allowed: true,
      reason: true,
      permission: { select: { key: true } },
    },
  },
  sessions: {
    where: { status: "ACTIVE" as const },
    orderBy: { lastSeenAt: "desc" as const },
    take: 1,
    select: { lastSeenAt: true },
  },
} as const;

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [staff, roles, permissions, recentAudit] = await Promise.all([
      this.prisma.client.user.findMany({
        where: { systemRole: { in: ["SALES", "ADMIN", "SUPER_ADMIN"] } },
        orderBy: [{ status: "asc" }, { fullNameEn: "asc" }],
        select: staffSelect,
      }),
      this.prisma.client.staffRole.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          isSystem: true,
          _count: { select: { users: true } },
          permissions: { select: { permission: { select: { key: true } } } },
        },
      }),
      this.prisma.client.permission.findMany({
        orderBy: [{ category: "asc" }, { key: "asc" }],
        select: { id: true, key: true, category: true, description: true, isCritical: true },
      }),
      this.prisma.client.auditLog.findMany({
        where: {
          OR: [
            { action: { startsWith: "STAFF_" } },
            { entityType: { in: ["STAFF_ROLE", "PERMISSION"] } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          reason: true,
          succeeded: true,
          createdAt: true,
          actor: { select: { fullNameEn: true, fullNameAr: true, systemRole: true } },
        },
      }),
    ]);
    return { staff, roles, permissions, recentAudit };
  }

  findStaff(id: string) {
    return this.prisma.client.user.findFirst({
      where: { id, systemRole: { in: ["SALES", "ADMIN", "SUPER_ADMIN"] } },
      select: staffSelect,
    });
  }

  findRole(id: string) {
    return this.prisma.client.staffRole.findUnique({
      where: { id },
      select: { id: true, name: true, isSystem: true },
    });
  }

  findPermissions(keys: StaffPermissionKey[]) {
    return this.prisma.client.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true, isCritical: true },
    });
  }

  createStaff(
    data: {
      email: string;
      phone: string;
      passwordHash: string;
      fullNameAr?: string;
      fullNameEn: string;
      preferredLocale: "ar" | "en";
      systemRole: "SALES" | "ADMIN";
      staffRoleId: string | null;
    },
    audit: { actorId: string; reason: string },
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          ...data,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
          mustChangePassword: true,
          temporaryPasswordIssuedAt: new Date(),
        },
        select: staffSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId: audit.actorId,
          action: "STAFF_CREATE",
          entityType: "USER",
          entityId: user.id,
          reason: audit.reason,
          newData: {
            systemRole: user.systemRole,
            status: user.status,
            staffRoleId: user.staffRoleId,
          },
        },
      });
      return user;
    });
  }

  updateStaff(
    id: string,
    data: {
      fullNameAr?: string | null;
      fullNameEn?: string;
      preferredLocale?: "ar" | "en";
      systemRole?: "SALES" | "ADMIN";
      status?: "ACTIVE" | "SUSPENDED" | "BLOCKED";
      staffRoleId?: string | null;
    },
    audit: { actorId: string; reason: string; previousData: Prisma.InputJsonValue },
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      const user = await transaction.user.update({ where: { id }, data, select: staffSelect });
      if (data.status || data.systemRole || data.staffRoleId !== undefined) {
        await transaction.session.updateMany({
          where: { userId: id, status: "ACTIVE" },
          data: { status: "REVOKED", revokedAt: new Date() },
        });
      }
      await transaction.auditLog.create({
        data: {
          actorId: audit.actorId,
          action: "STAFF_UPDATE",
          entityType: "USER",
          entityId: id,
          reason: audit.reason,
          previousData: audit.previousData,
          newData: {
            systemRole: user.systemRole,
            status: user.status,
            staffRoleId: user.staffRoleId,
          },
        },
      });
      return user;
    });
  }

  replaceOverrides(
    userId: string,
    overrides: Array<{ permissionId: string; allowed: boolean; reason: string }>,
    audit: { actorId: string; reason: string; previousData: Prisma.InputJsonValue },
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.userPermissionOverride.deleteMany({ where: { userId } });
      if (overrides.length) {
        await transaction.userPermissionOverride.createMany({
          data: overrides.map((override) => ({ userId, ...override })),
        });
      }
      await transaction.session.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: audit.actorId,
          action: "STAFF_PERMISSIONS_REPLACE",
          entityType: "USER",
          entityId: userId,
          reason: audit.reason,
          previousData: audit.previousData,
          newData: { overrideCount: overrides.length },
        },
      });
      return transaction.user.findUniqueOrThrow({ where: { id: userId }, select: staffSelect });
    });
  }

  replaceRolePermissions(
    roleId: string,
    permissionIds: string[],
    audit: { actorId: string; reason: string; previousKeys: string[] },
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.staffRolePermission.deleteMany({ where: { staffRoleId: roleId } });
      if (permissionIds.length) {
        await transaction.staffRolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ staffRoleId: roleId, permissionId })),
        });
      }
      const affected = await transaction.user.findMany({
        where: { staffRoleId: roleId },
        select: { id: true },
      });
      await transaction.session.updateMany({
        where: { userId: { in: affected.map((user) => user.id) }, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: audit.actorId,
          action: "STAFF_ROLE_PERMISSIONS_REPLACE",
          entityType: "STAFF_ROLE",
          entityId: roleId,
          reason: audit.reason,
          previousData: { permissionKeys: audit.previousKeys },
          newData: { permissionCount: permissionIds.length },
        },
      });
    });
  }

  permissionAccess(userId: string, key: StaffPermissionKey) {
    return this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        permissionOverrides: {
          where: { permission: { key } },
          select: { allowed: true },
          take: 1,
        },
        staffRole: {
          select: {
            permissions: {
              where: { permission: { key } },
              select: { permissionId: true },
              take: 1,
            },
          },
        },
      },
    });
  }
}
