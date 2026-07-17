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

## Milestone 2: Schema baseline

Goal: align Prisma with the required domain before implementing workflows.

### Scope

- Expand the schema to cover missing entities listed in `docs/DATABASE_SCHEMA.md`.
- Add migrations.
- Add seed script with fictional demo data and relative dates generated at seed time.
- Add database service wiring in the API.
- Add initial repository/services for branches and vehicles.

### Acceptance criteria

- `pnpm db:generate` and migration commands succeed.
- Seed data creates 8 to 12 fictional vehicles with EGP pricing.
- API vehicle endpoints read from the database.
- No real identity documents or document numbers are seeded.

### Tests

- Prisma validation.
- Seed smoke test against local PostgreSQL.
- API integration tests for vehicles and branch settings.

## Milestone 3: Public shell and fleet browsing

Goal: replace the current static scaffold with data-driven, bilingual public browsing.

### Scope

- Shared UI tokens and components.
- Public home, vehicle listing, vehicle detail, and branch/contact sections.
- Basic filters backed by API query parameters.
- Responsive desktop/mobile verification.
- Accessibility pass for keyboard focus and semantic markup.

### Acceptance criteria

- Arabic and English content use the same vehicle data.
- Currency displays EGP only.
- Pickup/return copy says branch only.
- No online payment claims.
- Loading, empty, and error states exist.

### Tests

- Component tests for shared UI primitives.
- API query tests for vehicle filters.
- Playwright smoke tests for Arabic and English public browsing.

## Decisions not blocking Milestone 1

- Final provider choices for media, private storage, email, push, WhatsApp, and Redis hosting.
- Final legal copy and retention periods.
- Confirmed branch address, phone, WhatsApp, map, and social links.
- Final logo and storefront assets.
