# RAHAL Implementation Plan

## Phase order

1. Repository/tooling foundation and documentation.
2. Design system, localization, and public shell.
3. Database schema and migrations.
4. Authentication, verification, and session security.
5. Admin-managed vehicles, media, rules, and branch settings.
6. Public fleet listing, filtering, vehicle details, and availability.
7. Reservation wizard, draft saving, and protected document flow.
8. Sales review workflow, alternatives, deposit/contract recording, and booking confirmation.
9. Fleet calendar, maintenance, blocks, delivery/return, and completion.
10. Customer dashboard and history.
11. Staff, roles, permissions, and audit.
12. Notification outbox, push, email, and WhatsApp integrations.
13. Content management, reviews, and reports.
14. Security review, accessibility, performance, backups, and end-to-end testing.
15. Production deployment and operational monitoring.

## Immediate Section 26 outcome

Completed in this documentation pass:

- Inspected local files excluding dependency/build artifacts.
- Reported current repository state and conflicts in `docs/PROJECT_REQUIREMENTS.md`.
- Proposed final monorepo structure and dependency choices in `docs/ARCHITECTURE.md`.
- Produced the four required documents.
- Proposed the first implementation milestone below.

## Milestone 1: Foundation hardening

Goal: make the repo a dependable base for feature work before expanding product surface area.

### Scope

- Repair or replace mojibaked Arabic text in source/docs where the intended Arabic is known.
- Add `packages/config` with shared TypeScript, ESLint, and Prettier configuration.
- Add `packages/ui` with initial brand tokens and minimal reusable primitives.
- Add `packages/contracts` with shared API response and locale/status types.
- Add root scripts for lint, format, test, and clean build validation.
- Add Jest or Vitest for unit tests and Playwright scaffolding for later user journeys.
- Add typed environment validation for `apps/api`.
- Add consistent NestJS error handling and validation pipe.
- Add a simple API contract for demo vehicles instead of inline untyped literals.
- Add `design-reference/README.md` documenting the missing Stitch/logo/storefront assets and expected placement.
- Add `AGENTS.md` pointing future local sessions to `PROJECT_CONTEXT.md`.
- Update `.gitignore` to ignore generated Prisma client output, local build artifacts, and common environment files.

### Acceptance criteria

- `pnpm install` succeeds from a clean checkout.
- `pnpm typecheck` succeeds.
- `pnpm build` succeeds.
- A root `pnpm lint` command exists and passes.
- A root `pnpm test` command exists and passes at least smoke/unit tests.
- API health endpoint returns a proper JSON response under `/api/health`.
- Vehicle-not-found responses use a proper HTTP 404 shape.
- No source file contains hard-coded 2023/2024 demo dates or forbidden legacy content.
- The public web shell keeps Arabic RTL and English LTR routing intact.
- Documentation explains where design-reference assets belong.

### Tests

- API unit test for health response.
- API unit/integration test for vehicle list and 404 behavior.
- Web smoke test that Arabic home renders with `dir="rtl"`.
- Web smoke test that English home renders with `dir="ltr"`.
- Static check or test fixture for forbidden content patterns in source files.
- Typecheck and build in CI-compatible scripts.

## Milestone 2: Design system, localization, and public home

Goal: replace the temporary Milestone 1 shell with a production-quality bilingual public home page before database-backed feature work.

### Scope

- Establish reusable brand, typography, spacing, radius, shadow, container, breakpoint, focus, and interaction tokens.
- Add shared public header, Rahal logo, navigation, language switcher, buttons, form fields, vehicle cards, headings, status badges, and footer.
- Build one shared Arabic/English home-page component and one localized data structure.
- Add responsive hero, availability form, featured vehicles, categories, process, trust, branch, contact, WhatsApp, and footer sections.
- Use project-local original vehicle imagery and rebuild the Stitch direction without copying exported production code.

### Acceptance criteria

- Arabic uses RTL and English uses LTR while sharing the same component tree and vehicle data.
- Currency is EGP only and pickup/return copy is branch-only.
- Navigation, language switching, mobile menu, and required availability fields are present and keyboard accessible.
- No CSS vehicle placeholder, single-letter logo placeholder, forbidden legacy content, mojibake, or fixed old demo date returns.
- No horizontal overflow or content collision at 390px, 768px, 1440px, and 1920px.

### Tests

- Static and component-structure tests for shared localization, direction, navigation, language switching, required form fields, logo, and local media.
- Existing forbidden-content, date, and encoding tests.
- Browser runtime checks at the four target viewports.

## Milestone 2.1: Public multi-page experience

Goal: extend the approved bilingual home into real public routes before database-backed workflows begin.

### Scope

- Add localized fleet routes at `/cars` and `/en/cars`.
- Add localized vehicle-detail routes at `/cars/[slug]` and `/en/cars/[slug]`.
- Reuse the public header, footer, vehicle data, design tokens, and direction handling.
- Add useful demo filters, EGP-only pricing, branch-only messaging, vehicle policies, and a relative availability calendar.
- Treat the latest Stitch export as visual direction only and reject its Dubai, AED, airport, concierge, checkout, fixed-date, and Rahal Elite content.
- Point home availability search and vehicle cards to the new routes.

### Acceptance criteria

- Arabic and English fleet/detail routes share one component tree and typed vehicle data.
- Fleet filters work without duplicating pages or introducing backend persistence.
- Every vehicle card links to a valid localized details route.
- Details show EGP estimates, minimum rental duration, driver/fuel/mileage policies, and availability without exposing customer data.
- Submission language states that a request is not a confirmed booking and that final confirmation happens at the branch.
- No fixed old dates, online payment, airport pickup, UAE/AED, concierge, SMS, or Rahal Elite content appears in production source.
- No horizontal overflow or content collision at the Milestone 2 target widths.

### Tests

- Route and shared-component structure tests for Arabic and English fleet/detail pages.
- Filter behavior and empty-state component tests or browser checks.
- Static content checks for forbidden Stitch carry-over.
- Browser checks for fleet and details at mobile and desktop widths.

## Milestone 3: Schema baseline

Goal: align Prisma with the required domain before implementing workflows.

Status: completed locally on 2026-07-18. The baseline migration and relative demo seed were applied to PostgreSQL, and the vehicle and branch endpoints were verified against the database.

### Scope

- Expand the schema to cover missing entities listed in `docs/DATABASE_SCHEMA.md`.
- Add migrations.
- Add seed script with 8 to 12 fictional vehicles and relative dates generated at seed time.
- Add database service wiring in the API.
- Add initial repository/services for branches and vehicles.

### Acceptance criteria

- `pnpm db:generate` and migration commands succeed.
- Seed data creates 8 to 12 fictional vehicles with EGP pricing.
- API vehicle endpoints read from PostgreSQL.
- No real identity documents or document numbers are seeded.

### Tests

- Prisma validation.
- Seed smoke test against local PostgreSQL.
- API integration tests for vehicles and branch settings.

## Milestone 4: Authentication and session security

Goal: establish secure customer identity and browser sessions before reservation drafts can be persisted.

Status: account verification, account security, mandatory staff/admin MFA, first-login temporary-password replacement, and shared Redis throttling are completed locally. Approved production delivery and Redis credentials remain deployment inputs.

### Completed foundation scope

