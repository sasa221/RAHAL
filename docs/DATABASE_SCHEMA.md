# RAHAL Database Schema Plan

## Current schema state

`packages/database/prisma/schema.prisma` currently defines a useful initial Prisma schema with:

- Users, verification codes, staff roles, permissions, and overrides.
- Branches.
- Vehicles, images, and blocks.
- Reservations, documents, events, deposits, notifications, push subscriptions, audit logs, and reviews.
- Core enums for roles, statuses, driver policy, documents, notifications, and delivery state.

There are no migrations yet. The schema should be treated as a draft, not a production contract.

## Required schema direction

The production schema should support the entities below. Some already exist partially and should be refined rather than duplicated.

## Identity and access

- `users`: customers, staff, admins, profile data, verification timestamps, locale, account status.
- `user_verifications`: verification lifecycle history for email and phone, not only current OTP codes.
- `verification_codes`: hashed OTP/link tokens, attempts, expiry, use timestamp.
- `sessions`: server-side browser sessions, refresh rotation, device metadata, revocation.
- `devices`: optional normalized device/session listing for user-facing session management.
- `roles`: staff/admin role definitions.
- `permissions`: granular permission keys.
- `role_permissions`: role-to-permission mapping.
- `user_permission_overrides`: explicit allow/deny overrides with reason and actor metadata.

## Branch and content

- `branches`: branch names, address, coordinates, active flag.
- `branch_settings`: phones, WhatsApp numbers, working hours, maps/social links, operational rules.
- `content_entries`: editable bilingual content blocks.
- `content_translations`: Arabic and English text and publish state.
- `policy_versions`: terms, privacy, cancellation, fuel, and consent text versions.

## Vehicles and availability

- `vehicles`: operational vehicle identity, status, make/model/year/category, registration, seats, doors, luggage, active/archive state, featured flag.
- `vehicle_translations`: Arabic and English display name, description, fuel/insurance/policy text.
- `vehicle_images`: public media provider key, URL, alt text, primary flag, sort order.
- `vehicle_rate_rules`: versioned daily/weekly rates, minimum and maximum duration, deposit, driver policy, mileage, fuel, insurance, required document rule references.
- `vehicle_blocks`: manual blocks and maintenance periods, actor, reason, time window.
- `maintenance_periods`: optional richer maintenance records if separate lifecycle details are needed.

## Reservation and booking lifecycle

- `reservation_requests`: request reference, customer, selected vehicle/branch, dates, status, customer details snapshot, consent timestamps, assigned staff, expiry fields.
- `reservation_status_history`: state transitions, actor, reason, metadata.
- `alternative_offers`: alternate vehicle/date proposals, customer decision, expiry.
- `bookings`: confirmed booking record distinct from request review state.
- `booking_operations`: unique delivery/return handover readings with odometer, fuel percentage, condition note, staff actor, and timestamp.
- `booking_price_snapshots`: immutable summary of estimate/final price basis.
- `booking_price_snapshot_items`: line items for vehicle rate, driver charge, overtime, fees, discounts.
- `deposits`: amount, receipt reference, staff, timestamp.
- `contracts`: signed contract metadata and private object key.
- `internal_notes`: staff-only notes separated from reservation table.
- `customer_messages`: customer-visible sales messages separated from internal notes.
- `reviews`: customer feedback after completed rental.

## Protected documents

- `protected_documents`: metadata and private storage key for uploaded customer documents.
- `document_access_logs`: every view/download/sign-url attempt, actor, result, reason, IP hash, user agent, correlation ID.
- `document_required_rules`: admin-managed rule sets for Egyptian customers, foreign customers, driver selection, and vehicle-specific rules.

Document bytes must never be stored in PostgreSQL.

### Implemented customer snapshot slice

The current `Reservation` model now stores optional name, email, phone, nationality, address, emergency-contact, and completion-time snapshots for the authenticated draft owner. No identity-document number is stored in these snapshot fields. A reviewed migration adds the nullable fields so existing drafts remain valid.

The existing consent timestamps now record required terms, privacy, document-processing, and operational consent together with `termsVersion`. `marketingConsentAt` remains nullable and independent. Active bilingual consent text is selected from `PolicyVersion`; the current seed is development-only rather than approved production legal copy.

The protected-document slice now records an explicit Egyptian/foreign customer category snapshot and database-backed `DocumentRequirementRule` records. Rules select document type, localized label, self-drive condition, allowed MIME types, and maximum size. `ReservationDocument` stores only private object keys and metadata; replacement and removal soft-delete prior metadata, while no storage key is returned to the browser.

