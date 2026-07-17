# RAHAL | رحال — Project Context and Build Contract

> This file is the source of truth for the RAHAL car-rental platform. Read it completely before planning, editing, generating code, changing architecture, or interpreting the Stitch exports.

## 1. Codex startup instruction

When a local Codex session starts in this repository:

1. Read this file completely.
2. Inspect the repository and the latest design export under `design-reference/`.
3. Treat Stitch HTML/CSS/JavaScript as a **visual reference only**. Do not copy it into production.
4. Preserve existing user changes. Do not overwrite unrelated work.
5. Before implementation, create or update:
   - `docs/PROJECT_REQUIREMENTS.md`
   - `docs/ARCHITECTURE.md`
   - `docs/DATABASE_SCHEMA.md`
   - `docs/IMPLEMENTATION_PLAN.md`
6. Record new product decisions in this file or an Architecture Decision Record under `docs/decisions/` so context is not lost between sessions.
7. Build in verified, reviewable phases. Run relevant tests after every material phase.

## 2. Product identity

| Field | Value |
|---|---|
| Arabic name | رحال |
| English name | RAHAL |
| Activity | Car rental company in Egypt |
| Current branches | One branch |
| Pickup | Rahal branch only |
| Return | Rahal branch only |
| Languages | Arabic and English |
| Arabic direction | RTL |
| English direction | LTR |
| Currency | EGP / ج.م only |
| Online payments | Not supported |

The branch address, business hours, phone numbers, WhatsApp numbers, location and social links must be editable by an administrator. The current address and contact numbers are visible in the supplied storefront/sign image and must be confirmed before production data entry.

## 3. Brand and UI direction

- Use the supplied Rahal crown/shield/R logo as the identity reference.
- Core visual language: charcoal black, warm metallic gold, off-white and warm gray.
- Suggested tokens from the accepted design direction:
  - Charcoal: `#1A1A1A`
  - Warm gold: `#C5A059`
  - Off-white: `#F9F9F9`
  - Border gray: `#E5E5E5`
- Premium, modern and trustworthy, but not limited to luxury customers.
- Gold is an accent, not a full-page background.
- Avoid excessive gradients, glow, heavy shadows and crowded layouts.
- Arabic and English must share the same components, data and information architecture. They are not separate websites.
- Properly mirror directional UI in RTL. Do not apply English letter spacing to Arabic text.
- All screens must be responsive and mobile-first.
- Accessibility: adequate contrast, keyboard navigation, visible focus states, semantic markup and large touch targets.

### Forbidden legacy design content

Remove or replace all generated references to:

- Rahal Elite / Elite Mobility
- UAE, Dubai or AED
- airport pickup or airport return
- concierge service
- online payment, checkout, cards, payment gateway or “secure transaction”
- SMS as the planned messaging channel; use official WhatsApp instead
- sales targets unless explicitly added later by the owner

## 4. Design references

The latest Stitch ZIP contains public pages and dashboard concepts. Use its screenshots and `DESIGN.md` as inspiration. Do not rely on its static HTML because it contains duplicated pages, CDN Tailwind, temporary external images, demo-only scripts and inconsistent data.

Accepted visual references include:

- Public home page
- Vehicle listing cards and filters
- Vehicle details and availability calendar
- Authentication layout
- Customer dashboard direction
- Sales dashboard direction
- Admin dashboard
- Vehicle management and add/edit vehicle
- Fleet calendar desktop/mobile
- Notification center, settings and delivery log
- Sales staff management
- Roles and permissions
- Employee activity and audit log

Known Stitch defects must be corrected during implementation:

- Some screens contain old dates and multiple currencies.
- Arabic and English public pages are inconsistent.
- Customer navigation accidentally contains admin items.
- Customer names appear in a general fleet calendar.
- Some screens contain airport pickup and payment-failure content.
- Desktop and mobile dashboards sometimes show different functions.
- Some screens expose full IP addresses.

## 5. Users and roles

### 5.1 Visitor

- Browse public pages and vehicles.
- Search availability and view public calendar availability.
- Cannot submit a reservation without an account.

### 5.2 Customer

