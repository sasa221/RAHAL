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

## Architecture decisions needed later

- Final provider choices for Cloudinary, S3-compatible storage, email, WhatsApp, push, and Redis hosting.
- Whether shared validation contracts use Zod or Nest DTO classes as the primary source.
- Final production session/MFA provider details.
- Final legal/privacy copy and document retention policy.
- Branch address/contact data from the owner and storefront image.

None of these block the first documentation/tooling milestone.
