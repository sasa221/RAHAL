import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthSession, StaffPermissionKey } from "@rahal/contracts";
import { StaffRepository } from "./staff.repository";
import { systemRoleAllows } from "./staff-role-matrix";

@Injectable()
export class StaffAccessService {
  constructor(private readonly staff: StaffRepository) {}

  async require(session: AuthSession, permission: StaffPermissionKey) {
    if (await this.allows(session, permission)) return;
    if (session.user.role === "CUSTOMER")
      throw new ForbiddenException("A Rahal staff account is required.");
    throw new ForbiddenException(`The '${permission}' permission is required.`);
  }

  async allows(session: AuthSession, permission: StaffPermissionKey) {
    if (session.user.role === "SUPER_ADMIN") return true;
    if (session.user.role === "CUSTOMER") return false;
    const access = await this.staff.permissionAccess(session.user.id, permission);
    const override = access?.permissionOverrides[0];
    return override
      ? override.allowed
      : systemRoleAllows(session.user.role, permission) ||
          Boolean(access?.staffRole?.permissions.length);
  }
}