- Account is mandatory before a reservation request.
- Phone and email must both be verified.
- Browse cars, availability and pricing rules.
- Submit and track reservation requests.
- Upload required protected documents.
- Receive requests for additional information.
- Accept or reject alternative vehicle/date offers.
- View current and historical requests/bookings.
- Leave feedback only after a completed rental.
- Configure permitted notification preferences.

### 5.3 Sales employee

- View requests according to assigned permissions.
- By default, sales may view all requests; admin can restrict a user to assigned requests.
- Review submitted data and protected documents only when authorized.
- Request more information.
- Pre-approve or reject requests when authorized.
- Offer alternative dates or vehicles.
- Record branch attendance, deposit and receipt details when authorized.
- Confirm bookings when authorized.
- Record delivery and return.
- Complete or cancel bookings when authorized.
- View customer rental history and add internal notes when authorized.

### 5.4 Administrator

- Full operational control.
- Manage sales accounts, roles and granular permissions.
- Revoke any permission from sales employees, including deposit confirmation.
- Manage vehicles, images, prices, rules, availability, maintenance and blocks.
- Manage branch information and working hours.
- Manage bilingual site content and legal/policy content.
- Configure notifications, templates, schedules and recipients.
- View audit logs and operational reports.

### 5.5 Suggested staff roles

- Sales Agent
- Senior Sales
- Sales Manager
- Administrator
- Super Administrator
- Custom role

Never assume a role grants every action. Enforce server-side permissions for every protected operation.

## 6. Authentication and account security

- Registration requires full name, phone, email and password.
- Verify phone with OTP.
- Verify email with a verification link or code.
- A customer cannot submit a reservation until both are verified.
- Use secure, HTTP-only, same-site cookies for browser sessions.
- Implement access/refresh session rotation or an equally secure server-managed session design.
- Rate-limit login, OTP, password reset, verification resend and document access.
- Hash passwords with a current memory-hard password-hashing algorithm.
- Support password reset, session revocation and device/session listing.
- Require staff to change temporary passwords on first login.
- Require MFA for admin and staff before production launch; customer MFA may be optional.
- Log authentication, permission changes, sensitive document access and critical booking actions.

## 7. Vehicle model and configurable rental rules

Every vehicle must support administrator-controlled fields:

- Arabic and English display name and description
- Make, model, year and category
- Registration/plate identifier
- Transmission, fuel type, seats, doors and luggage capacity
- Daily rate
- Weekly rate
- Minimum rental duration
- Optional maximum rental duration
- Driver policy:
  - mandatory
  - optional
  - unavailable
- Driver charging model:
  - per day
  - per trip
- Driver price
- Included driver working hours
- Additional-hour price
- Mileage allowance
- Additional-kilometre price
- Fuel policy
- Insurance information
- Security deposit amount
- Required customer/document rules
- Active/inactive status
- Featured status
- Multiple ordered images and one primary image

Vehicle operational statuses:

- Available
- Pending Request
- Confirmed Booking
- Rented / Active Rental
- Maintenance
- Manually Blocked
- Overdue
- Inactive / Archived

Vehicle rules must be data-driven and editable by admin, not hard-coded in the UI.

## 8. Customer eligibility and policy configuration

The administrator controls:

- Minimum customer age
- Minimum driving-licence age
- Required documents
- Egyptian-customer rules
- Foreign-customer rules
- Cancellation rules
- Preliminary approval expiration time
- Minimum and maximum rental duration
- Pickup and return time rules
- Mileage, fuel and driver policies
- Whether the customer may self-cancel at each status
- Customer blocking rules

Do not invent final legal wording. Policy and consent text require owner/legal approval before production.

## 9. Reservation request flow

There is **no online payment**. A request is not a confirmed reservation.

### Customer wizard

1. **Dates**
   - Pickup date/time
   - Return date/time
   - Rahal branch as pickup and return location
   - Availability and minimum-duration validation
2. **Driver**
   - Without driver, optional driver or mandatory driver, depending on the vehicle
   - Display pricing method, included hours and overtime price
3. **Customer**
   - Prefill verified account data
   - Date of birth, nationality, address and emergency contact
4. **Documents**
   - Required documents depend on admin rules and driver selection
   - Upload progress, validation and replacement/removal
