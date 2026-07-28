-- Existing staff sessions predate the MFA binding and must not survive rollout.
UPDATE "Session"
SET
  "status" = 'REVOKED',
  "revokedAt" = CURRENT_TIMESTAMP
WHERE
  "status" = 'ACTIVE'
  AND "userId" IN (
    SELECT "id"
    FROM "User"
    WHERE "systemRole" IN ('SALES', 'ADMIN', 'SUPER_ADMIN')
  );
