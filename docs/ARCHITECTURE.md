# RAHAL Architecture

## Recommended monorepo structure

```text
rahal-platform/
├── apps/
│   ├── web/                 # Next.js bilingual public site and dashboards
│   └── api/                 # NestJS modular monolith REST API
├── packages/
│   ├── database/            # Prisma schema, migrations, generated client
│   ├── contracts/           # Shared DTO schemas/types, OpenAPI-derived helpers
│   ├── ui/                  # Shared design tokens and reusable React components
│   └── config/              # Shared TypeScript, ESLint, Prettier, test config
├── docs/
│   ├── decisions/
│   ├── PROJECT_REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   └── IMPLEMENTATION_PLAN.md
├── design-reference/
│   ├── latest-stitch-export.zip
│   ├── logo.png
│   └── storefront.png
├── PROJECT_CONTEXT.md
├── AGENTS.md
├── package.json
└── pnpm-workspace.yaml
```

The current repo already has `apps/web`, `apps/api`, and `packages/database`. Add `packages/contracts`, `packages/ui`, `packages/config`, `docs/decisions`, `design-reference`, and `AGENTS.md` as the platform matures.

## Dependency choices

Use the existing choices unless an ADR changes them:

- Package manager: pnpm workspaces.
- Web: Next.js with TypeScript.
- UI styling: Tailwind CSS plus shared design tokens in `packages/ui`.
- API: NestJS with TypeScript.
- Database: PostgreSQL.
- ORM and migrations: Prisma.
- API validation: DTO validation with `class-validator`/`class-transformer` or shared schema validation with Zod in `packages/contracts`. Prefer one validation style consistently.
- API docs: OpenAPI/Swagger through NestJS.
- Queue/cache: Redis-compatible service for shared throttling and future distributed worker coordination; the current durable notification queue is the PostgreSQL outbox.
- Public vehicle media: Cloudinary or approved CDN-backed public media service.
- Private customer documents: private S3-compatible object storage.
- Push: standards-based VAPID Web Push.
- Email: Brevo is the primary transactional adapter, with Resend fallback. A verified Rahal
  domain remains required before the final production launch; staging may use a verified
  single-sender address whose provider-managed rewrite is accepted explicitly.
- WhatsApp: official Meta WhatsApp Business Platform Cloud API for production notifications and
  authentication templates. Staging phone verification may use Twilio Verify's WhatsApp channel;
  Twilio owns code generation and approval, while Rahal stores only an expiring provider marker.
- Tests: Vitest for unit/integration and browser-controlled acceptance checks.
- Password hashing: Node.js memory-hard scrypt.
- Session storage: secure HTTP-only cookies with server-side session records and refresh rotation.

## Deployment shape

- Keep the initial backend as a modular monolith.
- Deploy `apps/web` and `apps/api` separately.
- Use one PostgreSQL database for transactional data.
- Use Redis for queues, rate limits, and transient workflow coordination.
- Use separate public media and private document storage configurations.
- Do not introduce microservices in the first release.

## Web application architecture

The web app should be organized by route groups:

- Public storefront routes.
- Auth and verification routes.
- Customer dashboard routes.
- Sales dashboard routes.
- Admin dashboard routes.

Use shared primitives from `packages/ui` for:

- Brand tokens.
- Buttons, inputs, selects, dialogs, menus, tabs, toasts, tables, cards, timelines, calendars, and notification UI.
- Direction-aware layout helpers.
- Status badges and permission-aware action surfaces.

Localization should be data-driven and route-aware. Arabic and English routes may differ by URL, but must share components and backend data.

## API architecture

NestJS modules should be added in these boundaries:

- Auth.
- Users.
- Staff and Roles.
- Vehicles.
- Vehicle Media.
- Availability.
- Reservation Requests.
- Bookings.
- Customer Documents.
- Deposits and Contracts.
- Maintenance and Blocks.
- Notifications.
- Content.
- Branch Settings.
- Reviews.
- Audit.
- Reporting.

Cross-cutting concerns:

