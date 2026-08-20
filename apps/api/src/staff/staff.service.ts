import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { StaffAdminOverview, StaffMember, StaffPermissionKey } from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import { PasswordService } from "../auth/password.service";
import type {
  CreateStaffDto,
  ResetStaffAccessDto,
  UpdateRolePermissionsDto,
  UpdateStaffDto,
  UpdateStaffPermissionsDto,
} from "./staff.dto";
import { StaffRepository } from "./staff.repository";

@Injectable()
export class StaffService {
  constructor(
    private readonly auth: AuthService,
    private readonly passwords: PasswordService,
    private readonly staff: StaffRepository,
  ) {}

  async overview(token: string | undefined): Promise<StaffAdminOverview> {
    const session = await this.requireManager(token);
    const data = await this.staff.overview();
    return {
      staff: data.staff.map(toStaffMember),
      roles: data.roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        staffCount: role._count.users,
        permissionKeys: role.permissions.map(
          ({ permission }) => permission.key as StaffPermissionKey,
        ),
      })),
      permissions: data.permissions.map((permission) => ({
        ...permission,
        key: permission.key as StaffPermissionKey,
      })),
      recentAudit: data.recentAudit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorName: entry.actor?.fullNameEn ?? "System",
        actorRole: entry.actor?.systemRole ?? null,
        reason: entry.reason,
        succeeded: entry.succeeded,
        createdAt: entry.createdAt.toISOString(),
      })),
      capabilities: {
        canManageAdmins: session.user.role === "SUPER_ADMIN",
        canManageRolePermissions: session.user.role === "SUPER_ADMIN",
      },
    };
  }

  async create(token: string | undefined, input: CreateStaffDto): Promise<StaffMember> {
    const session = await this.requireManager(token);
    if (input.systemRole === "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("Only a super administrator can create administrators.");
    }
    const role = input.staffRoleId ? await this.staff.findRole(input.staffRoleId) : null;
    if (input.staffRoleId && !role) throw new NotFoundException("The staff role was not found.");
    try {
      return toStaffMember(
        await this.staff.createStaff(
          {
            email: input.email.trim().toLowerCase(),
            phone: normalizePhone(input.phone),
            passwordHash: await this.passwords.hash(input.temporaryPassword),
            fullNameAr: input.fullNameAr?.trim() || undefined,
            fullNameEn: input.fullNameEn.trim(),
            preferredLocale: input.preferredLocale,
            systemRole: input.systemRole,
            staffRoleId: input.staffRoleId ?? null,
          },
          { actorId: session.user.id, reason: input.reason.trim() },
        ),
      );
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException("A user already uses that email or phone number.");
      }
      throw error;
    }
  }

  async update(token: string | undefined, id: string, input: UpdateStaffDto): Promise<StaffMember> {
    const session = await this.requireManager(token);
    const target = await this.requireManageableTarget(session.user.id, session.user.role, id);
    if (
      (target.systemRole === "ADMIN" || input.systemRole === "ADMIN") &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      throw new ForbiddenException("Only a super administrator can manage administrators.");
    }
    if (input.staffRoleId && !(await this.staff.findRole(input.staffRoleId))) {
      throw new NotFoundException("The staff role was not found.");
    }
    try {
      return toStaffMember(
        await this.staff.updateStaff(
          id,
          {
            ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
            ...(input.fullNameAr !== undefined
              ? { fullNameAr: input.fullNameAr.trim() || null }
              : {}),
            ...(input.fullNameEn ? { fullNameEn: input.fullNameEn.trim() } : {}),
            ...(input.preferredLocale ? { preferredLocale: input.preferredLocale } : {}),
            ...(input.systemRole ? { systemRole: input.systemRole } : {}),
            ...(input.status ? { status: input.status } : {}),
            ...(input.staffRoleId !== undefined ? { staffRoleId: input.staffRoleId || null } : {}),
          },
          {
            actorId: session.user.id,
            reason: input.reason.trim(),
            previousData: staffAuditSnapshot(target),
          },
        ),
      );
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException("A user already uses that email or phone number.");
      }
      throw error;
    }
  }

  async resetAccess(
    token: string | undefined,
    id: string,
    input: ResetStaffAccessDto,
  ): Promise<StaffMember> {
    const session = await this.requireManager(token);
    const target = await this.requireManageableTarget(session.user.id, session.user.role, id);
    if (target.systemRole === "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("Only a super administrator can reset administrator access.");
    }
    return toStaffMember(
      await this.staff.resetAccess(id, await this.passwords.hash(input.temporaryPassword), {
        actorId: session.user.id,
        reason: input.reason.trim(),
      }),
    );
  }

  async replaceOverrides(
    token: string | undefined,
    id: string,
    input: UpdateStaffPermissionsDto,
  ): Promise<StaffMember> {
    const session = await this.requireManager(token);
    const target = await this.requireManageableTarget(session.user.id, session.user.role, id);
    if (target.systemRole !== "SALES") {
      throw new ConflictException("Permission overrides apply only to sales employees.");
    }
    const keys = [...new Set(input.overrides.map((override) => override.permissionKey))];
    if (keys.length !== input.overrides.length) {
      throw new ConflictException("Each permission can have only one override.");
    }
    const permissions = await this.staff.findPermissions(keys);
    if (permissions.length !== keys.length) {
      throw new NotFoundException("One or more permissions were not found.");
    }
    if (
      permissions.some((permission) => permission.isCritical) &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      throw new ForbiddenException("Only a super administrator can override critical permissions.");
    }
    const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission]));
    return toStaffMember(
      await this.staff.replaceOverrides(
        id,
        input.overrides.map((override) => ({
          permissionId: permissionByKey.get(override.permissionKey)!.id,
          allowed: override.allowed,
          reason: input.reason.trim(),
        })),
        {
          actorId: session.user.id,
          reason: input.reason.trim(),
          previousData: {
            overrides: target.permissionOverrides.map(({ permission, allowed }) => ({
              key: permission.key,
              allowed,
            })),
          },
        },
      ),
    );
  }

  async replaceRolePermissions(
    token: string | undefined,
    roleId: string,
    input: UpdateRolePermissionsDto,
  ) {
    const session = await this.requireManager(token);
    if (session.user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("Only a super administrator can change role permissions.");
    }
    const overview = await this.staff.overview();
    const role = overview.roles.find((candidate) => candidate.id === roleId);
    if (!role) throw new NotFoundException("The staff role was not found.");
    const keys = [...new Set(input.permissionKeys)];
    if (keys.length !== input.permissionKeys.length) {
      throw new ConflictException("Role permissions cannot contain duplicates.");
    }
    const permissions = await this.staff.findPermissions(keys);
    if (permissions.length !== keys.length) {
      throw new NotFoundException("One or more permissions were not found.");
    }
    await this.staff.replaceRolePermissions(
      roleId,
      permissions.map((permission) => permission.id),
      {
        actorId: session.user.id,
        reason: input.reason.trim(),
        previousKeys: role.permissions.map(({ permission }) => permission.key),
      },
    );
    return this.overview(token);
  }

  private async requireManager(token: string | undefined) {
    const session = await this.auth.getSession(token);
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      throw new ForbiddenException("Only administrators can manage Rahal staff.");
    }
    return session;
  }

  private async requireManageableTarget(actorId: string, actorRole: string, id: string) {
    const target = await this.staff.findStaff(id);
    if (!target) throw new NotFoundException("The staff account was not found.");
    if (target.id === actorId) {
      throw new ConflictException("Use account security settings to change your own access.");
    }
    if (target.systemRole === "SUPER_ADMIN") {
      throw new ForbiddenException("Super administrator access cannot be changed here.");
    }
    if (target.systemRole === "ADMIN" && actorRole !== "SUPER_ADMIN") {
      throw new ForbiddenException("Only a super administrator can manage administrators.");
    }
    return target;
  }
}

