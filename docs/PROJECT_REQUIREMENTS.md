# RAHAL Project Requirements

## Source of truth

This document summarizes the product requirements from `PROJECT_CONTEXT.md` and the current repository inspection. If this document conflicts with `PROJECT_CONTEXT.md`, use `PROJECT_CONTEXT.md` until an Architecture Decision Record updates the decision.

## Current repository state

- The repository is a pnpm monorepo with `apps/web`, `apps/api`, and `packages/database`.
- Git is initialized and the Milestone 1 and public-web baselines are committed.
- The web app has bilingual home, database-backed fleet, vehicle-detail, availability, and authenticated reservation-draft routes using Next.js 16 and React 19.
- The API has health, database-backed vehicle, active-branch, authentication, verification, reservation-draft, and owner-authorized private-document endpoints.
- The API and web now include the first role-gated sales review queue, protected request detail, and atomic request-claim workflow.
- The Prisma 7 package contains the Milestone 3 domain baseline, a reviewed SQL migration, and a repeatable fictional seed.
- Docker Compose provides PostgreSQL on host port `5433` to avoid collisions with a workstation PostgreSQL service on `5432`.
- Generated clients, build output, dependencies, logs, and large Stitch ZIP exports remain ignored artifacts.

## Resolved foundation gaps

- Source encoding is verified by static mojibake/replacement-character tests, including `PROJECT_CONTEXT.md`.
- Demo dates are generated relative to seed/runtime time rather than hard-coded historical dates.
- The public web uses local fictional fleet imagery and the supplied transparent Rahal logo treatment.
- `design-reference/`, its tracked guidance, and `AGENTS.md` are present; large Stitch ZIP exports remain untracked.
- Lint, formatting, type checks, builds, static tests, API integration tests, validation, and consistent HTTP errors are configured.
- The vehicle and branch API now read through repositories backed by Prisma/PostgreSQL.
- The schema now includes sessions/devices, explicit bookings and EGP price snapshots, alternative offers, document access logs, contracts, separate notes/messages, notification outbox/templates, branch settings, content/vehicle translations, rate rules, and database-level overlap protection for confirmed/active bookings.
- `VehicleStatus` now includes `OVERDUE` and `ARCHIVED`.

Remaining configuration work includes maximum rental duration and final production media metadata. Required-document rules are now database-backed with separate Egyptian/foreign and self-drive conditions; an administrator UI for those rules remains pending.

Staff access is now database-backed beyond the broad system role. A default Sales Agent role and explicit per-user overrides control reservation review, protected documents, deposits, confirmation, rental operations, and fleet visibility. Administrators have a bilingual staff/role/audit workspace; critical overrides and administrator management remain super-administrator-only, and access changes revoke affected sessions.

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

An authenticated customer may save the dates/vehicle/driver selection as a `DRAFT` before completing verification. A draft is not a submitted request, does not notify sales, and does not reserve availability. Submission to `PENDING_REVIEW` remains blocked until both email and phone are verified and the required consent/document steps are complete.

The implemented final-review endpoint exposes only masked customer contacts, safe document status labels, the EGP estimate, and explicit readiness blockers. The submit endpoint independently rechecks every prerequisite and availability inside one database transaction before moving to `PENDING_REVIEW`; it also records the status event, customer notification, and notification outbox event. It does not create a confirmed booking. The current `DEV-` policy bundle deliberately keeps submission disabled until approved production legal text is published.

Required consent must be recorded separately for rental terms, privacy, private-document processing, and reservation operations against the exact active bilingual policy bundle version. Marketing consent is optional and must remain false unless the customer explicitly selects it. Development policy copy cannot enable production submission.

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

Authorized sales staff may list active review requests and claim an unassigned `PENDING_REVIEW` request. Claiming changes the request only to `UNDER_REVIEW`, records the employee assignment and event, and notifies the customer that review started. It must not create a booking, accept a deposit, or imply confirmation. Staff detail views use masked contacts and document metadata only; document bytes require a separate permission-checked and audited access flow.

The assigned reviewer may move an `UNDER_REVIEW` request to `MORE_INFORMATION_REQUIRED`, `PRE_APPROVED`, or `REJECTED` with a validated customer-visible message. A pre-approval expires after 48 hours and remains conditional on branch attendance, deposit recording, signed documents, and final availability. These decisions write their event, message, notification, and outbox record atomically but never create a `Booking`.

Customers may list and inspect only their own submitted requests. The customer view exposes request metadata, safe document status, and customer-visible messages without document locations or identity numbers. When a request is `MORE_INFORMATION_REQUIRED`, its owner may send a 10–500 character response that returns the request to `UNDER_REVIEW`, preserves its sales assignment, and notifies the assigned reviewer. This response never confirms a booking.

The assigned reviewer may propose a 48-hour alternative vehicle and/or date range from `UNDER_REVIEW`. The API must validate the branch, vehicle state, driver policy, minimum duration, operational blocks, and confirmed/active overlap and store immutable EGP rate/total snapshots. The customer may accept or decline only their own pending offer. Acceptance applies the proposed snapshots only after another conflict check and returns the request to `UNDER_REVIEW`; it is not confirmation and does not create a booking.

Expired alternative offers must return to sales review automatically. Expired pre-approvals must move to `EXPIRED` without confirmation. Expiry processing must be conditional, idempotent, non-overlapping, auditable, and produce customer notifications without inserting free-form or protected data into the outbox payload.

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