5. **Terms and consent**
   - Rental terms
   - Vehicle condition
   - Same-fuel-level return rule
   - Mileage and driver rules
   - Branch attendance and deposit requirement
   - Cancellation and privacy policies
   - Separate consent for personal/document processing
   - Separate optional marketing consent
6. **Review and submit**
   - Mask personal data
   - Show document validation status, not document numbers
   - Show estimated price in EGP
   - State that the final amount is confirmed at the branch

### After submission

- Generate a human-readable request number such as `RHL-2026-000123`.
- Status begins as `Pending Review`.
- Notify customer and relevant staff.
- Final confirmation requires:
  1. Sales review
  2. Customer attendance at the branch
  3. Deposit payment at the branch
  4. Required receipts/contracts signed
  5. Authorized staff confirmation

## 10. Reservation statuses

Use an explicit state machine. Suggested states:

- `DRAFT`
- `PENDING_REVIEW`
- `UNDER_REVIEW`
- `MORE_INFORMATION_REQUIRED`
- `PRE_APPROVED`
- `ALTERNATIVE_OFFERED`
- `REJECTED`
- `EXPIRED`
- `CONFIRMED`
- `ACTIVE`
- `COMPLETED`
- `CANCELLED`
- `NO_SHOW`

Define allowed transitions, actor permissions, required fields and side effects for each transition. Do not let the client set arbitrary statuses.

## 11. Conflicts and availability

- Multiple customers may submit pending requests for overlapping dates.
- Pending requests do not guarantee the vehicle.
- Before confirmation, re-check availability inside one database transaction.
- Never allow two confirmed/active bookings for the same vehicle with overlapping periods.
- Enforce the conflict rule at the database/service layer, not only in the UI.
- When one request is confirmed, conflicting pending requests remain reviewable but must not be confirmable for the conflicting period.
- Sales may offer another vehicle or date, reject the request or wait for the selected vehicle.
- Maintenance and manual blocks also make the vehicle unavailable.
- Public calendars show availability only; never reveal customer identity.

## 12. Pricing

The UI displays an estimate, not an online charge.

Pricing may include:

- Daily or weekly vehicle rate
- Rental duration
- Optional or mandatory driver charge
- Driver overtime if applicable
- Additional configured operational fees
- Discounts only when an authorized policy/permission permits them

Store a versioned price snapshot with the request/booking so future vehicle-price changes do not rewrite historical totals.

The final amount and deposit are recorded by authorized staff after branch procedures. Record amount, receipt reference, staff member and timestamp. Do not store card data.

## 13. Protected customer documents

Possible documents:

- National ID front/back
- Driving licence front/back
- Passport for foreign customers when configured

Security requirements:

- Never store document bytes in PostgreSQL.
- Do not store documents in a public image bucket.
- Use private object storage with encryption and tightly controlled server-side access.
- Store only metadata/object keys in the database.
- Use short-lived signed access URLs generated after server-side authorization.
- Do not expose permanent document URLs to the browser.
- Log every view/download attempt.
- Downloads are disabled by default and require explicit permission.
- Mask national ID, passport and licence numbers in normal views.
- Never include documents or full identifiers in email, push or WhatsApp messages.
- Apply file type, size and malware/content validation.
- Define an approved retention/deletion schedule before production.
- Provide privacy notice, explicit consent and data-subject request handling.

Egyptian Personal Data Protection Law No. 151 of 2020 applies to electronically processed personal data. Production privacy, licensing, cross-border storage and retention decisions require qualified Egyptian legal review. Reference: https://www.acc.com/sites/default/files/program-materials/upload/Data%20Protection%20Law%20-%20Egypt%20-%20EN%20-%20MBH.PDF

## 14. Media storage

### Vehicle/public media

- Use Cloudinary or another approved public-media/CDN service.
- Store URL/object ID, alt text, primary flag and sort order in PostgreSQL.
- Optimize delivery formats and responsive sizes.

### Customer documents

- Use a separate private object-storage configuration/bucket.
- Never mix public vehicle images with customer identity documents.

## 15. Notification system

Notifications are real multi-channel operational notifications, not only a bell inside the website.

Channels:

- In-app notification center
- Web/mobile push using Firebase Cloud Messaging or an approved equivalent
- Transactional email from the company domain
- Official WhatsApp Business Platform API