- Customer registration with normalized email/phone and pending-verification status.
- Login by email or international-format phone number.
- Memory-hard scrypt password hashing with a random salt.
- Shared registration password policy of 8 to 128 characters across the web and API.
- Opaque 256-bit session tokens stored only as SHA-256 hashes.
- HTTP-only, same-site browser cookie restricted to `/api`.
- Session expiry, lookup, last-seen update, and revocation.
- Blocking of suspended, blocked, and archived accounts.
- In-process authentication throttling as a local baseline; production must use the approved shared Redis-compatible limiter.
- Redacted shared authentication contracts and structured 401/403/409/429 errors.
- Authentication success/failure audit records without password or raw token data.
- Shared Arabic and English sign-in and registration screens with responsive cinematic layouts.
- Same-origin web-to-API authentication proxying so secure session cookies are not exposed to client code.
- Six-digit email and phone verification with HMAC-only code storage, 10-minute expiry, five-attempt limits, resend invalidation, and account activation after both channels are verified.
- Provider-gated verification delivery with Gmail SMTP for local testing, Brevo-first transactional email with Resend fallback, Meta WhatsApp authentication-template adapters, a staging-only Twilio Verify WhatsApp adapter with provider-owned code generation/checking, a signed webhook fallback, no plaintext code in API responses or browser UI, and fail-closed issuance when the required channel provider is absent.
- Staff password success creates a five-minute HTTP-only MFA challenge instead of an operational session.
- Authenticator enrollment uses encrypted TOTP secrets, one-time hashed recovery codes, replay-resistant counters, and an MFA-bound session timestamp.
- Staff and administrator API access fails closed until MFA is complete and an administrator-issued temporary password has been replaced.
- Bilingual staff security onboarding provides local QR generation, manual setup, recovery-code export, password replacement, mobile composition, and reduced-motion behavior.

### Remaining scope

- Production-authenticated Brevo or Resend sender credentials and Meta WhatsApp Business credentials plus approved Arabic/English authentication templates.
- Serverless-safe request-driven outbox delivery, protected daily recovery, and an administrator Communications center with credential-free readiness and delivery counters.
- Shared production rate-limit storage and operational monitoring.
- A production-only 32-byte `MFA_ENCRYPTION_KEY` supplied through the deployment secret manager.

### Acceptance criteria

- Passwords and raw session tokens never appear in API responses, audit data, or stored session records.
- Authentication cookies are HTTP-only and same-site, and require `Secure` in production.
- Registration does not create an already verified customer.
- Suspended, blocked, and archived accounts cannot create or continue sessions.
- Reservation submission remains unavailable until both phone and email are verified.
- Authentication endpoints are rate-limited and produce consistent API errors.

### Tests

- Password hash/verify, random-salt, wrong-password, and invalid-format unit tests.
- Authentication service tests for redaction, generic invalid credentials, session hashing, and blocked account states.
- API integration tests for cookie flags, secret-free responses, session lookup, and payload validation.
- Future verification/recovery tests must include expiry, reuse, resend, attempt limits, and session revocation.

## Milestone 5: Reservation wizard and draft persistence

Goal: persist the customer's first vehicle/date/driver selection safely without presenting it as a submitted request or confirmed booking.

Status: the customer wizard through final review and the guarded `DRAFT` to `PENDING_REVIEW` submission transition was completed locally on 2026-07-19. Production submission intentionally remains blocked while the active legal bundle is development-only.

### Completed first-step scope

- Database-backed reservation pages support every active public vehicle.
- Customer-session authentication is enforced by the API before draft persistence.
- Pickup/return dates, vehicle minimum duration, and driver policy are revalidated server-side.
- Vehicle and driver rates are snapshotted and an EGP estimate is stored with the draft.
- Human-readable `RHL-YYYY-NNNNNN` references are generated with collision retry.
- Repeated identical first-step saves return the existing draft instead of creating duplicates.
- Draft creation and its initial status event are written in one transaction.
- The bilingual UI clearly distinguishes a saved draft from submission and confirmation.
- Draft owners can complete nationality, address, and emergency-contact details in bilingual step two.
- Trusted name/email/phone snapshots come from the authenticated server session rather than browser input.
- Reservation snapshots preserve historical customer contacts while the reusable profile stores the latest non-identity details.
- Customer-detail responses mask email and phone values and ownership checks return no cross-customer data.
- Four required consent summaries load from versioned bilingual `PolicyVersion` records.
- Required consent timestamps and the accepted bundle version are stored on the owned draft.
- Marketing consent is separate, optional, false by default, and never required to continue.
- Stale or incomplete policy bundles fail closed instead of recording ambiguous consent.
- The seeded policy bundle is explicitly development-only and must be replaced by approved legal copy before production submission is enabled.
- Egyptian/foreign and self-drive document requirements are selected from seeded database rules.
- Owner-authorized JPEG, PNG, and PDF uploads validate configured size, MIME type, and file signatures.
- Private storage keys stay server-side; replacements and removals soft-delete metadata and remove local development objects.
- The bilingual responsive document step reports progress without asking for or displaying identity numbers.
- The bilingual final review returns only masked contact information and safe document statuses.
- Readiness blockers explain missing verification, details, consent, approved policy, documents, or vehicle availability.
- Submission authoritatively rechecks the database and atomically writes `submittedAt`, the `PENDING_REVIEW` transition event, an in-app notification, and an outbox event.
- Repeated submission of the same pending request is idempotent and never creates a confirmed booking.

### Remaining scope

- Approved production private-storage adapter.
- Approved production legal copy to replace the development-only consent bundle.
- Customer draft/request listing and expiry/abandonment handling.
- Notification worker delivery and sales-recipient routing for the existing outbox event.

### Acceptance criteria

- Visitors and staff accounts cannot persist customer reservation drafts.
- Dates and driver options are never trusted from the browser without server validation.
- Saving a draft never changes vehicle availability or creates a confirmed booking.
- Stored estimates use rate snapshots and EGP only.
- Final submission remains unavailable until verification, documents, and consent are complete.
- Required documents come from database-backed Egyptian/foreign and self-drive rules.
- Private object keys never appear in browser responses, and replacement/removal remains limited to the authenticated draft owner.
- Local document bytes stay in an ignored private path during development; production upload remains unavailable until approved private object storage is configured.

### Tests

- Unit coverage for future dates, minimum duration, customer role, and driver-policy rules.
- Unit coverage for trusted-session snapshots and cross-customer ownership rejection.
- API integration coverage for session-cookie authorization, `DRAFT` status, masked customer details, and missing ownership.
- Consent bundle/version tests, stale-version rejection, required-consent validation, and optional-marketing coverage.
- Static bilingual UI coverage for draft/not-confirmed copy, customer fields, separate consent controls, privacy exclusions, and same-origin API calls.
- API integration coverage for valid private upload, file-signature rejection, and storage-key redaction.
- API integration coverage for masked review data, development-policy blocking, and `PENDING_REVIEW` submission without confirmation.
- Static bilingual UI coverage for review/submit routes, readiness blockers, no-online-payment copy, and pending-review success state.

## Milestone 6: Sales review foundation

Goal: give authorized sales staff a protected queue and an auditable way to begin reviewing submitted requests without confirming a booking.

Status: the queue, protected review detail, atomic claim, staff decisions, customer follow-up, alternative offers, automated expiry, branch attendance, EGP deposit, protected signed contract, confirmation, and booking operations are completed locally.

