# RAHAL delivery board

This board is the durable execution checklist for the production-readiness programme.
Only a verified item is marked complete. Each completed item must name the test or live check that proved it.

## Current release blockers

- [x] Create and connect the public `rahal-eg-blob` Vercel Blob store, then redeploy the web project. Verified in Vercel with `BLOB_READ_WRITE_TOKEN` connected to Production and Preview and release `3478c93` ready.
- [x] Upload a vehicle image from the administrator studio and verify the saved media and vehicle record. Verified live with `DEMO-RAHAL-BMW-001`, Vercel Blob media, and the fleet count increasing from 8 to 9.
- [x] Allow a direct notification recipient to use the project's CUID identifier instead of incorrectly requiring a UUID. Verified by DTO/service tests.
- [ ] Configure the production WhatsApp Business provider and approved templates; never expose an OTP or customer document in a message.
- [ ] Configure production email sender, delivery webhooks, and bounce handling.
- [ ] Configure private document storage, scanning, retention, and server-authorized short-lived access.
- [ ] Obtain legal approval for policies, consent copy, business contacts, and branch details.

## Wave 1 — Correctness and complete user journeys

- [x] Enforce role-specific staff onboarding: admins enroll Authenticator, verify their real email, and replace the temporary password; sales recovery stays admin-controlled and audited.

- [ ] Audit every public button, form, and error state in Arabic and English at mobile and desktop widths.
- [ ] Audit the customer account, verification, reservation, document, offer, cancellation, and feedback journeys.
- [ ] Audit the sales claim/review/notes/approval/branch/deposit/confirmation journey with competing sales users.
- [ ] Audit the administrator fleet, policies, branches, staff, communications, audit log, and reporting journeys.
- [ ] Capture and fix any browser exception, failed API response, inaccessible control, overflow, or misleading success message.
- [ ] Re-run the authenticated lifecycle suite and the public deployment smoke suite after every cross-cutting fix.

## Wave 2 — Communication quality

- [ ] Redesign the in-app inbox for clear priority, unread state, useful actions, and compact mobile scanning.
- [x] Produce responsive bilingual transactional email templates for account, request, review, approval, branch, booking, and reminder events. Verified through account-template coverage and the shared notification email template tests.
- [ ] Add administrator and sales send previews for in-app, email, push, and WhatsApp that accurately show provider availability.
- [ ] Add recipient selection, consent explanation, delivery state, and human-readable failure recovery to campaign sends.
- [ ] Verify marketing opt-in, quiet hours, role boundaries, and delivery outbox retries against real fixtures.

## Wave 3 — Experience system

- [x] Add a shared spatial workspace frame and page-specific three-step guide across customer, sales, and administrator shells; correct request-page active navigation. Verified by static coverage, RTL/LTR typecheck, and responsive browser checks.
- [x] Replace the bulky Arabic interface typography with self-hosted IBM Plex Sans Arabic, explicit 400–700 weights, restrained heading sizes, and consistent RTL line-height across public and role experiences. Verified by font asset checks, production build, and 390px/desktop browser review.
- [ ] Establish a consistent 3D/depth frame system for public, customer, sales, and administrator views using restrained motion and the same Rahal visual language.
- [ ] Improve each role shell's mobile hierarchy, navigation, quick actions, status clarity, empty states, and loading transitions.
- [ ] Keep operations surfaces calm: no decorative movement that makes requests, documents, vehicles, or notifications harder to scan.
- [ ] Check reduced-motion, touch, keyboard, screen-reader, RTL, LTR, 390px, 768px, and 1440px behavior for every shared pattern.

## Wave 4 — Production hardening

- [ ] Add observability for API failures, failed outbound deliveries, storage failures, and request-flow exceptions.
- [ ] Run security review for permissions, document routes, upload validation, session security, rate limits, and audit evidence.
- [ ] Validate database backup, restore, migration, environment-variable, deployment, and rollback procedures.
- [ ] Perform a final production rehearsal with a fresh customer, sales employee, administrator, real media, and controlled notification providers.

## Verification ledger

| Date       | Item                                      | Evidence                                             | Result         |
| ---------- | ----------------------------------------- | ---------------------------------------------------- | -------------- |
| 2026-08-20 | Direct-recipient identifier validation    | API DTO/service test and typecheck                   | Passed locally |
| 2026-08-20 | Public vehicle media storage              | Vercel store, environment, and deployment inspection | Connected      |
| 2026-08-20 | Bilingual notification email presentation | Template and outbox tests                            | Passed locally |
