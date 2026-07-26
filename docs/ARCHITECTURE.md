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
- Queue/cache: Redis-compatible service with BullMQ or equivalent robust queue.
- Public vehicle media: Cloudinary or approved CDN-backed public media service.
- Private customer documents: private S3-compatible object storage.
- Push: Firebase Cloud Messaging or approved equivalent.
- Email: transactional provider from the Rahal domain.
- WhatsApp: official Meta WhatsApp Business Platform Cloud API.
- Tests: Jest for unit/integration, Playwright for end-to-end.
- Password hashing: Argon2id.
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

The first sales boundary exposes only the active review queue. Sales employees can read unassigned pending work and their own assignments; administrators can read the full active queue. A claim uses a conditional transactional update so only one employee can move an unassigned `PENDING_REVIEW` request to `UNDER_REVIEW`. Staff detail responses remain metadata-only: masked contacts, safe document type/status, consent state, and a bounded event timeline. Private document access requires a later explicit permission and audited short-lived URL flow.

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

## Document security architecture

- Browser uploads should use short-lived, server-authorized upload flows.
- Document metadata is stored in PostgreSQL.
- Document bytes live only in private object storage.
- View/download endpoints generate short-lived signed URLs after checking permissions.
- Every access attempt is logged.
- Downloads remain disabled by default unless the actor has explicit permission.
- The development adapter writes opaque object keys under the ignored `PRIVATE_DOCUMENT_STORAGE_PATH`; it is disabled by default in production.
- Uploads validate configured MIME allowlists, file size, and file signatures before metadata is committed. API responses never return storage keys.
- Production document upload remains gated on an approved private S3-compatible adapter, malware scanning, and an approved retention schedule.

## Architecture decisions needed later

- Final provider choices for Cloudinary, S3-compatible storage, email, WhatsApp, push, and Redis hosting.
- Whether shared validation contracts use Zod or Nest DTO classes as the primary source.
- Final production session/MFA provider details.
- Final legal/privacy copy and document retention policy.
- Branch address/contact data from the owner and storefront image.

None of these block the first documentation/tooling milestone.
