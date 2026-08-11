# RAHAL Database Schema Plan

## Current schema state

`packages/database/prisma/schema.prisma` currently defines a useful initial Prisma schema with:

- Users, verification codes, staff roles, permissions, and overrides.
- Branches.
- Vehicles, images, and blocks.
- Reservations, documents, events, deposits, notifications, push subscriptions, audit logs, and reviews.
- Core enums for roles, statuses, driver policy, documents, notifications, and delivery state.

The repository now contains reviewed, ordered migrations for the implemented foundation through protected contract access and encrypted push delivery. The schema is forward-migrated rather than edited in production, and every release must run `prisma migrate deploy` as a one-off job.

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

Administrator customer control reuses `User.status`, `Session.status/revokedAt`, reservation and
booking counts, `NotificationPreference`, and `AuditLog`; it requires no duplicate customer table.
The browser contract receives masked contact projections only. Status transactions record
`CUSTOMER_STATUS_CHANGE` with bounded status metadata and reason, never customer profile or identity
payloads.

`ContactChangeChallenge` stores one customer, finite email/phone kind, HMAC target hash, HMAC code
hash, attempts, expiry, consumption time, and creation time. It intentionally has no email or phone
column. Confirmation uses a conditional transaction before updating `User.email` or `User.phone`,
refreshing the matching verification timestamp, revoking other sessions, and writing bounded audit
metadata.

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

Signed contracts use `Contract.storageKey` only after a protected PDF passes signature, size, and malware checks. `ContractAccessLog` separately records the staff actor, operational reason, result, timestamp, and bounded request context for every protected contract view. Neither customer contracts nor administrator audit projections include the object key.

## Notifications

- `notifications`: in-app notification records.
- `notification_events`: outbox events emitted by business transactions.
- `notification_templates`: localized, versioned templates per event/channel.
- `notification_preferences`: user preferences and marketing consent.
- `notification_deliveries`: per-channel delivery state.
- `notification_attempts`: retry attempts, provider response, error, timestamp.
- `push_subscriptions`: hashed push token, platform, active state.

The Web Push endpoint and keys are stored only inside `PushSubscription.subscriptionCiphertext`; `tokenHash` is the lookup/revocation identifier. `NotificationDelivery` has a unique `(notificationId, channel)` key so a successful provider channel is not duplicated when another channel causes an outbox retry.

`PolicyVersion` rows are immutable legal copies. A complete production bundle is exactly four required policy keys across `ar` and `en` with the same version/effective timestamp. Publishing retires the previous active rows and creates all eight new rows in one transaction; reservation submission independently rereads the complete active version.

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

Protected review uses the existing `ReservationDocument` verification fields and `DocumentAccessLog`. Inline views record `VIEW_INLINE`; decisions record `REVIEW_VERIFY` or `REVIEW_REJECT`. Rejection stores a bounded customer-facing reason, while object keys stay confined to `ReservationDocument.storageKey` and are never copied into access logs, events, notifications, or browser contracts. The administrator document-oversight reader projects the access actor, reservation reference, safe document type/status, action, reason, result, and timestamp directly from these relations; it excludes file metadata, identity values, `ipHash`, and storage data.

The administrator policy workspace edits `DocumentRequirementRule` records without deleting historical configuration. The identity tuple is customer category, document type, and self-drive condition; the editable policy surface is the bilingual label, finite MIME allowlist, maximum bytes, active state, and order. Service validation preserves at least one active non-self-drive rule per customer category. Audit snapshots contain rule configuration only and never reservation, customer, file, or private-storage data.

The in-app inbox uses `Notification(userId, readAt, createdAt)` and never reads provider fields from `NotificationDelivery` or payloads from `NotificationEvent`. Owner-scoped conditional updates set `readAt` once; repeated reads return the existing timestamp. Archived notifications are excluded, and list size is bounded independently from the unread count.

