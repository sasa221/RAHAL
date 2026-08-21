param(
  [switch]$Execute,
  [string]$BackupPath = "",
  [string]$Confirmation = "",
  [switch]$AllowProduction
)

$ErrorActionPreference = "Stop"
$requiredConfirmation = "DELETE RAHAL DEMO DATA"
$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl -and (Test-Path -LiteralPath ".env")) {
  $databaseLine = Get-Content -LiteralPath ".env" | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
  if ($databaseLine) { $databaseUrl = ($databaseLine.Substring("DATABASE_URL=".Length)).Trim().Trim('"').Trim("'") }
}
if (-not $databaseUrl) { throw "DATABASE_URL is required." }

$database = [Uri]$databaseUrl
$isLocal = @("localhost", "127.0.0.1", "::1") -contains $database.Host
if (-not $isLocal -and -not $AllowProduction) {
  throw "Non-local cleanup is blocked. Review the dry-run and pass -AllowProduction explicitly."
}

$hostPsql = Get-Command psql -ErrorAction SilentlyContinue
$hostPgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$hostPgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
$dockerAvailable = $false
if ($isLocal -and (Get-Command docker -ErrorAction SilentlyContinue)) {
  & docker compose ps --status running --services 2>$null | ForEach-Object {
    if ($_ -eq "postgres") { $dockerAvailable = $true }
  }
}
if (-not $hostPsql -and -not $dockerAvailable) {
  throw "PostgreSQL tooling is unavailable. Install psql or start the local Docker postgres service."
}

function Invoke-DatabaseSql([string]$Sql) {
  if ($hostPsql) {
    $Sql | & $hostPsql.Source $databaseUrl --set ON_ERROR_STOP=1
  } else {
    $Sql | & docker compose exec -T postgres psql -U rahal -d rahal --set ON_ERROR_STOP=1
  }
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL command failed." }
}

$candidateSql = @'
WITH reservation_candidates AS (
  SELECT id, reference,
    NOT EXISTS (SELECT 1 FROM "Booking" b WHERE b."reservationId" = r.id)
    AND NOT EXISTS (SELECT 1 FROM "Contract" c WHERE c."reservationId" = r.id) AS removable
  FROM "Reservation" r
  WHERE reference LIKE 'RAHAL-E2E-%' OR reference LIKE 'RHL-DEMO-%'
), user_candidates AS (
  SELECT u.id, u.email,
    NOT EXISTS (SELECT 1 FROM "Reservation" r WHERE r."customerId" = u.id OR r."assignedSalesId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "Booking" b WHERE b."customerId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "BookingOperation" o WHERE o."actorId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "NotificationCampaign" c WHERE c."createdById" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."actorId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "InternalNote" n WHERE n."authorId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "CustomerMessage" m WHERE m."senderId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "DocumentAccessLog" d WHERE d."actorId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "ContractAccessLog" c WHERE c."actorId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "AlternativeOffer" o WHERE o."createdById" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "Contract" c WHERE c."recordedById" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b."managerId" = u.id)
    AND NOT EXISTS (SELECT 1 FROM "Review" r WHERE r."customerId" = u.id OR r."moderatedById" = u.id) AS removable
  FROM "User" u
  WHERE email LIKE '%@example.test' OR email LIKE '%@rahal.local'
)
SELECT CASE WHEN removable THEN 'DELETE reservation' ELSE 'RETAIN protected reservation' END AS action,
  reference AS identifier FROM reservation_candidates
UNION ALL
SELECT CASE WHEN removable THEN 'DELETE user' ELSE 'RETAIN referenced user' END, email FROM user_candidates
ORDER BY action, identifier;
'@

Write-Host "RAHAL cleanup preview (no data has been changed)"
Write-Host "Target host: $($database.Host)"
Invoke-DatabaseSql $candidateSql

if (-not $Execute) {
  Write-Host "DRY-RUN ONLY. Review the SQL, create a backup path, then use -Execute with the exact confirmation phrase."
  exit 0
}