- Config module with typed environment validation.
- Prisma/database module.
- Request correlation IDs.
- Structured logging.
- Validation pipe and consistent error response shape.
- Authentication guards.
- Permission guards.
- Audit interceptor/service for critical actions.
- Rate limiting for sensitive endpoints.
- Idempotency support for externally retried operations.

## Availability and booking architecture

- Pending requests may overlap.
- Confirmation must run inside a transaction that rechecks vehicle availability.
- Confirmed, active, maintenance, and manual-block periods must prevent conflicting confirmations.
- Public calendars expose availability only, never customer identity.
- Enforce overlap rules in the service/database layer, not just the UI.

PostgreSQL exclusion constraints are the preferred final enforcement mechanism for confirmed/active booking conflicts and operational blocks. Prisma may need raw SQL migrations for those constraints.

Customer submission is a separate transactional boundary from booking confirmation. The review endpoint is read-only and returns masked contacts and safe document states. The submit transaction rereads verification, consent version, document rules, vehicle state, operational blocks, and confirmed/active booking overlap before conditionally moving only a `DRAFT` to `PENDING_REVIEW`. The same transaction records `submittedAt`, a reservation event, an in-app customer notification, and a minimal notification outbox payload. It never creates a booking or records a deposit.

Draft recovery is an owner-scoped read/write boundary separate from submitted requests. Summary projection calculates the next incomplete step from saved customer snapshots, current applicable document requirements, active document metadata, and consent state. Resume returns only the owning customer's safe draft inputs and masked verified contacts. Abandonment conditionally changes only an owned `DRAFT` to `EXPIRED`, soft-deletes active document metadata, records a reservation event, and removes the returned private object keys outside the database transaction. The review-window worker also expires drafts whose pickup time has passed with the same metadata and private-object cleanup; no arbitrary retention window is introduced before legal approval.

The first sales boundary exposes only the active review queue. Sales employees can read unassigned pending work and their own assignments; administrators can read the full active queue. A claim uses a conditional transactional update so only one employee can move an unassigned `PENDING_REVIEW` request to `UNDER_REVIEW`; once claimed, the request is removed from every other sales queue and direct detail access is rejected. The sales interface labels unassigned work and current-user ownership explicitly so the database lock is visible in the workflow. Staff detail responses remain metadata-only: masked contacts, safe document type/status, consent state, and a bounded event timeline. Private document access requires a later explicit permission and audited short-lived URL flow.

Sales decisions are allowed only from `UNDER_REVIEW` for the assigned employee, with an explicit administrator override boundary. Request-information, rejection, and 48-hour pre-approval each update the reservation and write the event, customer-visible message, notification, and outbox record in one transaction. The free-form customer message stays out of the outbox payload. Pre-approval expiry is stored on the reservation but does not create a booking, deposit, or confirmation.

The customer request boundary is separately owner-authorized and exposes submitted request summaries, safe document type/status metadata, and customer-visible messages only. When the assigned reviewer requests more information, the owning customer may send one bounded response. The transaction conditionally moves only `MORE_INFORMATION_REQUIRED` to `UNDER_REVIEW`, preserves the reviewer assignment, and writes the customer message, reservation event, staff in-app notification, and minimal outbox event together. It never exposes document bytes or creates a booking.

Alternative offers are separate persisted records rather than destructive edits to the original request. Creation is limited to the assigned reviewer or administrator override from `UNDER_REVIEW`, validates the same branch and operational availability, snapshots EGP pricing, expires after 48 hours, and moves the request to `ALTERNATIVE_OFFERED`. Owner acceptance rechecks blocks and confirmed/active booking overlap before applying the proposed snapshots and returning to `UNDER_REVIEW`; decline also returns to review without changing the original selection. Neither response creates a `Booking`.

Review-window expiry runs as a small non-overlapping worker inside the API process once per minute and on startup. Conditional updates make repeated sweeps idempotent. Expired alternative offers return their reservation to `UNDER_REVIEW` and notify the customer and assigned reviewer; expired pre-approvals move to `EXPIRED` and notify the customer. Every expiry writes its event and outbox record in the same transaction, and the interval is unreferenced and cleared on application shutdown. A separately deployed worker can replace this process-local scheduler when horizontal API scaling is introduced.

