# RAHAL deployment and rollback runbook

This runbook is the production release procedure. It does not authorize a release while a blocker in `RELEASE_READINESS.md` is open.

## Required platform shape

- The web and API are deployed as separate services from `Dockerfile.web` and `Dockerfile.api`, or equivalent managed runtimes.
- PostgreSQL, Redis, and private S3-compatible object storage are managed production services. They must not use the local Docker Compose credentials.
- TLS terminates before both services. `WEB_URL`, the public API route, storage endpoint, scanner endpoint, Redis, and provider callbacks use encrypted transport.
- All values from `.env.example` are supplied by the hosting secret manager. `API_URL` is read by the web server at runtime. Production secrets are never stored in Git, image layers, CI logs, or browser variables.

## Public staging boundary

- `RAHAL_RELEASE_TIER=staging` is allowed only for a public acceptance environment running with `NODE_ENV=production`, HTTPS, secure cookies, managed PostgreSQL, managed TLS Redis, and unique secrets.
- Missing WhatsApp, private S3, or malware-scanning providers remain unavailable at their feature boundaries. Document upload must return unavailable, phone delivery must not expose a local OTP, and dependency readiness must not claim the environment is production-ready.
- Vercel deployments set `RAHAL_BACKGROUND_JOB_MODE=request` and a random `CRON_SECRET` of at
  least 32 characters. The daily cron calls `/api/internal/jobs/run`; mutation requests await a
  bounded outbox drain so customer-facing delivery does not depend on a frozen timer.
- Optional staging WhatsApp verification uses `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and
  `TWILIO_VERIFY_SERVICE_SID`. Never configure an appointment-reminder Content SID as an OTP
  template. Meta Cloud API credentials and approved templates remain required for production
  WhatsApp notifications.
- `RAHAL_RELEASE_TIER=production` is the default and retains the full fail-closed startup gate for every required external provider.
- Never promote or describe a staging-tier deployment as the approved production launch.

## Preflight

1. Confirm the exact Git commit and a clean worktree.
2. Confirm legal, branch, fleet, provider, privacy, retention, and launch approvals in `RELEASE_READINESS.md`.
3. From a clean checkout run:
   - `pnpm install --frozen-lockfile`
   - `pnpm format:check`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm exec playwright install chromium`
   - `pnpm test:e2e`
   - `pnpm audit`
4. Build both container targets and scan the images and dependency lockfile with the approved platform scanners.
5. Verify that a current database backup and object-storage recovery point exist.
6. Deploy the same images and configuration shape to staging.
7. Apply migrations with `pnpm db:migrate` as a one-off release job.
8. Run the complete customer, sales, and administrator acceptance journeys in staging on mobile and desktop.

## Production release

1. Put the release in the change calendar and identify one release owner and one rollback owner.
2. Confirm provider and database dashboards are healthy.
3. Apply database migrations once. Do not run application replicas as migration workers.
4. Deploy the API and wait for:
   - `/api/health/live` to return HTTP 200.
   - `/api/health/ready` to return HTTP 200 with the database marked ready.
5. Deploy the web service and verify both Arabic and English home, fleet, authentication, and policy routes.
6. Run a non-destructive smoke journey:
   - public availability read;
   - customer authentication and notification read;
   - administrator operations read;
   - sales queue read using a staging/smoke request specifically approved for production testing.
7. Monitor HTTP 5xx, readiness, latency, failed notification deliveries, database connections, Redis errors, scanner failures, and object-storage errors during the release window.

## Rollback

1. Stop further rollout and preserve logs and request IDs.
2. Roll back web and API images to the last known-good immutable image digest.
3. Do not reverse a database migration unless its reviewed migration plan explicitly supports reversal. Prefer forward-compatible application rollback and a corrective migration.
4. If data integrity is affected, put mutations into maintenance mode at the edge, preserve evidence, and follow `BACKUP_RESTORE_RUNBOOK.md`.
5. Re-run live/readiness and the non-destructive smoke journey.
6. Record the incident, impacted request IDs, remediation, and final owner decision in the operational audit.

## Release evidence

Keep the commit hash, image digests, migration output, verification command results, staging E2E report, accessibility/performance report, backup identifier, release timestamps, and approver names together. Never attach environment values, access tokens, identity documents, or full customer records.