### Completed scope

- Role-gated queue access for `SALES`, `ADMIN`, and `SUPER_ADMIN`; customer accounts receive `403`.
- Sales employees see unassigned pending requests plus requests assigned to themselves; administrators may see the full active review queue.
- Review detail returns masked customer contacts and address, safe document metadata, consent/verification status, and a bounded status timeline.
- Private storage keys, document URLs, and identity numbers are excluded from staff responses and UI.
- Claiming an unassigned `PENDING_REVIEW` request atomically assigns the employee and moves it to `UNDER_REVIEW`.
- The claim transaction writes a reservation event, customer in-app notification, and privacy-minimized notification outbox event.
- Claiming is idempotent for the owning employee and fails with a conflict if another employee won the race.
- Shared responsive Arabic/English sales routes are available at `/sales` and `/en/sales`.
- The assigned reviewer can request more information, reject with a customer-visible reason, or issue a 48-hour pre-approval.
- Decision messages are validated from 10 to 500 characters and stored in the separate customer conversation, not internal notes.
- Every decision uses a conditional `UNDER_REVIEW` transaction and writes the status event, customer message, in-app notification, and privacy-minimized outbox event together.
- Pre-approval sets `preApprovalExpiresAt` and remains explicitly separate from `CONFIRMED` and `Booking` creation.
- Authenticated customers can list and inspect only their own submitted requests through shared responsive `/account/requests` and `/en/account/requests` routes.
- Customer detail responses contain safe document type/status metadata and the customer-visible conversation, never private object keys or identity numbers.
- A validated customer reply moves only `MORE_INFORMATION_REQUIRED` back to `UNDER_REVIEW` and atomically writes the message, event, assigned-sales notification, and privacy-minimized outbox record.
- The assigned reviewer can create a 48-hour alternative vehicle/date offer after branch, driver-policy, minimum-duration, vehicle-state, block, and confirmed-booking checks.
- Alternatives snapshot the proposed vehicle, dates, daily rate, and estimated EGP total while leaving the existing reservation values unchanged until customer acceptance.
- The owning customer can accept or decline a pending offer. Both responses return the request to `UNDER_REVIEW`; acceptance applies the snapshots but never creates a booking.
- A non-overlapping API worker sweeps once per minute: expired alternatives return to `UNDER_REVIEW`, while expired pre-approvals move to `EXPIRED`.
- Expiry writes reservation events, bilingual in-app notifications, and privacy-minimized outbox events; alternative expiry also notifies the assigned reviewer.
- Pre-approved requests remain visible in the sales queue for branch completion instead of disappearing after the review decision.
- The assigned reviewer or an administrator override can record customer branch attendance, the configured EGP deposit with a unique branch receipt, and a signed contract record.
- Branch requirements are recorded separately from final confirmation and keep the reservation in `PRE_APPROVED`.
- Final confirmation rechecks pre-approval expiry, branch requirements, vehicle blocks, and overlapping confirmed/active bookings inside one transaction.
- Successful confirmation creates a separate `Booking`, an immutable EGP price snapshot, links the signed contract, moves the reservation to `CONFIRMED`, and queues privacy-minimized customer notifications.
- Customer request details expose safe branch-progress flags and the booking reference after confirmation, never internal receipt data or protected contract storage.
- Confirmed requests stay visible to the assigned sales employee for pickup operations, and active rentals remain visible through return.
- Delivery and return store unique auditable odometer, fuel-percentage, condition-note, actor, and timestamp records.
- The operation state machine permits delivery only from confirmed, return only from active after delivery, and completion only after return.
- Cancellation and no-show close only a not-yet-delivered confirmed booking; no-show is blocked before scheduled pickup.
- Delivery moves the vehicle to `RENTED`, while completion releases only a currently rented vehicle back to `AVAILABLE`.
- Customer request details show safe delivery, return, and completion timestamps without staff notes or vehicle readings.

### Remaining scope

- Permission-granular actions beyond the initial system-role boundary.
- Protected document view/sign-url flow with access reason, explicit permission, and access audit.
- Signed-contract private file upload and the approved production private-storage adapter.
- Deposit settlement/refund reconciliation and approved operational policy for cancellation/no-show outcomes.

### Acceptance criteria

- Customers cannot list, inspect, or claim sales requests.
- One unassigned request cannot be claimed by two employees.
- Staff responses never include storage keys, permanent document URLs, or full sensitive identity/contact data.
- Claiming produces `UNDER_REVIEW`, never `CONFIRMED`, and never creates a booking.
- Only the assigned employee, or an administrator override, can record a decision on an `UNDER_REVIEW` request.
- Request-information, pre-approval, and rejection create customer-visible messages and status-specific notifications without putting free-form notes in the outbox payload.
- Arabic and English share the same responsive component and show loading, empty, unauthorized, forbidden, detail, and claim states.
- Customers can answer only their own `MORE_INFORMATION_REQUIRED` request; the response returns it to review without creating or confirming a booking.
- Only the assigned reviewer or administrator override can create an alternative, and only the request owner can respond before expiry.
- Alternative creation and acceptance both recheck conflicts and never create a `Booking` or imply final confirmation.
- Expiry processing is conditional and idempotent, does not overlap itself, and stops its timer during application shutdown.
- Recording branch requirements cannot confirm a booking and must match the vehicle's configured EGP deposit.
- Final confirmation is unavailable without attendance, a unique deposit receipt, and a signed contract record.
- Confirmation creates one booking only after a transactional conflict check and remains idempotent for the same reservation.
- Delivery/return readings are bounded, return odometer cannot be lower than delivery, and one booking cannot have duplicate delivery or return records.
- Customers see operational progress but never staff condition notes, fuel readings, or odometer values.

### Tests

- API integration tests for customer rejection, sales queue access, masked review detail, storage-key exclusion, and atomic claim response.
- Static route/UI tests for bilingual sharing, protected fields, staff endpoints, and non-confirmation language.
- API integration coverage for validated pre-approval, expiry output, short-message rejection, and continued non-confirmation.
- Static coverage for all three decision controls and the separate customer-message write.
- API integration and static UI coverage for customer ownership, safe detail metadata, bounded replies, role rejection, and the `MORE_INFORMATION_REQUIRED` to `UNDER_REVIEW` transition.
- API integration and static coverage for alternative creation, safe customer detail, acceptance back to review, conflict checks, and non-confirmation language.
- Unit and static coverage for worker registration, overlap prevention, alternative expiry, pre-approval expiry, notifications, and continued absence of booking creation.
- Service and static coverage for branch authorization, required steps, unique receipts, EGP price snapshots, safe customer progress, and conflict-protected booking creation.
- Service and static coverage for allowed booking transitions, handover-reading constraints, vehicle status changes, safe customer lifecycle output, and operation notifications.

## Milestone 7: Fleet operations calendar

Goal: give sales and administrators one privacy-safe operational view of vehicle demand, bookings, rentals, maintenance, and manual holds.

Status: completed locally on 2026-07-26. The API and responsive Arabic/English workspace are implemented; applying the existing database migrations still requires the local PostgreSQL service.

### Completed scope