Post-confirmation operations use an explicit server-owned state machine. Delivery and return create unique `BookingOperation` records with bounded odometer/fuel readings, a condition note, actor, and timestamp. Delivery atomically moves the reservation and booking to `ACTIVE` and the vehicle to `RENTED`; completion is unavailable until a return record exists and then releases only a currently rented vehicle. Cancellation and no-show apply only before delivery, and no-show is rejected before scheduled pickup. Customer APIs expose lifecycle timestamps but not staff notes or readings.

The staff fleet calendar is a separate privacy-minimized read model. It joins active vehicle metadata with pending request references, confirmed/active booking references, and operational blocks for a bounded date window. It deliberately omits every customer field. Pending requests are informational and non-blocking; confirmed/active bookings and maintenance/manual blocks are blocking. Sales can read this model, while block mutations require an administrator role, reject booking/block overlaps, and write an immutable audit record.

Vehicle registry management is a separate administrator boundary from fleet operations. Administrators may maintain descriptive, capacity, publication, and EGP pricing fields, but cannot submit an arbitrary operational status. Create maps publication to `AVAILABLE` or `INACTIVE`; update preserves any workflow-owned status and rejects deactivation while that state is active. Reservation and booking price snapshots isolate already-created work from later catalog price changes. Every mutation stores a bounded before/after audit snapshot.

## Notification architecture

Use an outbox pattern:

- Business services write notification events in the same transaction as the business action.
- A worker dequeues events and creates per-channel delivery attempts.
- Providers are called outside the business transaction.
- Webhook callbacks update delivery state idempotently.
- Read status is recorded only when the product or provider can verify it.

The implemented worker claims outbox rows conditionally, resolves an explicit customer or assigned-staff recipient, and reads the corresponding privacy-bounded `Notification` presentation row. It records unique per-notification/channel deliveries for In-App, Brevo-or-Resend Email, approved-template Meta WhatsApp, and VAPID Web Push. Brevo takes precedence when both email providers are configured so verification, recovery, and notification email use the same transport. Successful channels are not resent when another channel retries. Failed events use bounded exponential backoff, invalid browser subscriptions are disabled, and configured quiet hours defer only optional external channels while the in-app record remains available. Push endpoint/key material is encrypted with AES-256-GCM. After authentication, customers receive a first-party explanation and explicit opt-in action; deferral leaves a persistent reminder, and unread inbox events receive a mobile-visible in-page preview outside the drawer. The browser permission request still runs only from the customer's action because browser policy does not permit a site to grant itself notification access.

The public/customer app, sales workspace, and administrator workspace are separate install identities
on the same origin. Sales and administrator routes override the root manifest with role-specific
manifest IDs and start URLs while retaining root scope so authentication, security onboarding, and
authorized deep links stay inside the installed experience. Installation changes presentation only:
every API boundary continues to enforce the same session, MFA, role, and permission checks. On iOS
and iPadOS, capability detection checks for the Home Screen requirement before checking Push API
globals, including desktop-mode iPad user agents. Browser-tab users receive concrete Share -> Add to
Home Screen instructions; the permission request is attempted only after the installed standalone
app is opened.

The Twilio Verify adapter is deliberately scoped to phone verification and does not send general
notification-outbox events. It calls the Verify start/check endpoints instead of repurposing a
Sandbox content template. Trial accounts can reach only recipient numbers verified with Twilio.
The verified Meta adapter remains the production path for both authentication and approved
notification templates.

Background execution is hosting-aware. Persistent Node processes use bounded interval workers.
Vercel uses a post-mutation interceptor to await a small outbox batch before the function returns,
plus a `CRON_SECRET`-protected daily recovery endpoint for stale reservations and retry backlog.
This prevents frozen serverless timers and long-resumed Prisma transactions. The administration
Communications center exposes only provider names, readiness states, aggregate delivery counts, and
queue status; it never serializes credentials or customer destinations.

