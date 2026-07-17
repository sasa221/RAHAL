# RAHAL Project Requirements

## Source of truth

This document summarizes the product requirements from `PROJECT_CONTEXT.md` and the current repository inspection. If this document conflicts with `PROJECT_CONTEXT.md`, use `PROJECT_CONTEXT.md` until an Architecture Decision Record updates the decision.

## Current repository state

- The repository is a pnpm monorepo with `apps/web`, `apps/api`, and `packages/database`.
- The current directory is not a Git worktree; `git status` fails because `.git` is absent.
- `docs/` and `design-reference/` were missing before this documentation pass.
- `node_modules`, `apps/web/.next`, `apps/api/dist`, and generated Prisma client output exist locally and should remain ignored build/dependency artifacts.
- The web app is a small bilingual public landing page using Next.js 16 and React 19.
- The API is a minimal NestJS service with health and demo vehicle endpoints.
- The database package contains a Prisma 7 schema with many core entities, but no migrations yet.
- Docker Compose currently provides PostgreSQL only.

## Conflicts and gaps found locally

- Arabic text in `README.md`, `PROJECT_CONTEXT.md`, and source files appears mojibaked in this environment. The product requires correct Arabic and RTL support, so text encoding/content must be repaired before UI copy is considered valid.
- The web app hard-codes demo dates such as `2026-07-20` and `2026-07-23`; demo dates must be generated relative to seed/runtime date.
- The web app uses generated CSS car silhouettes rather than supplied brand/fleet assets. This is acceptable only as a temporary scaffold.
- `design-reference/` is absent, so the latest Stitch export, logo, and storefront image cannot yet be inspected.
- There is no `AGENTS.md` despite the recommended structure mentioning it.
- There are no tests, lint configuration, formatter configuration, API validation layer, or end-to-end test setup yet.
- The API returns `{ error: "VEHICLE_NOT_FOUND" }` with a normal response body instead of a proper HTTP error.
- The current API demo vehicle data is not connected to Prisma.
- The Prisma schema is broad but incomplete against the full requirements. Missing or partial areas include sessions/devices, user verification history, explicit bookings, price snapshot line items, alternative offers, document access logs, contracts, internal notes as separate records, customer-visible messages, notification templates/preferences per event, branches/settings split, content translations, vehicle translations, vehicle rates/rules versioning, document required-rule configuration, optimistic version fields, and database-level exclusion protection for overlapping confirmed/active bookings.
- `VehicleStatus` does not include `OVERDUE` or a distinct archived status.
- Vehicle fields do not yet include doors, maximum rental duration, featured flag, ordered public media metadata completeness, or configurable required document rules.

## Product scope

RAHAL is a bilingual Arabic/English car-rental reservation and fleet-management platform for a car rental company in Egypt.

- Pickup and return are at the Rahal branch only.
- Currency is EGP only.
- Online payments are not supported.
- Reservation requests require a verified customer account.
- Final booking confirmation happens after staff review, branch attendance, deposit payment at the branch, and signed rental documents.
- Admins manage fleet, branch data, pricing/rules, roles, permissions, content, policies, notifications, and audit.
- Staff use role and permission constrained workflows to review requests and operate rentals.
- Customers track requests, upload protected documents, receive notifications, manage preferences, and leave feedback after completed rentals.

## Languages and localization

- Arabic and English share components, data, and information architecture.
- Arabic screens use `dir="rtl"` and English screens use `dir="ltr"`.
- Translatable records should store Arabic and English text explicitly.
- Do not apply English-oriented letter spacing to Arabic text.
- All user-facing dates, numbers, currency labels, statuses, and notifications must be localized.

## Forbidden content

Production and demo content must not include:

- Rahal Elite or Elite Mobility.
- UAE, Dubai, or AED.
- Airport pickup or airport return.
- Concierge service.
- Online checkout, cards, payment gateway, or secure transaction claims.
- SMS as a planned notification channel.
- Sales targets unless the owner explicitly adds them later.

## Core user roles

- Visitor: browse pages, vehicles, and public availability only.
- Customer: verified account holder who can submit and track reservation requests.
- Sales employee: permission-bound operational reviewer and booking/rental operator.
- Administrator: full operational control.
- Super Administrator: highest administrative authority for production operations.

Permissions must be enforced server-side. UI hiding is not authorization.

## Public pages

- Home.
- Vehicle listing/search.
- Vehicle details.
- Availability calendar.
- How it works.
- About.
- Contact/branch map.
- FAQs.
- Rental terms.
- Privacy policy.
- Cancellation policy.
- Sign in, registration, verification, and password reset.

## Reservation request requirements

The customer wizard contains:

- Dates and Rahal branch pickup/return.
- Driver option based on vehicle rules.
- Customer details.
- Protected document uploads based on configured rules.
- Terms and consent.
- Review and submit.

After submission:

- Generate a human-readable reference such as `RHL-2026-000123`.
- Start in `PENDING_REVIEW`.
- Notify customer and relevant staff.
- Store price snapshots so future rule changes do not rewrite historical estimates.
- Recheck availability inside a transaction before confirmation.

## Security and privacy requirements

- Email and phone verification are both required before reservation submission.
- Use HTTP-only same-site browser sessions or an equivalent secure server-managed session design.
- Rate-limit authentication, OTP, password reset, verification resend, and document access.
- Use a memory-hard password-hashing algorithm.
- Require staff/admin MFA before production.
- Store protected document bytes in private object storage only.
- Store document metadata and private object keys in PostgreSQL.
- Generate short-lived signed document URLs only after server-side authorization.
- Log every protected document view/download attempt.
- Mask identity document numbers and sensitive personal data in normal views.
- Audit authentication, permission changes, protected document access, and critical booking actions.

## Notification requirements

Supported channels:

- In-app.
- Web/mobile push.
- Transactional email.
- Official WhatsApp Business Platform API.

Use an outbox/queue design. Persist event, channel, recipient, localized template version, delivery attempts, provider IDs, and provider webhook results where applicable.

## Definition of done

A feature is not complete until it has server-side authorization, bilingual UX where user-facing, responsive layouts, loading/empty/error/success states, relevant audit events, sensitive-data protection, tests for critical logic, updated documentation, and no forbidden legacy content.