No SMS channel is currently planned.

### Core events

- Account verification
- New reservation request
- Review started
- More information required
- Additional documents uploaded
- Preliminary approval
- Alternative offered
- Rejection
- Preliminary approval expiration
- Branch-attendance reminder
- Deposit recorded
- Booking confirmed
- Upcoming pickup
- Upcoming return
- Overdue return
- Rental completed
- Feedback request
- Maintenance due/completed
- Notification delivery failure

### Delivery design

- Use an outbox/queue architecture so business transactions and notification requests remain consistent.
- Persist notification event, channel, recipient, localized template version and delivery attempts.
- Support `QUEUED`, `SENT`, `DELIVERED`, `FAILED` and `READ` when the provider supports the state.
- Retry transient failures with bounded exponential backoff.
- Store provider webhook results idempotently.
- Do not claim a message was read unless the provider supplies a verified read event.
- Admin configures channels, recipients, templates, schedules, quiet hours and retry count per event.
- Users must grant browser/OS push permission; the site cannot force it.
- Operational notifications and optional marketing consent/preferences must be separate.

## 16. Dashboards

### Customer dashboard

- Current request/booking and required next action
- Request status timeline
- Pending, active, completed, rejected and cancelled lists
- Alternative offers
- Customer-visible sales messages
- Profile, verification and notification preferences
- Reservation history
- Feedback after completed rental

Do not show admin navigation, payments, sales reports or internal notes.

### Sales dashboard

- New and assigned requests
- Requests under review
- Pre-approved customers awaiting branch attendance
- Today’s pickups and returns
- Overdue vehicles
- Request inbox and filters
- Conflict warnings
- Protected document review when authorized
- Internal notes and customer-visible messages separated clearly
- Allowed workflow actions according to permission

### Admin dashboard

- Fleet summary
- Availability, rental and maintenance counts
- New/confirmed requests
- Today’s pickups and returns
- Deposits recorded (not online revenue)
- Failed notification alerts
- Staff activity
- Vehicle, customer, sales, content, policy and notification management

## 17. Fleet calendar

- Desktop: vehicles as rows, time/date as columns; day/week/month views.
- Mobile: day/agenda views with vehicle selector.
- Status colors for pending, confirmed, active, maintenance, blocked and overdue.
- General calendar displays reservation reference only, never customer name.
- Details panel is permission-protected.
- Actions such as confirm, block, maintain or extend require server-side authorization and confirmation dialogs.

## 18. Roles, permissions and audit

Granular permission areas:

- Reservations
- Protected documents
- Deposits and contracts
- Vehicle operations
- Customers
- Notifications
- Staff/role management
- Content and policy management
- Reports and audit

Critical principles:

- Deny by default.
- Enforce on the backend.
- UI hiding is not authorization.
- Administrator can revoke sales permissions.
- Document-download permission is off by default.
- Dynamic price modification is admin-only by default.
- Critical permission changes require confirmation and an entered reason.

Audit log fields:

- Timestamp
- Actor and effective role
- Action
- Entity type and reference
- Previous/new values with sensitive fields redacted
- Result
- IP/device metadata with restricted visibility
- Correlation/request ID

Audit records must not be editable or deletable through the dashboard.

## 19. Content management

Admin-editable bilingual content:

- Home page sections
- Featured vehicles
- Trust/benefit sections
- FAQs
- About Rahal
- Branch/address/contact information
- Working hours
- Rental terms
- Fuel policy
- Privacy policy
- Cancellation policy
- Notification templates

## 20. Technical baseline

Use this as the baseline unless repository constraints or an approved ADR change it:

| Layer | Technology |
|---|---|
| Web frontend | Next.js with TypeScript |
| Styling | Tailwind CSS with reusable design tokens/components |
| Backend API | NestJS with TypeScript |
| Database | PostgreSQL |
| ORM/migrations | Prisma |
| Public vehicle media | Cloudinary or approved equivalent |
| Private documents | Private S3-compatible object storage |
| Push | Firebase Cloud Messaging |
| Email | Transactional provider such as Resend, from Rahal domain |
| WhatsApp | Official Meta WhatsApp Business Platform Cloud API |
| Queue/cache | Redis-compatible service with a robust job queue |
| API documentation | OpenAPI/Swagger |
| Unit/integration tests | Jest or repository-equivalent |
| End-to-end tests | Playwright |