The in-app channel reads directly from owner-scoped `Notification` rows rather than exposing `NotificationEvent` payloads or delivery attempts. The inbox is bounded to 50 presentation records, while unread count is calculated separately. Read mutations use conditional owner-scoped updates and preserve the first read timestamp. The shared shell uses 30-second no-store polling plus visibility refresh; external channel delivery remains the responsibility of the outbox worker.

Customer, draft, sales, and notification presentation endpoints accept only the finite `ar`/`en` page locale as an optional read hint and otherwise fall back to the authenticated account preference. Locale never changes ownership or permission decisions. The shared notification surface renders through a body portal so sticky headers and backdrop-filter containing blocks cannot clip it. It provides visible unread/priority/total metrics, filters, loading/empty/error states, Escape and backdrop closing, body scroll locking, direct reservation navigation, mobile full-screen composition, and reduced-motion handling.

## Staff authorization architecture

System roles establish the account boundary, while sales operations require a second database-backed permission decision. `StaffRolePermission` supplies inherited grants and `UserPermissionOverride` supplies the final explicit allow/deny; an override always wins. Administrators and super administrators retain their product-level operational authority, but staff-management escalation is separately constrained: only a super administrator can manage administrators, shared role permissions, or critical overrides.

Access changes run transactionally with a bounded `AuditLog` write and active-session revocation. The staff read model returns effective permission keys and a maximum of 100 relevant audit records, but excludes password hashes, session hashes, raw IP/device metadata, customer records, and unrelated audit payloads. Sensitive reservation, protected-document, deposit, confirmation, booking-operation, and fleet reads call the permission service on the backend; the UI is an explanatory control surface, never the authorization boundary.

Staff authentication is a separate gate before authorization. A valid sales or administrator password creates a short-lived `StaffLoginChallenge`, stores only its token hash, and sets a dedicated HTTP-only cookie; it does not create an operational `Session`. First enrollment generates a TOTP secret server-side, encrypts it with AES-256-GCM, and exposes it only through the authenticated challenge response for local QR rendering. Verification commits the accepted counter to prevent replay. Recovery values are generated once, returned once, and persisted only as user-bound HMAC hashes.

Successful MFA creates a normal session with `mfaVerifiedAt`. The shared backend session boundary requires both this timestamp and an enabled `StaffMfaCredential` for every staff operation. New staff rows also carry `mustChangePassword` and `temporaryPasswordIssuedAt`; the MFA-bound session can reach only the password-replacement endpoint until the flag is cleared. Password replacement revokes every other session. Production configuration requires a separate 32-byte MFA encryption key and must use the deployment secret manager rather than source control.

## Account recovery and session architecture

Password recovery reuses `VerificationCode` with the dedicated `RESET_PASSWORD` purpose. The six-digit value is delivered only through a configured email adapter and stored only as an HMAC bound to user, purpose, and code. Public request responses are deliberately generic. Confirmation consumes the code, changes the password hash, and revokes all active sessions in one transaction. Authenticated password change verifies the current memory-hard hash and preserves only the current session.

Session management reads active, unexpired rows by authenticated owner. Browser contracts receive an opaque session ID, timestamps, current-session flag, and server-derived generic device/browser labels. Refresh hashes, IP hashes, and raw user-agent strings remain private. Individual revocation includes both session ID and owner ID in its mutation predicate; all-other revocation excludes the current session explicitly.

## Review and moderation architecture

Customer reviews are downstream of the completed rental state machine, never the reservation-request or pre-approval flow. The owner-scoped service rereads `Reservation.status`, `completedAt`, customer ownership, and the unique review relation before creation. A database unique constraint on `reservationId` is the final concurrent-submission guard.

Reviews start as `PENDING`. Only administrators and super administrators can conditionally transition a pending record to `APPROVED` or `REJECTED`; rejection requires a bounded reason. The same transaction stores moderator identity and timestamp, sets `approvedAt` only for publication, and appends a privacy-bounded audit event. Decisions are immutable through this workflow.