if ($Confirmation -ne $requiredConfirmation) {
  throw "Execution requires -Confirmation '$requiredConfirmation'."
}
if (-not $BackupPath) { throw "Execution requires an explicit -BackupPath." }
if (Test-Path -LiteralPath $BackupPath) { throw "BackupPath already exists; refusing to overwrite it." }

if ($hostPgDump -and $hostPgRestore) {
  & $hostPgDump.Source --format=custom --file=$BackupPath $databaseUrl
  if ($LASTEXITCODE -eq 0) { & $hostPgRestore.Source --list $BackupPath | Out-Null }
} elseif ($dockerAvailable) {
  $containerBackup = "/tmp/rahal-cleanup-$([Guid]::NewGuid().ToString('N')).dump"
  & docker compose exec -T postgres pg_dump -U rahal -d rahal --format=custom --file=$containerBackup
  if ($LASTEXITCODE -eq 0) { & docker compose exec -T postgres pg_restore --list $containerBackup | Out-Null }
  if ($LASTEXITCODE -eq 0) { & docker compose cp "postgres:$containerBackup" $BackupPath }
  & docker compose exec -T postgres rm -f $containerBackup
} else {
  throw "pg_dump and pg_restore are required before cleanup."
}
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $BackupPath)) {
  throw "Backup creation or validation failed. Cleanup was not started."
}

$cleanupSql = @'
BEGIN;
CREATE TEMP TABLE cleanup_users AS
SELECT u.id FROM "User" u
WHERE (u.email LIKE '%@example.test' OR u.email LIKE '%@rahal.local')
  AND NOT EXISTS (SELECT 1 FROM "Reservation" r WHERE r."customerId" = u.id OR r."assignedSalesId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "Booking" b WHERE b."customerId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "BookingOperation" o WHERE o."actorId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "NotificationCampaign" c WHERE c."createdById" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."actorId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "InternalNote" n WHERE n."authorId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "CustomerMessage" m WHERE m."senderId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "DocumentAccessLog" d WHERE d."actorId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "ContractAccessLog" c WHERE c."actorId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "AlternativeOffer" o WHERE o."createdById" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "Contract" c WHERE c."recordedById" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b."managerId" = u.id)
  AND NOT EXISTS (SELECT 1 FROM "Review" r WHERE r."customerId" = u.id OR r."moderatedById" = u.id);
CREATE TEMP TABLE cleanup_reservations AS
SELECT r.id FROM "Reservation" r
WHERE (r.reference LIKE 'RAHAL-E2E-%' OR r.reference LIKE 'RHL-DEMO-%')
  AND NOT EXISTS (SELECT 1 FROM "Booking" b WHERE b."reservationId" = r.id)
  AND NOT EXISTS (SELECT 1 FROM "Contract" c WHERE c."reservationId" = r.id);

-- Reservation-owned rows use ON DELETE CASCADE. Notifications reference reservations without
-- cascading, so remove only notifications attached to the explicitly selected demo requests first.
DELETE FROM "Notification" WHERE "reservationId" IN (SELECT id FROM cleanup_reservations);
DELETE FROM "NotificationEvent"
WHERE "aggregateType" = 'RESERVATION' AND "aggregateId" IN (SELECT id FROM cleanup_reservations);
DELETE FROM "Reservation" WHERE id IN (SELECT id FROM cleanup_reservations);

-- A test user may still own immutable operational or audit history. Delete only users that no
-- longer participate in any business record; otherwise leave the account for the reviewed
-- anonymisation pass rather than weakening history or using CASCADE here.
DELETE FROM "User" WHERE id IN (SELECT id FROM cleanup_users);
COMMIT;
'@

try {
  Invoke-DatabaseSql $cleanupSql
} catch {
  throw "Cleanup failed and PostgreSQL rolled the transaction back. Keep the backup for review."
}
Write-Host "Approved demo-data cleanup completed. Preserve the backup until acceptance checks pass."
