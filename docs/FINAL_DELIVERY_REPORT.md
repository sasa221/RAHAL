# RAHAL local delivery review

Date: 2026-08-21
Scope: Tasks 1–14 local acceptance
State: review-ready; no deployment, commit, backup execution, or data cleanup was performed.

## Completed in Tasks 11–12

- Added the final interaction inventory for public, customer, reservation, sales, administrator,
  and shared-shell controls. The runtime audit records buttons, links, forms, tabs, filters, uploads,
  and exports for every protected route, rejects unnamed or obstructed controls, follows internal
  links under the active role, and runs on mobile and desktop.
- Added functional checks for native validation, network failure, input preservation, duplicate
  request locking, CSV export, dialog focus/Escape, and real filter URLs.
- Corrected the administrator staff boundary: administrators can manage sales staff, while
  administrator accounts, critical permissions, and role-permission changes remain restricted to
  super administrators.
- Removed original customer-document filenames from customer-facing API projections and retained
  only private server metadata. Storage keys are never returned.
- Enforced ownership and staff assignment on protected preview, recorded successful and failed
  document access, and verified that no public GET/download route exists.
- Enforced file signatures, MIME types, size limits, transactional metadata, delete audit, and
  bounded private-S3 retries.
- Added `RAHAL_PROTECTED_DOCUMENT_UPLOADS_ENABLED`. Delivery environments without approved private
  S3 and malware scanning expose a clear unavailable state and reject writes on the server. The UI
  tells users not to send identity documents through email or WhatsApp.
- Document upload inputs preserve the selected file after a recoverable failure and lock duplicate
  writes. Removal requires explicit confirmation.

## Task 13 prepared, not executed

- `scripts/cleanup-demo-data.ps1` defaults to dry-run, refuses non-local targets unless explicitly
  authorized, requires an exact confirmation phrase, refuses to overwrite a backup, and creates a
  custom-format PostgreSQL backup before any approved mutation.
- Cleanup scope is limited to explicit E2E/demo prefixes. Its read-only preview lists exact
  `DELETE` and `RETAIN` rows. It removes only reservations without a Booking or Contract and does
  not delete users that retain protected business, operations, communication, or audit history.
- Backup creation and `pg_restore --list` validation support either installed PostgreSQL tools or
  the healthy local Docker `postgres` service; cleanup cannot start if validation fails.
- Recovery and restore verification are documented in `docs/DATA_CLEANUP_ROLLBACK.md`.
- Only the preview path was exercised. No backup or cleanup transaction was run.

## Task 14 verification

| Command             | Exact result                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm format:check` | passed                                                                                    |
| `pnpm lint`         | passed                                                                                    |
| `pnpm test`         | 74 files passed; 395 tests passed                                                         |
| `pnpm typecheck`    | all six workspace projects passed; Prisma schema valid                                    |
| `pnpm build`        | passed; web generated 77 routes                                                           |
| `pnpm test:e2e`     | 249 passed; 1 intentionally skipped desktop-only non-applicable mobile-nav case; 0 failed |

The E2E run includes customer, sales, administrator, and super-administrator roles; Arabic RTL and
English LTR; mobile and desktop viewports; public and authenticated routes; reservation lifecycle;
competing sales claim lock; administration oversight; branch confirmation, deposit, delivery,
return and completion; cancellation and no-show; network failures; real prompts; keyboard/focus;
dashboard database values; protected documents; content; branches; and visual captures.

## Deferred production dependencies

- Private S3-compatible object storage and an approved malware-scanning service. Protected document
  uploads remain intentionally disabled in delivery until both are configured and verified.
- Approved real fleet, branch contact/location/hours, and legal-policy content.
- Production notification credentials and provider approvals for email, push, and any future
  external channel. WhatsApp remains manual branch `wa.me` contact only in the application flow.
- Production monitoring, alert routing, backup schedule, and a restore rehearsal.
- Data cleanup execution, production deployment, and Git commit require the owner's separate final
  approval.

## Legacy migrations and fallback

- `20260821090000_email_only_verification`: keeps historical WhatsApp/phone fields readable only for
  migration compatibility; runtime authentication and verification flows do not use them.
- `20260821113000_typed_site_content`: migrates legacy generic content into typed schemas and keeps a
  temporary read fallback for records not yet republished.
- `20260821152000_structured_branch_management`: adds structured address, coordinates, phones,
  hours, services, manager, and publishing fields while retaining existing branch data.
- `ReservationDocument.originalName` remains private database metadata for operations/audit but is
  intentionally absent from browser/API projections.

## Files introduced for this acceptance batch

- `docs/INTERACTION_INVENTORY.md`
- `docs/DATA_CLEANUP_ROLLBACK.md`
- `docs/FINAL_DELIVERY_REPORT.md`
- `scripts/cleanup-demo-data.ps1`
- `tests/e2e/functional-interactions.spec.ts`
- `tests/e2e/document-security.spec.ts`
- `tests/e2e/interaction-audit.spec.ts`

Supporting changes were made in API configuration, reservation/document services and tests,
private storage and tests, contracts, customer and sales document UI, fleet filter behavior, staff
authorization and tests, global responsive prompt CSS, root test scripts, and `.env.example`.