The public read model queries approved rows only and projects rating, comment, localized vehicle name, publication time, and a reduced customer display name. It never selects contact details, identity data, documents, storage keys, staff notes, or the reservation timeline. The administrator read model adds operational counts but remains metadata-only.

## Customer profile and preference architecture

Customer self-service is an owner-scoped read/update boundary separate from authentication and reservation snapshots. Verified email and phone are returned for the signed-in owner but are not accepted by the profile DTO. Profile changes update future account defaults only; previously submitted reservations retain their point-in-time customer snapshots.

Sensitive profile audit events contain the names of changed fields, not their previous or new values. Communication preferences are less sensitive and use a bounded before/after audit record. In-app remains an essential operational channel. Email, WhatsApp, Push, marketing consent, and quiet hours are stored independently; delivery workers must read these settings before creating optional external attempts. Important legally or operationally required behavior still needs approved policy before provider rollout.

## Document security architecture

- Browser uploads should use short-lived, server-authorized upload flows.
- Document metadata is stored in PostgreSQL.
- Document bytes live only in private object storage.
- View/download endpoints generate short-lived signed URLs after checking permissions.
- Every access attempt is logged.
- Downloads remain disabled by default unless the actor has explicit permission.
- The development adapter writes opaque object keys under the ignored `PRIVATE_DOCUMENT_STORAGE_PATH`; it is disabled by default in production.
- Uploads validate configured MIME allowlists, file size, and file signatures before metadata is committed. API responses never return storage keys.
- Production document upload uses the S3-compatible adapter only; local filesystem storage is rejected in production. Every customer document and signed contract is signature/size checked and must pass the signed malware-scanning boundary before its opaque object key is committed. Retention timing remains gated on approved legal policy.
- Staff document review uses an authenticated `POST` stream rather than returning a storage key or durable signed URL. The assigned reviewer supplies an operational reason, every existing-document attempt is written to `DocumentAccessLog`, and the response is inline and non-cacheable. A review decision requires a successful preview by the same actor within the previous 15 minutes, and its decision note is recorded separately from the access reason. Administrators with `audit.view` have a dedicated, read-only oversight projection of these records containing actor, reservation reference, document type/status, action, bounded reason, result, and timestamp. Identity-like digit sequences in free-form reasons are masked during mapping. The projection never returns document bytes, object keys, full identity values, IP hashes, or user agents. Missing private objects return a bounded service error without leaking filesystem paths. Rejection returns the request to customer action; replacement is limited to the rejected type and retains the original signature/size validation.
- Document requirements are an administrator-owned policy boundary separate from customer uploads. The API exposes only `DocumentRequirementRule` configuration, validates a finite document/MIME set and bounded file sizes, and never joins customer reservations or stored objects. Rule identity is stable after creation; labels, format allowlists, size caps, order, and active state remain editable. Disabling the final active base rule for either Egyptian or foreign customers fails closed so the customer upload journey cannot silently lose its identity requirement. Every create/update transaction appends a bounded `AuditLog` snapshot and mandatory operational reason.

Policy publication is a separate administrator boundary. One immutable version contains the four required consent policies in Arabic and English with one immediate effective timestamp. The former active rows are retired in the same transaction, duplicate or `DEV-` production versions are rejected, and audit stores approval metadata plus a SHA-256 content hash rather than duplicating the legal text.

The web `/api/*` boundary is a runtime server-side proxy. It forwards only bounded request headers, preserves response cookies, strips hop-by-hop headers, returns a safe 503 on upstream failure, and resolves `API_URL` at request time rather than baking an environment hostname into a browser build.

## Architecture decisions and external inputs needed later

- Production vendors/accounts for public media, S3-compatible storage, malware scanning, an
  authenticated Brevo or Resend sender, Meta WhatsApp, Web Push, Redis, and monitoring.
- Whether shared validation contracts use Zod or Nest DTO classes as the primary source.
- Final legal/privacy copy and document retention policy.
- Branch address/contact data from the owner and storefront image.