- Staff-only calendar access for `SALES`, `ADMIN`, and `SUPER_ADMIN`; customer accounts receive `403`.
- A bounded 63-day query window with active vehicle, branch, registration, and operational-status data.
- Pending review requests are visible as non-blocking demand, while confirmed bookings, active rentals, maintenance, and manual holds are marked as blocking.
- Calendar responses contain reservation or booking references only and never customer names, contact details, documents, identity data, or operational handover readings.
- Administrators can create maintenance or manual-hold periods with validated dates and a required operational reason.
- Block creation rejects past dates, ranges longer than 366 days, existing blocks, and confirmed/active booking conflicts.
- Administrators can remove only future blocks; sales employees retain read-only access.
- Block creation and removal write immutable `AuditLog` records without customer data.
- Shared Arabic/English routes are available at `/fleet` and `/en/fleet`.
- Desktop uses a 14-day vehicle timeline, while mobile uses a purpose-built agenda rather than a compressed desktop grid.
- Filters, period navigation, utilization metrics, loading/error/empty states, and administrator controls are included.

### Acceptance criteria

- Customers cannot open the staff fleet calendar.
- Sales employees cannot create or remove operational blocks.
- A maintenance or manual hold cannot overlap an existing block or confirmed/active booking.
- Pending requests remain visibly distinct and do not claim availability.
- No customer identity or contact field appears in the fleet contract, database selection, or UI.
- Every block mutation records the administrator, action, vehicle block, bounded dates, and operational reason in audit.
- Arabic and English share the same responsive behavior and correct direction.

### Tests

- Static coverage for role boundaries, bounded date ranges, customer-data exclusions, blocking semantics, overlap validation, audit writes, bilingual routes, and responsive calendar/agenda views.

## Milestone 8: Administrator vehicle management

Goal: let administrators maintain the real fleet registry and EGP operating data without bypassing reservation or rental state machines.

Status: completed locally on 2026-07-26.

### Completed scope

- Administrator-only catalog, create, and update API boundaries; sales and customer accounts receive `403`.
- Managed fields cover branch, bilingual names, make/model/year, unique registration, category, transmission, fuel, capacity, EGP daily/weekly pricing, minimum duration, driver policy/charge, mileage, branch deposit, publication, and featured state.
- Vehicle URLs are generated on the server and preserved during later edits.
- Duplicate registration/URL conflicts return `409`, and only an active branch can be selected.
- New vehicles begin as `AVAILABLE` or `INACTIVE` based on publication state.
- Administrators cannot directly set workflow-owned statuses such as confirmed, rented, maintenance, or overdue.
- A vehicle with an active workflow-owned state cannot be deactivated.
- Existing booking and reservation amounts remain protected by their stored price snapshots when future vehicle rates change.
- Creation and updates write redacted before/after operational snapshots to immutable audit records.
- The administrator registry and editor are integrated into `/fleet` and `/en/fleet`, with a compact mobile layout.

### Acceptance criteria

- Sales employees can view fleet operations but cannot open the managed-vehicle catalog or mutate a vehicle.
- All numeric, enum, identifier, and length rules are validated by the API.
- Duplicate registration numbers cannot create a second vehicle.
- Only `AVAILABLE` and `INACTIVE` are controlled through vehicle publication; operational states remain state-machine owned.
- Vehicle create/update records the administrator and a bounded audit snapshot without customer data.
- Arabic and English use the same responsive registry and form.

### Tests

- Static coverage for role protection, DTO validation, workflow-state protection, branch/uniqueness errors, audit snapshots, API wiring, and bilingual responsive UI.

## Milestone 9: Protected document review

Goal: let the assigned reviewer inspect and decide customer documents without exposing storage keys, permanent URLs, or identity data outside the protected review surface.

Status: completed locally on 2026-07-26 for the configured private-storage adapter.

### Completed scope

- Authenticated `POST`-only inline document streaming for the assigned sales reviewer and administrator override.
- Every request requires a 10–300 character operational reason and records actor, action, reason, IP hash, result, and timestamp in `DocumentAccessLog`.
- Responses use `private, no-store`, inline disposition, MIME nosniff, and a restrictive content security policy.
- Private object keys remain server-only; the browser receives a temporary in-memory Blob URL that is revoked when the preview closes.
- Storage reads reuse canonical path containment checks to reject traversal outside the configured private root.
- Reviewers can verify an uploaded/under-review document or reject it with a 10–500 character customer-facing reason.
- Rejection moves an assigned `UNDER_REVIEW` request to `MORE_INFORMATION_REQUIRED`, writes the customer conversation, notification, outbox event, reservation event, and document access audit together.
- The customer detail shows the rejected type and reason and accepts a validated JPEG, PNG, or PDF replacement for rejected documents only.
- Customers cannot return the request to review while an active rejected document still exists.
- A replacement retires the rejected object metadata, writes a new opaque private object, and preserves the existing file-signature and size validation.

### Acceptance criteria

- Unassigned sales employees cannot preview or decide a document.
- No storage key, filesystem path, permanent URL, or full identity number appears in the response contract or UI.
- Every successful or denied access to an existing document is audited with an explicit reason.
- Browser and intermediary caching is disabled for document bytes.
- A verified document cannot be rejected through the normal review transition.
- After submission, the customer can replace only an actively rejected document.
- The request cannot leave `MORE_INFORMATION_REQUIRED` until all rejected documents are replaced.

### Tests

- Static security coverage for POST-only streaming, no-store headers, assignment checks, access reasons, audit success/failure, safe path resolution, review transitions, replacement gating, and bilingual UI.

## Milestone 10: In-app notification center

Goal: surface the notifications already written by reservation, document, booking, and rental transactions in one secure bilingual workspace experience.

Status: completed locally on 2026-07-26; the external Email, WhatsApp, and Web Push outbox worker was completed in Milestone 21. Production provider accounts remain deployment inputs.

### Completed scope

- Authenticated inbox API returns the latest 50 non-archived notifications for the session owner only.
- Titles and bodies are localized on the server using the authenticated user's preferred locale.
- Responses include only presentation fields, importance, read state, timestamp, and an optional reservation target; outbox payloads and provider delivery errors remain private.
- Unread count is computed independently of the bounded list.
- Individual and mark-all read actions are owner-scoped and idempotent.
- The shared customer/sales/fleet shell includes one Arabic/English notification trigger, unread badge, drawer, important state, loading/empty/error states, and mark-all control.
- The inbox refreshes every 30 seconds and when a background tab becomes visible, with no-store fetches and no aggressive polling.
- Reservation notifications open the exact customer or staff request through an opaque reservation identifier.
- Desktop uses a side drawer; mobile uses the same bounded, touch-friendly reading surface.

### Acceptance criteria

- A user cannot list or mark another user's notifications.
- The API never returns another recipient, provider identifier, delivery error, outbox payload, or customer data.
- Reading the same notification twice remains successful and does not change its original read timestamp.
- The unread badge cannot grow beyond a readable `99+` display.
- Polling stops when the shell unmounts and refreshes immediately when the tab becomes visible.
- Email, WhatsApp, and Push are not shown as delivered unless their production worker and provider callbacks confirm delivery.

### Tests

- Service tests for localization, owner scoping, not-found privacy, individual read, and mark-all.
- Static coverage for bounded queries, safe contracts, bilingual shared UI, polling cleanup, no-store requests, unread/important states, and exact request navigation.

## Milestone 11: Staff roles, permissions, and audit control

Goal: replace broad sales-role trust with administrator-managed operational access and an auditable bilingual control center.

