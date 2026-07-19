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

Status: account verification slice completed locally on 2026-07-19. Registration, login, current-session lookup, logout, password hashing, opaque session cookies, basic rate limiting, authentication audit writes, bilingual customer access screens, and provider-gated phone/email verification are implemented. Approved production delivery and recovery remain pending.

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
- Provider-gated verification delivery with Gmail SMTP for arbitrary-recipient local testing, direct Resend production email, Meta WhatsApp authentication-template adapters, a signed webhook fallback, no plaintext code in API responses or browser UI, and fail-closed issuance when the required channel provider is absent.

### Remaining scope

- Production Resend domain/API credentials and Meta WhatsApp Business credentials plus approved Arabic/English authentication templates.
- Password reset and reset-session revocation.
- Session/device listing and individual/all-device revocation.
- Customer-facing bilingual password-recovery screens.
- Shared production rate-limit storage and operational monitoring.

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

Status: first-step draft slice completed locally on 2026-07-19. The remaining customer details, protected documents, consent, review, and verified submission steps are pending.

### Completed first-step scope

- Database-backed reservation pages support every active public vehicle.
- Customer-session authentication is enforced by the API before draft persistence.
- Pickup/return dates, vehicle minimum duration, and driver policy are revalidated server-side.
- Vehicle and driver rates are snapshotted and an EGP estimate is stored with the draft.
- Human-readable `RHL-YYYY-NNNNNN` references are generated with collision retry.
- Repeated identical first-step saves return the existing draft instead of creating duplicates.
- Draft creation and its initial status event are written in one transaction.
- The bilingual UI clearly distinguishes a saved draft from submission and confirmation.

### Remaining scope

- Customer details and verified contact review.
- Configurable required-document rules and private document upload flow.
- Terms, privacy, document, and operational consent capture with policy versions.
- Final review and verified transition from `DRAFT` to `PENDING_REVIEW`.
- Availability recheck, notification outbox events, customer draft listing, and expiry/abandonment handling.

### Acceptance criteria

- Visitors and staff accounts cannot persist customer reservation drafts.
- Dates and driver options are never trusted from the browser without server validation.
- Saving a draft never changes vehicle availability or creates a confirmed booking.
- Stored estimates use rate snapshots and EGP only.
- Final submission remains unavailable until verification, documents, and consent are complete.

### Tests

- Unit coverage for future dates, minimum duration, customer role, and driver-policy rules.
- API integration coverage for session-cookie authorization and `DRAFT` status.
- Static bilingual UI coverage for the draft/not-confirmed copy and same-origin API call.

## Decisions not blocking Milestone 1

- Final provider choices for media, private storage, email, push, WhatsApp, and Redis hosting.
- Final legal copy and retention periods.
- Confirmed branch address, phone, WhatsApp, map, and social links.
- Final logo and storefront assets.
