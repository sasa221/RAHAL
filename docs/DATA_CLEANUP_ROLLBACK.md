# Demo-data cleanup and rollback plan

The Task 13 script is prepared and defaults to a read-only preview. It has not been executed.

1. Run `pnpm data:cleanup:preview`; this executes a read-only candidate query and prints every row
   as `DELETE` or `RETAIN`. It never creates a backup or starts a mutation transaction.
2. Review candidate IDs against the final delivery report. Never select by broad dates or roles.
3. Choose a new backup filename outside the repository. The script creates a custom-format backup
   and validates its table of contents with `pg_restore --list` before starting cleanup. It uses
   local PostgreSQL tools when available or the healthy local Docker `postgres` service.
4. Final execution requires `-Execute`, an explicit backup path and the phrase
   `DELETE RAHAL DEMO DATA`. Non-local databases additionally require `-AllowProduction`.
5. Only after owner approval, use `-Execute` with the exact confirmation phrase. The script removes
   explicitly prefixed demo reservations that have no Booking or Contract, their related
   notifications/outbox rows, and only test users that own no protected business or audit history.
   Protected rows are listed as `RETAIN`. Any SQL failure rolls back the transaction.

Rollback rehearsal:

- stop application writes;
- restore the custom-format backup into a new database, never over the only copy;
- run migrations and integrity counts against the restored database;
- switch the application only after reservations, bookings, documents, audit and users reconcile;
- retain the original database until the post-restore acceptance suite passes.

No cleanup or backup command is part of the regular build, test or deployment scripts.
