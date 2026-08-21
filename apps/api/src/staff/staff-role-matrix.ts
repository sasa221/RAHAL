import type { StaffPermissionKey } from "@rahal/contracts";

export const ADMIN_BASE_PERMISSIONS = new Set<StaffPermissionKey>([
  "reservations.view",
  "reservations.review",
  "documents.view",
  "documents.review",
  "deposits.record",
  "bookings.confirm",
  "bookings.operate",
  "fleet.view",
  "fleet.manage",
  "vehicles.manage",
  "content.edit",
  "branches.view",
  "branches.edit",
  "branches.create",
  "branches.disable",
  "notifications.send",
  "audit.view",
  "staff.manage",
]);

export const SUPER_ADMIN_PERMISSIONS = new Set<StaffPermissionKey>([
  ...ADMIN_BASE_PERMISSIONS,
  "content.publish",
  "branches.delete",
]);

export function systemRoleAllows(
  role: "CUSTOMER" | "SALES" | "ADMIN" | "SUPER_ADMIN",
  permission: StaffPermissionKey,
) {
  if (role === "SUPER_ADMIN") return SUPER_ADMIN_PERMISSIONS.has(permission);
  if (role === "ADMIN") return ADMIN_BASE_PERMISSIONS.has(permission);
  return false;
}
