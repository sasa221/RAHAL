# RAHAL backup and restore runbook

The production owner must select and document exact retention periods after legal and privacy approval. This runbook defines the mechanism without guessing those periods.

## Backup coverage

- PostgreSQL: encrypted automated snapshots plus point-in-time recovery where the provider supports it.
- Private object storage: encryption, versioning, restricted service credentials, and lifecycle rules aligned with the approved document-retention policy.
- Redis: treated as disposable coordination state. Authentication throttles may reset during a disaster recovery event; the API must remain protected at the edge while Redis recovers.
- Secrets: recovered from the hosting secret manager, never from database or filesystem backups.

## Daily verification

1. Confirm the latest database snapshot completed and is inside the approved recovery-point objective.
2. Confirm object versioning/lifecycle jobs have no failures.
3. Confirm backup encryption and access audit logs are healthy.
4. Alert the operations owner when any check misses its objective.

## Restore drill

Run a scheduled restore drill in an isolated account/network:

1. Create an empty PostgreSQL target and an empty private object-storage bucket.
2. Restore the selected database recovery point.
3. Restore a bounded, synthetic object-storage sample without copying real customer documents into a lower-trust environment.
4. Apply any migrations newer than the recovery point.
5. Start the API with isolated secrets and confirm live/readiness.
6. Verify referential integrity, booking overlap constraints, role boundaries, and that missing private objects fail closed.
7. Record achieved recovery-point and recovery-time measurements.
8. Destroy the isolated drill environment according to the approved process.

## Command-line fallback

When a managed provider restore is unavailable, an authorized operator may use PostgreSQL tools with `DATABASE_URL` supplied only through the secure runtime:

- Logical backup: `pg_dump --format=custom --no-owner --no-acl --file=rahal.dump "$DATABASE_URL"`
- Isolated restore: `pg_restore --clean --if-exists --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL" rahal.dump`

The dump file is sensitive production data. It must be encrypted, access-limited, checksummed, logged, and removed through the approved secure-disposal process after verification.

## Incident restore

1. Declare the incident and freeze destructive mutations.
2. Select a recovery point before the damaging event and record the expected data-loss window.
3. Preserve the damaged database and logs for investigation.
4. Restore into a new target; never overwrite the only remaining copy.
5. Validate the restored target before redirecting traffic.
6. Rotate credentials exposed by the incident.
7. Reconcile notification deliveries and external provider callbacks so customers do not receive duplicate or contradictory messages.
8. Obtain the incident owner’s approval before reopening mutations.