Status: implemented and verified locally. Staff MFA and mandatory first-login password replacement were closed in Milestone 19; production secret provisioning and the shared rate limiter remain deployment gates.

### Completed scope

- A versioned catalog defines reservation, document, deposit, booking, fleet, vehicle, staff, and audit permissions.
- Existing unassigned sales accounts receive a safe default Sales Agent role during migration; explicit user overrides take precedence over inherited role access.
- Sales queue, review, protected-document, deposit, confirmation, booking-operation, and fleet-calendar boundaries enforce their corresponding permission server-side.
- Administrators can create sales accounts, update operational role/status, and replace non-critical permission overrides with a required audit reason.
- Only super administrators can create/manage administrators, change shared role permissions, or override critical permissions.
- Administrators cannot mutate their own access through the staff workspace, and super-administrator accounts cannot be modified there.
- Status, system-role, staff-role, override, and shared-role changes revoke affected active sessions.
- Staff mutations write privacy-bounded append-only audit records without passwords, raw sessions, IP addresses, device strings, or customer data.
- The overview returns at most 100 recent staff/access audit entries with actor, action, target, reason, result, and timestamp.
- Shared Arabic/English routes at `/admin/staff` and `/en/admin/staff` provide staff directory, account editor, effective permissions, override controls, role matrix, recent audit, loading/error/forbidden/success states, and a mobile-first layout.

### Acceptance criteria

- Customer and sales accounts cannot open staff administration.
- An administrator cannot create or modify another administrator; a super administrator is required.
- No administrator can suspend themselves or alter their own role/permissions through this workflow.
- An explicit deny always wins over a role grant, and missing sales permission denies the protected operation.
- Critical document, confirmation, staff-management, and audit permissions require super-administrator authority to override.
- Every access change has a 10–300 character reason and revokes sessions affected by the change.
- Staff API responses and audit views never contain password hashes, raw session tokens, customer data, raw IP addresses, or user-agent strings.
- Arabic and English use the same responsive component tree and expose the same operational capabilities.

### Tests

- Unit coverage for administrator boundaries, self-protection, critical permission overrides, and explicit-deny precedence.
- Static coverage for the permission catalog, default role migration, server-side enforcement across sensitive sales operations, session revocation, audit redaction, and bilingual responsive routes.

## Milestone 12: Account recovery and session security

Goal: give every Rahal account a complete password-recovery and browser-session control flow without exposing account existence or sensitive session metadata.

Status: implemented and verified locally on 2026-07-26, with Brevo support added on 2026-07-29. Real recovery email delivery uses the configured Gmail, Brevo, Resend, or signed delivery adapter; production credentials remain an environment deployment requirement.

### Completed scope

- Public reset requests accept email or phone and always return the same accepted response whether the account exists, is blocked, or delivery is unavailable.
- Known eligible accounts receive a six-digit email code through the existing provider-gated delivery adapters.
- Reset codes are stored as HMAC digests only, expire after 10 minutes, allow at most five attempts, and are invalidated on resend or provider failure.
- A successful reset requires a different 8–128 character password, consumes the code, updates the memory-hard password hash, and revokes every active session transactionally.
- Authenticated password changes verify the current password, require a different new password, preserve the current session, and revoke every other active session.
- Authenticated users can list safe active-session summaries, end one owned session, or end all other sessions.
- Session responses expose opaque IDs and derived device/browser labels only; refresh-token hashes, IP hashes, and raw user-agent strings remain server-side.
- Reset request, confirmation, and password change endpoints have separate rate-limit buckets and immutable audit events.
- Shared Arabic/English recovery routes at `/auth/recover` and `/en/auth/recover` provide request, code confirmation, mismatch/error, resend, and completion states.
- Shared Arabic/English security routes at `/account/security` and `/en/account/security` provide password change, active sessions, current-device state, individual/all-other revocation, and mobile-first layouts for customer and staff accounts.

### Acceptance criteria

- Public reset responses cannot be used to determine whether an email or phone is registered.
- Plaintext recovery codes, passwords, raw session tokens, and IP hashes never appear in API responses or browser state; raw user-agent metadata remains restricted server-side and is projected only into generic device labels.
- Invalid/expired/reused codes and attempts beyond the limit cannot change a password.
- Password reset revokes all sessions; authenticated password change preserves only the current session.
- A user cannot list or revoke another user's session.
- Revoking the current session clears the browser cookie and returns the user to sign-in.
- Arabic and English share the same responsive component trees and expose the same security controls.

### Tests

- Unit coverage for safe session projection, hashed-token lookup, current-password verification, other-session revocation, owner-scoped revocation, and generic unknown-account recovery responses.
- Template coverage for bilingual code-only recovery email content.
- Static security coverage for endpoint throttling, HMAC-only reset storage, attempt limits, transactional session revocation, metadata exclusions, and bilingual routes.

## Milestone 13: Completed-rental reviews and moderation

Goal: turn verified completed rentals into privacy-safe public proof through a controlled customer and administrator workflow.

Status: implemented locally on 2026-07-26. The included database migration must be applied when the local PostgreSQL service is available.

### Completed scope

- Only the owning customer can submit one 1–5 star review for a reservation whose rental lifecycle is `COMPLETED`.
- Review text is bounded to 20–800 characters and starts in `PENDING`; submission never publishes directly.
- Customer request details present the review form only after completion and show pending, published, or rejected feedback states.
- Administrators and super administrators receive a bilingual moderation center with pending/published/rejected filters and an operational summary.
- Rejection requires a 10–300 character reason; approval and rejection are one-time conditional transitions with actor, timestamp, reason, and audit log.
- Public Arabic and English review pages read only `APPROVED` records, use locale-aware vehicle names, and reduce customer names to first name plus optional initial.
- Public and administrator contracts exclude email, phone, identity data, documents, storage metadata, and internal reservation notes.
- Responsive layouts cover desktop, tablet, and mobile, with reduced-motion handling for the public visual treatment.

### Acceptance criteria

- An active, cancelled, rejected, or otherwise incomplete rental cannot be reviewed.
- Another customer cannot read or review a reservation they do not own.
- A reservation cannot receive more than one review, including under concurrent submission.
- Sales employees cannot open or operate the moderation center.
- A pending review cannot be published without an administrator decision, and a moderated review cannot be decided twice.
- Rejection is impossible without a bounded reason.
- Public APIs return approved reviews only and never expose a full customer name or sensitive customer/reservation data.
- Arabic and English use the same component and authorization paths.

### Tests

- Unit coverage for completed-rental eligibility, duplicate rejection, incomplete-rental rejection, administrator boundary, required rejection reasons, and public name minimization.
- Existing static content, directionality, forbidden-content, old-date, and mojibake checks cover the added bilingual routes and components.

## Milestone 14: Customer profile and communication preferences

Goal: complete the customer account workspace with safe self-service profile data and explicit, channel-specific communication choices.

Status: implemented and verified locally on 2026-07-26. External delivery preference and quiet-hour enforcement were completed in Milestone 21.

### Completed scope

