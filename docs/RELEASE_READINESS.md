# RAHAL Release Readiness

This file is the working release gate for the first real RAHAL launch. A production deployment must not be approved while any item marked **Launch blocker** remains open.

## Current verified baseline

- The monorepo builds the web, API, shared contracts, UI package, and Prisma package successfully.
- PostgreSQL migrations are applied locally and the development database is healthy.
- Public, customer, sales, and administration routes are bilingual and share implementation components.
- Customer requests remain separate from booking confirmation and use EGP only.
- Protected document metadata, staff permissions, audit, staff MFA, booking operations, and in-app notifications have server-side boundaries.
- The public information surface now includes About, How it works, Contact, FAQ, Rental terms, Privacy, and Cancellation in Arabic and English.
- The root HTML language and direction are selected from the requested route before render.
- A public Vercel staging tier may run with managed PostgreSQL and Redis while missing document, scanner, or WhatsApp providers fail closed at their feature boundaries. This does not close or defer any production launch blocker.

## Release gates

| Area                            | State              | Required closure                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public storefront and fleet     | Code-complete      | Local Arabic/English mobile and desktop route, overflow, semantics, metadata, and accessibility audits pass; owner must replace fictional fleet/media.                                                                                                                                                                                                            |
| Customer request journey        | Code-complete      | Run a clean account-to-submission staging journey after approved policies, real providers, and private storage are configured.                                                                                                                                                                                                                                    |
| Sales and booking lifecycle     | Code-complete      | Run claim through completion/cancellation/no-show as one staging E2E suite against managed dependencies.                                                                                                                                                                                                                                                          |
| Administration                  | Code-complete      | Branch, fleet, documents, policy publication, bilingual public-content publishing, operational reports/data-quality checks, staff/access, reviews, audit, and operations are implemented; owner approval and provider operations remain external.                                                                                                                 |
| Legal copy                      | **Launch blocker** | Owner and qualified Egyptian legal review must approve versioned rental, privacy, document-processing, cancellation, retention, and deposit-settlement wording.                                                                                                                                                                                                   |
| Branch and contact data         | **Launch blocker** | Owner must confirm the real address, map coordinates, hours, phone, WhatsApp, and social links.                                                                                                                                                                                                                                                                   |
| Fleet and public media          | **Launch blocker** | Replace fictional fleet records and images with approved vehicles, prices, rules, alt text, and CDN media identifiers.                                                                                                                                                                                                                                            |
| Private documents and contracts | **Launch blocker** | Code is complete for private S3-compatible storage, signed scanning, signed-contract upload/access, and audit; provision services and approve retention/deletion.                                                                                                                                                                                                 |
| External notifications          | **Launch blocker** | Outbox, retries, channel idempotency, preferences, quiet hours, Brevo with Resend fallback, Meta templates, Web Push, serverless request draining, protected recovery, and admin delivery visibility are implemented. Twilio Verify WhatsApp may validate phone-code UX in staging only; provision/verify Meta and Web Push production credentials before launch. |
| Shared rate limiting            | **Launch blocker** | Redis-backed atomic throttling and readiness are implemented; provision a production TLS Redis service.                                                                                                                                                                                                                                                           |
| Secrets                         | **Launch blocker** | Provision unique production database, auth, MFA, provider, webhook, storage, and queue secrets through the deployment secret manager.                                                                                                                                                                                                                             |
| Production operations           | **Launch blocker** | Readiness, bounded request logging, dependency audit, containers, backup/restore, deploy, and rollback procedures exist; provision monitoring and execute a restore drill.                                                                                                                                                                                        |
| CI and staging                  | **Launch blocker** | CI quality gates are committed; deploy staging, apply migrations, seed fictional staging data, and complete role-based E2E acceptance.                                                                                                                                                                                                                            |

## UI route matrix

The release audit covers both Arabic and English variants at mobile, tablet, and desktop sizes.

### Public

- Home
- Fleet listing and filtering
- Vehicle detail and availability
- Reviews
- About Rahal
- How it works
- Contact and branch
- FAQ
- Rental terms
- Privacy
- Cancellation
- Authentication, verification, recovery, and staff security

### Customer

- Reservation wizard and saved draft recovery
- Request history, request detail, conversation, alternatives, and branch progress
- Profile and notification preferences
- Verified email/phone replacement with destination-bound OTP and other-session revocation
- Password and session security
- Completed-rental review
- Notification center

### Sales

- Review queue and exclusive claim
- Protected request detail and document studio
- Information request, rejection, pre-approval, and alternatives
- Branch attendance, deposit, contract, and final confirmation
- Delivery, return, completion, cancellation, and no-show
- Fleet calendar and notification center

### Administration

- Operations overview
- Audit log
- Document-access oversight
- Document requirement policies
- Reviews moderation
- Staff, roles, permissions, and MFA onboarding
- Vehicle registry and fleet blocks
- Branch, content, notification templates/providers, and reporting where implemented
- Bilingual public content studio with separate draft and published states
- Operational reports with period/branch filters, cohort conversion, fleet utilization, branch
  deposits, staff/vehicle performance, data-quality status, and aggregate CSV export
- Privacy-minimized customer administration with masked contacts, verification/activity filters,
  bounded request history, audited account controls, and immediate session revocation

## Owner and external inputs

These items cannot be guessed or silently replaced by demo values:

- Approved legal and privacy wording and retention periods.
- Real branch details and operational hours.
- Real fleet, registration identifiers, prices, deposits, driver rules, mileage, fuel, and insurance policies.
- Company domain and DNS control.
- Authenticated Brevo or Resend sender, Meta WhatsApp Business, VAPID Web Push, private object storage, malware-scanning, Redis, monitoring, and hosting credentials.
- Deposit refund, cancellation, damage, no-show, and traffic-violation policy.

## Final approval rule

Production is ready only when:

1. Every launch blocker above is closed or explicitly deferred in an approved ADR.
2. Formatting, lint, all tests, type checking, Prisma validation, production build, and migration checks pass from a clean checkout.
3. The full customer, sales, and administrator E2E journeys pass in staging on mobile and desktop.
4. Security, privacy, backup/restore, accessibility, and performance checks have evidence.
5. The owner signs off on real content, fleet, branch data, and legal versions.