function normalizePhone(value: string) {
  return value.replace(/[\s()-]/g, "");
}

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function staffAuditSnapshot(staff: {
  systemRole: string;
  status: string;
  staffRoleId: string | null;
}) {
  return {
    systemRole: staff.systemRole,
    status: staff.status,
    staffRoleId: staff.staffRoleId,
  };
}

function toStaffMember(record: {
  id: string;
  email: string;
  phone: string;
  fullNameAr: string | null;
  fullNameEn: string;
  systemRole: "CUSTOMER" | "SALES" | "ADMIN" | "SUPER_ADMIN";
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED";
  preferredLocale: string;
  staffRoleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  staffRole: {
    name: string;
    permissions: Array<{ permission: { key: string } }>;
  } | null;
  permissionOverrides: Array<{
    allowed: boolean;
    reason: string;
    permission: { key: string };
  }>;
  sessions: Array<{ lastSeenAt: Date }>;
}): StaffMember {
  const permissions = new Set(
    record.staffRole?.permissions.map(({ permission }) => permission.key as StaffPermissionKey) ??
      [],
  );
  for (const override of record.permissionOverrides) {
    if (override.allowed) permissions.add(override.permission.key as StaffPermissionKey);
    else permissions.delete(override.permission.key as StaffPermissionKey);
  }
  return {
    id: record.id,
    fullNameAr: record.fullNameAr,
    fullNameEn: record.fullNameEn,
    email: record.email,
    phone: record.phone,
    systemRole: record.systemRole as StaffMember["systemRole"],
    status: record.status,
    preferredLocale: record.preferredLocale === "en" ? "en" : "ar",
    staffRoleId: record.staffRoleId,
    staffRoleName: record.staffRole?.name ?? null,
    effectivePermissionKeys: [...permissions].sort(),
    permissionOverrides: record.permissionOverrides.map((override) => ({
      permissionKey: override.permission.key as StaffPermissionKey,
      allowed: override.allowed,
      reason: override.reason,
    })),
    lastSeenAt: record.sessions[0]?.lastSeenAt.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