- Owner-scoped customer account API returns personal profile, verified sign-in contacts, verification state, membership date, and communication preferences.
- Customers may update names, preferred language, date of birth, nationality, address, and emergency contact details.
- Verified email and phone remain read-only; changing either requires a future dedicated re-verification workflow.
- Profile updates audit changed field names only, never old or new address, birth date, nationality, or emergency contact values.
- In-app notifications remain an essential enabled channel; Email, WhatsApp, Push, and marketing choices are independent.
- Marketing consent defaults off and remains separate from operational channel preferences.
- Optional quiet hours require a valid paired `HH:mm` range with different start and end times.
- Notification preference updates use an owner-keyed upsert and a bounded before/after audit record containing preferences only.
- Shared `/account/profile` and `/en/account/profile` routes provide profile completeness, verification states, responsive forms, channel controls, quiet hours, and a bridge to account security.

### Acceptance criteria

- Staff accounts and other customers cannot read or change a customer's profile or preferences.
- Email and phone cannot be changed through this endpoint.
- In-app operational notifications cannot be disabled.
- Marketing remains opt-in and can be withdrawn independently.
- Quiet hours cannot be saved with only one boundary or an identical start/end.
- Profile audit data contains changed field names only and no personal values.
- Saving preferences does not claim Email, WhatsApp, or Push delivery when a production provider is not configured.
- Arabic and English expose the same capabilities on mobile and desktop.

### Tests

- Unit coverage for customer-role boundaries, safe defaults, future birth dates, privacy-bounded audit input, quiet-hour validation, and essential in-app state.
- Static coverage for owner scoping, immutable verified contacts, marketing separation, audit privacy, and shared bilingual routes.

## Milestone 2D — Administration operations and audit center

### Completed scope

- Live administration overview aggregates open requests, confirmed bookings, active rentals, available fleet, and attention items from the database.
- Four operational alert categories link administrators to the relevant workspace without exposing customer documents or identity data.
- A 14-day request activity view and fleet-status distribution replace placeholder business charts.
- The immutable audit reader is protected by `audit.view`, cursor-paginated, searchable, and filterable by action, entity, and outcome.
- Audit responses deliberately exclude raw before/after payloads, IP hashes, user agents, customer documents, and full identity values.
- Shared Arabic and English administration routes support desktop and mobile layouts.
- Stitch exports remain visual references only; the implementation follows current Egypt/EGP and no-online-payment rules.

### Acceptance criteria

- Only administrators can access the command overview.
- Audit access requires the explicit `audit.view` permission (administrators retain their global access).
- The overview contains database-derived values and no hard-coded business totals or dates.
- Each audit response contains at most 40 entries and exposes only bounded operational metadata.
- Arabic RTL and English LTR provide equivalent capabilities on mobile and desktop.
- Admin navigation separates the overview from the sales request queue.

### Tests

- Unit coverage for the administrator boundary, aggregate mapping, audit permission enforcement, pagination cap, and privacy-bounded output.
- Full repository formatting, lint, tests, typecheck, and production build.
- Browser verification at desktop and mobile sizes against the Stitch administration references.

## Milestone 15: Protected document review studio and private-object recovery

Goal: make document review usable as a focused operational workflow while tightening the relationship between audited access and the final reviewer decision.

Status: implemented locally on 2026-07-27.

### Completed scope

- Replaced the small inline document panel with a full-height, bilingual review studio inspired by the structure and visual hierarchy of the Stitch review reference.
- Added a document rail, review progress, guarded preview, previous/next navigation, image zoom, rotation, reset, PDF preview, quick decision notes, and explicit secure-state messaging.
- Added dedicated responsive compositions for desktop, tablet, and mobile rather than shrinking the desktop interface.
- Kept access reasons separate from customer-facing decision notes.
- Required the same staff actor to complete a successful protected preview within 15 minutes before recording a verify or reject decision.
- Kept review access available through the legitimate pre-approval, confirmation, and active-rental lifecycle while excluding completed and closed records.
- Converted missing local private objects into a bounded service-unavailable response without exposing filesystem paths.
- Repaired the local fictional review fixture with clearly marked demo-only objects; no real identity details are stored in the fixture.

### Acceptance criteria

- The assigned reviewer can open every active fixture document from the sales workspace on desktop and mobile.
- The browser receives only a temporary Blob URL from an authenticated, non-cacheable response.
- A decision cannot be submitted without a recent successful preview by the same actor.
- Access purpose and decision note remain independent audit inputs.
- The UI exposes no storage key, local path, download action, permanent URL, or full identity value.
- Rejected documents can be verified after a valid replacement review, but cannot be rejected repeatedly.
- Missing object failures are audited and return safe, actionable copy.
- Reduced-motion preferences disable non-essential studio transitions.

### Tests

- Static security coverage for safe missing-object handling, recent-preview enforcement, temporary URL revocation, separate reasons, modal semantics, bilingual copy, and non-exposure of storage keys.
- Full repository formatting, lint, tests, typecheck, and production build.
- Browser verification of the protected preview journey at desktop and mobile sizes.

## Milestone 16: Exclusive sales ownership and administrator document oversight

Goal: make one-employee review ownership unmistakable and give administrators a safe operational record of every protected-document access reason and decision.

Status: implemented locally on 2026-07-27.

### Completed scope

- Confirmed and retained the conditional claim transaction that allows only one employee to move an unassigned request into review.
- Kept claimed requests out of every other sales queue and preserved the direct-detail authorization rejection for non-owners.
- Added visible unassigned, current-owner, and team-owned states to the sales queue and protected detail header.
- Added a focused claim panel explaining that ownership becomes exclusive immediately and that claiming never confirms a booking.
- Added an administrator-only `document-access` reader protected by `audit.view`.
- Projected the existing `DocumentAccessLog` into a bounded contract containing staff actor, reservation reference, document type/status, action, operational reason, result, and timestamp; identity-like digit sequences inside free-form reasons are masked before response mapping.
- Added search, action/result filters, cursor pagination, live visible-result metrics, and direct navigation to the related request.
- Added a bilingual responsive document-governance workspace with an independent mobile composition and reduced-motion behavior.
- Kept document bytes, storage keys, original filenames, identity values, IP hashes, and user agents outside the administrator response and UI.

### Acceptance criteria

- Two simultaneous claims cannot assign the same request to two sales employees.
- After a successful claim, only the owner sees the request in a sales queue and only that owner may open its protected details.
- Administrators can see the full active request queue for oversight without changing sales ownership.
- Document oversight requires an administrator account and the `audit.view` permission.
- Every successful or failed document access attempt and review decision appears with its recorded reason.
- No oversight response exposes the document, its path, full identity data, or network/device metadata.
- Arabic RTL and English LTR expose equivalent filters, metrics, records, and request links on desktop and mobile.

### Tests

- Service coverage for administrator and permission boundaries, bounded mapping, hidden sensitive fields, and document-access pagination.
- Static coverage for atomic sales ownership, other-sales denial, bilingual ownership messaging, endpoint wiring, and protected oversight UI.
- Full repository formatting, lint, tests, typecheck, production build, and browser verification.

## Milestone 17: Administrator document-requirement policy center

Goal: move Egyptian, foreign-customer, and self-drive document requirements out of seed-only configuration and into a safe, audited administrator workflow.

Status: implemented locally on 2026-07-27.

### Completed scope