Recommended repository structure:

```text
rahal/
├── apps/
│   ├── web/                 # Next.js
│   └── api/                 # NestJS
├── packages/
│   ├── ui/                  # shared UI components/tokens
│   ├── contracts/           # shared schemas/types where appropriate
│   └── config/              # shared lint/ts config
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
└── README.md
```

Do not introduce microservices for the initial release. Prefer a modular monolith with clear NestJS modules and a separately deployed frontend. Keep module boundaries ready for later extraction only if scale justifies it.

Suggested backend modules:

- Auth
- Users
- Staff and Roles
- Vehicles
- Vehicle Media
- Availability
- Reservation Requests
- Bookings
- Customer Documents
- Deposits and Contracts
- Maintenance and Blocks
- Notifications
- Content
- Branch Settings
- Reviews
- Audit
- Reporting

## 21. Database design expectations

At minimum, evaluate entities for:

- users
- user_verifications
- sessions/devices
- roles
- permissions
- role_permissions
- user_permission_overrides
- vehicles
- vehicle_translations
- vehicle_images
- vehicle_rates/rules
- vehicle_blocks
- maintenance_periods
- reservation_requests
- reservation_request_status_history
- alternative_offers
- bookings
- booking_price_snapshots/items
- protected_documents
- document_access_logs
- deposits/receipts
- contracts
- internal_notes
- customer_messages
- notifications
- notification_templates
- notification_preferences
- notification_deliveries/attempts
- push_subscriptions/devices
- reviews
- branches/branch_settings
- content/translations
- audit_logs

Use timestamps, actor references, soft/archive semantics where appropriate, optimistic concurrency/version fields where needed, and idempotency keys for externally retried operations.

## 22. Public pages

- Home
- Vehicle listing/search
- Vehicle details
- Availability calendar
- How it works
- About
- Contact/branch map
- FAQs
- Rental terms
- Privacy policy
- Cancellation policy
- Sign in/register/verification/password reset

## 23. Demo data

Until real fleet data is supplied:

- Use 8–12 fictional vehicles.
- Use realistic Egyptian EGP pricing.
- Use clearly fictional customers and employees.
- Use current relative dates generated at seed time; do not hard-code 2023/2024 dates.
- Never use real identity-document images or numbers.
- Seed admin, sales and customer demo accounts through a documented development-only process.

## 24. Implementation phases

1. Repository/tooling foundation and documentation
2. Design system, localization and public shell
3. Database schema and migrations
4. Authentication, verification and session security
5. Admin-managed vehicles, media, rules and branch settings
6. Public fleet listing, filtering, vehicle details and availability
7. Reservation wizard, draft saving and protected document flow
8. Sales review workflow, alternatives, deposit/contract recording and booking confirmation
9. Fleet calendar, maintenance, blocks, delivery/return and completion
10. Customer dashboard and history
11. Staff, roles, permissions and audit
12. Notification outbox, push, email and WhatsApp integrations
13. Content management, reviews and reports
14. Security review, accessibility, performance, backups and end-to-end testing
15. Production deployment and operational monitoring

Each phase must have acceptance criteria and tests before it is considered complete.

## 25. Definition of done

A feature is not done until:

- Authorization is enforced server-side.
- Arabic and English are supported where user-facing.
- Desktop and mobile layouts are verified.
- Loading, empty, error and success states exist.
- Relevant audit events exist.
- Sensitive data is masked and protected.
- Unit/integration tests cover critical logic.
- Critical user journeys have end-to-end coverage.
- API validation and error responses are consistent.
- Documentation is updated.
- No generated Stitch placeholder, external temporary image or forbidden legacy content remains.

## 26. Immediate first task for local Codex

Do not immediately build the entire platform.

First:

1. Inspect all local files.
2. Report the current repository state and any conflicts with this document.
3. Propose the final monorepo structure and dependency choices.
4. Produce the four documents listed in Section 1.
5. Propose the first implementation milestone with acceptance criteria and tests.
6. Wait for approval only when a material business/architecture decision is genuinely unresolved; otherwise proceed using this document.
