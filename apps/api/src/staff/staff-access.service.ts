import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthSession, StaffPermissionKey } from "@rahal/contracts";
import { StaffRepository } from "./staff.repository";

@Injectable()
export class StaffAccessService {
  constructor(private readonly staff: StaffRepository) {}

  async require(session: AuthSession, permission: StaffPermissionKey) {
    if (session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN") return;
    if (session.user.role !== "SALES") {
      throw new ForbiddenException("A Rahal staff account is required.");
    }
    const access = await this.staff.permissionAccess(session.user.id, permission);
    const override = access?.permissionOverrides[0];
    const allowed = override ? override.allowed : Boolean(access?.staffRole?.permissions.length);
    if (!allowed) {
      throw new ForbiddenException(`The '${permission}' permission is required.`);
    }
  }
}
