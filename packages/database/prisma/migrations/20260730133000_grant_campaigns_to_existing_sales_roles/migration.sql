-- Keep existing sales accounts usable after introducing the new granular permission.
UPDATE "User"
SET "staffRoleId" = role."id"
FROM "StaffRole" role
WHERE "User"."systemRole" = 'SALES'
  AND "User"."staffRoleId" IS NULL
  AND role."name" = 'Sales Agent';

INSERT INTO "StaffRolePermission" ("staffRoleId", "permissionId")
SELECT DISTINCT user_record."staffRoleId", permission."id"
FROM "User" user_record
CROSS JOIN "Permission" permission
WHERE user_record."systemRole" = 'SALES'
  AND user_record."staffRoleId" IS NOT NULL
  AND permission."key" = 'notifications.send'
ON CONFLICT ("staffRoleId", "permissionId") DO NOTHING;