- Added administrator-only list, create, and update boundaries for `DocumentRequirementRule`.
- Restricted rule identity to the finite customer-category, document-type, and self-drive scenarios used by the reservation flow.
- Added validation for bilingual labels, JPEG/PNG/PDF allowlists, 1–20 MB limits, ordering, active state, and a mandatory 10–300 character reason.
- Kept rule identity stable after creation and rejected duplicate scenarios.
- Prevented administrators from disabling the final active base requirement for either Egyptian or foreign customers.
- Recorded create/update snapshots and their operational reasons in the immutable audit log without customer, reservation, filename, or storage data.
- Added a bilingual `/admin/documents` and `/en/admin/documents` workspace with live scenario simulation, policy metrics, animated rule cards, and focused create/edit panels.
- Added purpose-built desktop and mobile layouts plus reduced-motion behavior.

### Acceptance criteria

- Customers and sales employees cannot read or mutate the administrator rule catalog.
- The browser cannot choose a rule key or submit an unsupported document type, MIME type, or size limit.
- Each customer category always retains at least one active base document.
- A rule change is not committed without a bounded audit reason.
- Policy APIs and audit snapshots never expose customer records, uploaded documents, filenames, or private storage keys.
- The scenario simulator matches the reservation rule selection for driver and customer category.
- Arabic RTL and English LTR expose equivalent controls on desktop and mobile.

### Tests

- Unit coverage for administrator boundaries, duplicate rules, deterministic keys, final-base-rule protection, update mapping, and bounded missing records.
- Static coverage for DTO limits, audited transactions, sensitive-data exclusions, bilingual routes, simulator logic, responsive layouts, and reduced motion.
- Browser verification of real database rules, driver/category scenarios, audited save, English parity, and mobile editor composition.

## Milestone 18: Customer draft recovery and dynamic workspace polish

Goal: prevent customers from losing unfinished reservation work while making customer, sales, notification, vehicle-detail, and document-policy surfaces feel coherent and responsive across mobile and desktop.

Status: implemented locally on 2026-07-27.

### Completed scope

- Added owner-scoped customer draft list, detail/resume, and abandonment endpoints.
- Added truthful progress and next-step projection from customer details, active document rules, uploaded metadata, and consent state.
- Added pickup-time draft expiry to the existing non-overlapping review-window worker.
- Soft-deleted draft document metadata and removed private object bytes for both deliberate abandonment and automatic expiry.
- Added a bilingual saved-draft studio to the customer request workspace with progress, pickup, document count, EGP estimate, last update, expiry copy, resume, and inline abandonment confirmation.
- Restored saved dates, driver choice, safe customer inputs, and consent state in the reservation wizard.
- Rebuilt the in-app notification surface as a body-level modal drawer with visible metrics, filters, priority states, loading/empty/error handling, direct request navigation, mobile full-screen composition, and reduced-motion behavior.
- Made the active route locale authoritative for customer requests, drafts, sales review reads, and notifications without changing session ownership or account preference.
- Corrected the mobile vehicle-detail hero overhang and the administrator document-policy layout at phone, tablet, and compact desktop widths.
- Verified the customer draft creation/resume journey, localized customer and sales workspaces, notification drawer, public fleet/detail/auth pages, and administrator document-policy/staff pages in the local browser.

### Acceptance criteria

- A customer can list, open, and abandon only their own live drafts.
- Sales employees never receive or see a draft until the customer submits it.
- Draft progress never claims that missing required self-drive documents are complete.
- Resuming restores the saved dates, driver choice, safe customer data, and consent state without exposing identity values or document objects.
- Abandonment and pickup-time expiry are conditional and idempotent, record an event, soft-delete document metadata, and remove private objects.
- Arabic routes render Arabic vehicle, branch, and notification copy even when the account preference is English; English routes retain equivalent behavior.
- Notification UI cannot be clipped by a sticky/filtered shell and remains usable with keyboard, reduced motion, mobile, and desktop layouts.
- Vehicle detail and document-policy layouts produce no horizontal page overflow at audited mobile/tablet sizes.

### Tests

- Service coverage for owner-scoped draft summaries, required-document next-step calculation, safe abandonment, private-object cleanup, pickup-time expiry, and notification locale override.
- Static coverage for endpoint ownership, resume hydration, bilingual copy, responsive draft states, notification portal/filter behavior, and sensitive-data exclusions.
- Browser verification with fictional customer and sales accounts at mobile, compact desktop, and wide desktop sizes.
- Full repository formatting, lint, tests, typecheck, and production build.

## Milestone 19: Staff MFA and first-login security gate

Goal: prevent a password-only staff login from reaching customer requests, documents, fleet controls, or administration.

Status: implemented locally on 2026-07-28.

### Completed scope

- Added a database-backed five-minute staff login challenge stored only as a SHA-256 token hash and delivered through a dedicated HTTP-only, same-site cookie.
- Changed sales and administrator password success to return an MFA-required contract rather than creating a full browser session.
- Added TOTP enrollment and verification with AES-256-GCM encrypted secrets, 30-second RFC-compatible codes, bounded attempts, one-step clock tolerance, and replay-resistant counters.
- Added eight one-time recovery codes shown only after enrollment and stored only as normalized HMAC hashes.
- Added an MFA verification timestamp to operational staff sessions; every protected backend service continues to call the authoritative session gate.
- Marked newly created staff accounts for mandatory first-login password replacement and revoked other sessions when that password changes.
- Added a bilingual, responsive staff security center with locally generated QR codes, a manual setup key, live expiry timer, recovery-code copy/download, password replacement, role-aware routing, and reduced-motion support.
- Added automatic workspace redirection when an existing staff session still has a required security action.
- Added production configuration validation for a dedicated 32-byte `MFA_ENCRYPTION_KEY`; local development derives a separate fallback key from `AUTH_SECRET`.
- Added migration, service, integration, configuration, static, privacy, responsive, and replay tests.

### Acceptance criteria

- A valid staff password never creates an operational session by itself.
- Customer accounts retain the existing password/session flow and are not forced through staff MFA.
- A TOTP code cannot be reused after its counter is committed.
- Recovery codes are single use and their plaintext values are never persisted or logged.
- Staff APIs reject sessions without both an enabled credential and an MFA verification timestamp.
- A newly created staff member cannot use a workspace before replacing the temporary password.
- MFA setup secrets and recovery codes are never placed in local storage, URLs, audit payloads, or API session contracts.
- Arabic RTL and English LTR provide equivalent enrollment, verification, recovery, and password flows on mobile and desktop.

### Tests

- Unit coverage for authenticated encryption, RFC-compatible TOTP verification, replay rejection, normalized recovery hashing, staff challenge issuance, enrollment, session binding, and temporary-password blocking.
- API integration coverage for MFA challenge cookies, the password-to-MFA boundary, protected session issuance, and sales workflow access after verification.
- Static coverage for schema security fields, backend enforcement, bilingual UI, local QR generation, no local-storage persistence, responsive layout, and reduced motion.
- Full repository formatting, lint, tests, typecheck, production build, and browser verification.

## Decisions not blocking Milestone 1

- Final provider choices for media, private storage, email, push, WhatsApp, and Redis hosting.
- Final legal copy and retention periods.
- Confirmed branch address, phone, WhatsApp, map, and social links.
- Final logo and storefront assets.

## Milestone 20: Public information surface and release-control baseline

Goal: close the missing public information routes, make document locale metadata truthful from the first render, and establish one explicit release gate before production work continues.

Status: implemented locally on 2026-07-28.

### Completed scope