The submission slice adds nullable `Reservation.submittedAt`. A guarded transaction sets it only when a fully eligible `DRAFT` changes to `PENDING_REVIEW`, then writes the matching `ReservationEvent`, customer `Notification`, and privacy-minimized `NotificationEvent` outbox record. A `Booking` remains a separate later record and is never created by customer submission.

The branch-confirmation slice adds nullable `Reservation.branchAttendedAt`. A `PRE_APPROVED` request stores branch attendance, one configured-EGP `Deposit` with a unique receipt reference, and a signed `Contract` before confirmation is allowed. Final confirmation performs a new vehicle-block and confirmed/active-booking conflict check inside the transaction, creates the separate `Booking` and immutable EGP `BookingPriceSnapshot`, links the signed contract, and only then exposes a safe booking reference to the customer. Receipt data and contract storage keys remain staff-side.

The booking-operation slice stores delivery and return readings in `BookingOperation`, unique per booking and operation type. Database constraints keep odometer readings non-negative and fuel between zero and 100 percent. The service permits only `CONFIRMED → ACTIVE`, an `ACTIVE` return record, and returned `ACTIVE → COMPLETED`; cancellation and no-show close only a not-yet-delivered confirmed booking. Customer responses expose lifecycle timestamps, never staff condition notes or vehicle readings.

## Notifications

- `notifications`: in-app notification records.
- `notification_events`: outbox events emitted by business transactions.
- `notification_templates`: localized, versioned templates per event/channel.
- `notification_preferences`: user preferences and marketing consent.
- `notification_deliveries`: per-channel delivery state.
- `notification_attempts`: retry attempts, provider response, error, timestamp.
- `push_subscriptions`: hashed push token, platform, active state.

## Audit

- `audit_logs`: append-only critical event log with actor, action, entity, redacted before/after data, result, reason, IP/device metadata, correlation ID.

The dashboard must not allow audit records to be edited or deleted.

## Enums and state machines

Reservation states:

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

Vehicle operational states should include:

- `AVAILABLE`
- `PENDING_REQUEST`
- `CONFIRMED_BOOKING`
- `RENTED`
- `MAINTENANCE`
- `MANUALLY_BLOCKED`
- `OVERDUE`
- `INACTIVE`
- `ARCHIVED`

State changes must happen through backend services that validate actor permissions, required fields, allowed transitions, side effects, and audit events.

The implemented fleet-calendar read model uses `VehicleBlock`, active `Booking` rows, and review-stage `Reservation` rows without persisting a duplicate calendar table. `VehicleBlock.createdBy` records the administrator identifier, and each create/remove operation also writes a redacted `AuditLog`. Pending reservations are demand indicators only; availability is blocked only by confirmed/active bookings and maintenance/manual block ranges.

Vehicle registry writes reuse the existing `Vehicle` model. The administrator API never accepts `VehicleStatus`; publication maps only to `AVAILABLE` or `INACTIVE`, while booking, rental, maintenance, and overdue states remain service-owned. Existing unique registration and slug constraints protect identity, and audit JSON intentionally contains only operational fields rather than related customer or document data.

`AlternativeOffer` preserves the proposed vehicle, pickup/return range, daily vehicle rate, optional daily driver rate, estimated EGP total, expiry, and response independently from the original reservation. The original reservation selection changes only after owner acceptance and another availability check. Pending offers are never bookings.

## Constraints and indexes

Required constraints:

- Unique email and phone for users.
- Unique vehicle registration/plate identifier.
- Unique reservation reference.
- Unique deposit receipt reference.
- Prevent overlapping confirmed/active bookings for the same vehicle.
- Prevent confirmation during maintenance or manual blocks.
- Ensure reservation return time is after pickup time.
- Ensure rental duration respects active rate/rule configuration.

Required indexes:

- User role/status.
- Vehicle branch/status/active.
- Vehicle category/rate.
- Reservation vehicle/date/status.
- Reservation customer/date.
- Reservation assigned staff/status.
- Notification recipient/read/date.
- Delivery status/channel/date.
- Audit actor/date and entity/date.
- Document reservation/type/status.

PostgreSQL range types and exclusion constraints should be considered for overlap protection. Use raw SQL migrations when Prisma cannot express a required database invariant.

## Data protection notes

- Store IP addresses as hashes or restricted metadata, not casually visible raw values.
- Redact sensitive fields in audit before/after JSON.
- Use retention/deletion policy fields once legal review is complete.
- Soft-delete or archive operational records only where legally and operationally appropriate.

## Immediate schema actions

1. Preserve the existing draft schema as a starting point.
2. Add missing fields and entities in a migration-oriented pass.
3. Introduce explicit booking and price snapshot models.
4. Add document access logs before implementing any document viewing.
5. Add session/device models before production authentication.
6. Add raw SQL constraints for booking/block overlap before confirmation workflows are enabled.