`NotificationCampaign` is the attributable parent record for a staff-authored broadcast. It stores
finite category/audience values, bilingual copy, selected `NotificationChannel[]`, a safe internal
target path, consent classification, importance, creator, recipient count, and creation time.
Recipient rows remain normal `Notification` records through the nullable `campaignId` relation, so
read ownership and channel delivery guarantees are unchanged. Delivery history is calculated from
the related `NotificationDelivery` rows; customer email addresses and phone numbers are not copied
into the campaign.
`NotificationCampaign.audience` may also contain the bounded `INDIVIDUAL` value for a one-recipient
send. The recipient identity remains represented only by the related owner-scoped `Notification`
row; campaign history and audit reason record the finite audience and recipient count, not an email,
phone number, or copied user identifier.

Draft recovery requires no new table. Live rows are existing `Reservation` records with `status = DRAFT` and `pickupAt` in the future. Owner abandonment or pickup-time expiry conditionally moves the row to `EXPIRED`, appends a `ReservationEvent`, and sets `deletedAt` on active `ReservationDocument` metadata in the same transaction. Private object keys are selected only for post-transaction storage deletion and never enter the browser response, event note, audit payload, or notification payload.

The staff-access slice activates the existing `StaffRole`, `Permission`, `StaffRolePermission`, and `UserPermissionOverride` models with a fixed permission catalog. A data migration creates the safe default `Sales Agent` role and attaches only legacy sales users without an assigned role. Role grants are additive; a per-user override is authoritative. Access changes revoke active `Session` rows and append a redacted `AuditLog` in the same transaction. Password hashes and session hashes never enter audit JSON.

The staff-authentication slice adds `User.mustChangePassword`, `User.temporaryPasswordIssuedAt`, and `Session.mfaVerifiedAt`. `StaffLoginChallenge` stores a hashed opaque challenge token, bounded attempts, expiry, use timestamp, and an optional encrypted enrollment secret. `StaffMfaCredential` stores one AES-256-GCM ciphertext and the last accepted TOTP counter. Child `StaffMfaRecoveryCode` rows store only unique HMAC hashes and one-time use timestamps. Enabling MFA consumes the challenge, creates the credential and recovery hashes, revokes older sessions, and writes a bounded audit record transactionally.

Password recovery uses the existing `VerificationCode` rows with `purpose = RESET_PASSWORD`; `codeHash`, `expiresAt`, `attempts`, and `usedAt` provide one-time bounded verification without a new plaintext-token table. Successful recovery updates `User.passwordHash` and revokes every active `Session` transactionally. Authenticated changes revoke every active session except the current row. Session read models select timestamps and user-agent only long enough to derive generic labels; they never select `refreshTokenHash` or `ipHash`.

Completed-rental feedback uses the existing unique `Review.reservationId` relationship. `ReviewStatus` separates `PENDING`, `APPROVED`, and `REJECTED`; moderator identity, note, and timestamp make the decision attributable, while `approvedAt` remains the explicit publication timestamp. Indexes support the moderation queue and approved vehicle review reads. The migration backfills legacy rows with `approvedAt` as approved and leaves all other legacy rows pending.

Customer account preferences reuse the unique `NotificationPreference.userId` relationship. Self-service upserts keep `inAppEnabled = true`; Email, WhatsApp, Push, marketing consent, and optional paired quiet-hour strings remain independent. Profile defaults live on `User`, while submitted reservations continue using immutable customer snapshot fields so later account edits cannot rewrite operational history.

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

## Public content publication snapshot

`ContentEntry.key` is a finite application-owned identifier for an editable public section.
`ContentTranslation.locale` provides the Arabic or English row. The existing `title` and `body`
columns are the current draft; nullable `publishedTitle` and `publishedBody` columns preserve the
last explicitly published snapshot. `ContentEntry.publishedAt` records the section publication
time. Public reads select only rows with complete published snapshots, while administrator reads
may compare draft and published hashes to show unpublished changes.

The snapshot columns deliberately do not replace the immutable legal-policy schema. Policy text
continues to use `PolicyVersion` and `PolicyTranslation` with its dedicated approval rules.