- Added shared Arabic/English About, How it works, Contact, FAQ, Rental terms, Privacy, and Cancellation pages.
- Reused the production public header, footer, motion layer, typography, logo, route localization, and responsive tokens rather than duplicating per-language page trees.
- Added route-specific canonical and language-alternate metadata for every new page.
- Added a request-locale proxy and root-layout header boundary so English pages render `lang="en-EG" dir="ltr"` and Arabic pages render `lang="ar-EG" dir="rtl"` at the document level.
- Replaced home-only navigation anchors with stable public routes and added policy/FAQ links to the footer.
- Kept legal, retention, deposit-settlement, branch, and contact facts visibly pre-launch where owner or qualified legal approval is still required.
- Added `docs/RELEASE_READINESS.md` as the launch-blocker and route-audit control document.
- Verified all 14 routes at mobile and desktop sizes with no horizontal page overflow.

### Acceptance criteria

- Every required public information page exists in Arabic and English and shares one component.
- The root HTML language and direction match the requested locale.
- Policy pages never present unapproved copy as binding production terms.
- No online payment, non-branch pickup/return, forbidden geography/currency, or sensitive-document delivery claim is introduced.
- Mobile and desktop layouts have no horizontal overflow and support reduced motion.
- Every page includes useful metadata, a language counterpart, navigation, and a next action.

### Tests

- Static coverage for all route files, document locale selection, shared responsive composition, pre-launch legal labels, branch/payment boundaries, reduced motion, and sensitive-data exclusions.
- Full repository tests, type checking, Prisma validation, production build, and browser verification.

## Milestone 21: Pre-deployment business and production hardening

Goal: close the code-owned launch gaps without inventing legal copy, production credentials, real fleet data, or branch facts.

Status: implemented locally on 2026-07-28. Real services, staging evidence, approved content, and owner/legal sign-off remain release gates.

### Completed scope

- Added private S3-compatible document storage with production fail-closed validation, server-side encryption settings, bounded reads, and local development isolation.
- Added signed malware-scanning for customer documents and contracts.
- Replaced the branch signed-contract checkbox with a real protected PDF upload, protected staff access reason, access audit, and contract preview. Confirmation now requires a stored signed contract.
- Added Redis-backed atomic authentication throttling with TLS-only production configuration, safe local fallback, readiness, and shutdown.
- Added a transactional notification outbox worker for In-App, Brevo-or-Resend Email, approved-template Meta WhatsApp, and encrypted VAPID Web Push.
- Added channel-level idempotency, bounded retries, dead-subscription cleanup, correct customer/staff recipient routing, booking-to-reservation resolution, preference checks, and quiet-hour deferral.
- Added explicit browser notification opt-in and a service worker without automatic permission prompts.
- Added iOS/iPadOS Home Screen-aware Web Push guidance and distinct install identities, start URLs,
  and in-workspace install controls for the sales and administrator applications.
- Added audited administrator branch management.
- Added an audited legal-policy center that publishes exactly four synchronized Arabic/English policies, rejects development versions, and atomically retires the previous bundle.
- Added dependency overrides and framework updates until `pnpm audit` reported no known vulnerabilities.
- Added runtime web-to-API proxying so `API_URL` is selected at server runtime, with bounded headers, cookie preservation, safe upstream failure, and no browser-visible internal URL.
- Added API request IDs, defensive headers, browser CSP/security headers, dependency readiness, Docker definitions, CI quality gates, deployment/rollback instructions, and backup/restore instructions.
- Audited the complete public/customer/sales/admin route matrix at mobile and desktop sizes; all audited routes had one H1, correct route locale/direction, no horizontal overflow, and no basic unlabeled interactive controls.

### Acceptance criteria

- Production startup fails when private storage, malware scanning, Redis, MFA encryption, delivery providers, WhatsApp notification template, or Web Push encryption/VAPID settings are incomplete.
- No document or contract object key is returned to a customer or administrator projection.
- A booking cannot be confirmed from a boolean contract claim; a clean protected PDF must exist.
- Successful external notification channels are not resent when another channel retries.
- Staff-directed events are never delivered to the customer merely because the payload also references that customer.
- Quiet hours delay optional external channels without hiding the in-app notification.
- iPhone and iPad browser tabs show installation steps instead of a false unsupported-browser
  result; notification permission is requested only from an installed Home Screen app on supported
  iOS/iPadOS versions.
- Sales and administrator apps install with separate manifest identities and open the correct
  protected workspace without weakening authentication, MFA, or authorization.
- Only an administrator can publish a complete, immediate, non-development bilingual policy bundle.
- One application image can use a runtime `API_URL` and the browser never receives the internal service address.
- High/moderate dependency audit findings are zero at the recorded verification point.
- Real deployment remains blocked until every external item in `RELEASE_READINESS.md` is closed.

### Tests

- Unit coverage for local/S3 storage, malware scanning, Redis failure behavior, push-subscription encryption, outbox recipient/idempotency/retry/quiet-hours behavior, branches, policy publication, and dependency readiness.
- Static security coverage for contract non-exposure, protected access audit, runtime proxy boundaries, production configuration, CSP/headers, CI, runbooks, bilingual routes, and responsive interfaces.
- Static PWA coverage for iOS installation detection order, iPad desktop-mode detection,
  role-specific manifests/layout metadata, service-worker registration, and manual install guidance.
- Full repository formatting, lint, tests, Prisma validation/generation, type checking, production builds, dependency audit, migrations, and container builds.

## Milestone 22: Staff notification campaign studio

Goal: let authorized Rahal staff announce vehicle, offer, service, and operational updates without
bypassing customer consent, channel preferences, or the audited delivery pipeline.

Status: implemented locally on 2026-07-30.

### Completed scope

- Added attributable bilingual notification campaigns with finite categories, audiences, selected
  channels, safe internal target links, importance, marketing classification, and recipient counts.
- Added an independent `notifications.send` permission to the default sales role.
- Restricted sales campaigns to customers; administrators may address customers, sales, or both.
- Forced new-vehicle and offer campaigns through the marketing opt-in audience filter.
- Reused the existing owner-scoped in-app notification, Email, approved-template WhatsApp, Web Push,
  quiet-hours, retry, and idempotent delivery pipeline.
- Added Arabic/English administration and sales campaign studios with live preview, channel
  selection, responsive mobile composition, delivery history, and aggregate status.
- Added safe campaign deep links to the shared notification center.
- Recorded each created campaign in the immutable audit log without recipient contact details.

### Acceptance criteria

- A customer or sales employee without `notifications.send` cannot create or list campaigns.
- A sales employee cannot address sales staff or broaden the audience.
- Offers and new-vehicle campaigns reach only active users who opted in to marketing.
- Operational campaigns still respect each recipient's channel preferences and quiet hours.
- Every campaign creates one owner-scoped notification and outbox event per recipient atomically.
- Campaign history shows creator, audience, recipient count, and aggregate delivery state without
  exposing customer email, phone, push endpoint, or WhatsApp destination.
- Arabic RTL and English LTR expose equivalent composer, preview, history, and mobile behavior.

### Tests

- Service coverage for permission boundaries, forced marketing consent, audience restrictions,
  bilingual payloads, selected channels, and safe target paths.
- Worker coverage for campaign notification identifiers and channel selection.
- Full repository format, lint, tests, typecheck, production build, migration, and browser
  verification.
