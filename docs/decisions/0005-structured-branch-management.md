# ADR 0005: Structured branch management and safe lifecycle

## Status

Accepted locally for Task 6 on 2026-08-21. Production deployment remains intentionally deferred.

## Decision

- A branch keeps bilingual structured address parts alongside the existing full Arabic and English
  address fields.
- `DRAFT`, `ACTIVE`, and `INACTIVE` are explicit lifecycle states. Only active, administrator-approved
  records are returned by the public API.
- Phone numbers are stored as a validated international list. Manual WhatsApp contact has one
  independent number, visibility flag, and Arabic/English opener; legacy `whatsappNumbers` remains
  a temporary read fallback.
- Weekly working hours contain all seven days in `Africa/Cairo`, plus dated holiday exceptions.
- Map selection stores latitude and longitude together. Raw coordinates remain an advanced editor
  option rather than the primary location workflow.
- Branch viewing, editing, creation, disabling, and deletion use separate server permissions.
- Deletion is allowed only when vehicle, reservation, and booking counts are all zero. A referenced
  branch must be disabled instead.
- Creation, update, disable, and deletion produce immutable audit events with bounded snapshots.

## Migration safety

Migration `20260821152000_structured_branch_management` is additive. It does not rewrite legacy
addresses, contacts, coordinates, or working-hours JSON. Existing `active` values are copied to the
new status column. The application reads old working-hours and WhatsApp shapes as temporary
fallbacks until every real branch has been reviewed and saved through the structured editor.

The compatibility fields may be removed only after an approved database backup and a verified
production migration report. Task 6 does not perform that cleanup.
