-- Milestone 11 permission catalog and safe legacy sales-role assignment.
INSERT INTO "Permission" ("id", "key", "category", "description", "isCritical") VALUES
  ('perm-reservations-view', 'reservations.view', 'Reservations', 'View reservation queues', false),
  ('perm-reservations-review', 'reservations.review', 'Reservations', 'Review requests', false),
  ('perm-documents-view', 'documents.view', 'Documents', 'View protected documents', true),
  ('perm-documents-review', 'documents.review', 'Documents', 'Decide document reviews', true),
  ('perm-deposits-record', 'deposits.record', 'Branch', 'Record branch deposits', false),
  ('perm-bookings-confirm', 'bookings.confirm', 'Bookings', 'Confirm eligible bookings', true),
  ('perm-bookings-operate', 'bookings.operate', 'Bookings', 'Record delivery and return', false),
  ('perm-fleet-view', 'fleet.view', 'Fleet', 'View the private fleet calendar', false),
  ('perm-fleet-manage', 'fleet.manage', 'Fleet', 'Manage fleet blocks', false),
  ('perm-vehicles-manage', 'vehicles.manage', 'Fleet', 'Manage vehicle registry', false),
  ('perm-staff-manage', 'staff.manage', 'Administration', 'Manage staff accounts', true),
  ('perm-audit-view', 'audit.view', 'Administration', 'View audit records', true)
ON CONFLICT ("key") DO UPDATE SET
  "category" = EXCLUDED."category",
  "description" = EXCLUDED."description",
  "isCritical" = EXCLUDED."isCritical";

INSERT INTO "StaffRole" ("id", "name", "description", "isSystem", "createdAt", "updatedAt")
VALUES (
  'role-sales-agent',
  'Sales Agent',
  'Default operational sales role',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "isSystem" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "StaffRolePermission" ("staffRoleId", "permissionId")
SELECT role."id", permission."id"
FROM "StaffRole" role
JOIN "Permission" permission ON permission."key" IN (
  'reservations.view',
  'reservations.review',
  'documents.view',
  'documents.review',
  'deposits.record',
  'bookings.confirm',
  'bookings.operate',
  'fleet.view'
)
WHERE role."name" = 'Sales Agent'
ON CONFLICT ("staffRoleId", "permissionId") DO NOTHING;

UPDATE "User"
SET "staffRoleId" = role."id"
FROM "StaffRole" role
WHERE "User"."systemRole" = 'SALES'
  AND "User"."staffRoleId" IS NULL
  AND role."name" = 'Sales Agent';
