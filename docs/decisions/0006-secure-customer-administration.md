# 0006: Secure customer administration

- Status: Accepted
- Date: 2026-08-08

## Context

Rahal administrators need to find customer accounts, understand verification and reservation
activity, and restrict compromised or abusive accounts. Reusing full customer profiles or document
review responses would expose far more personal data than this operational decision requires.

## Decision

Create a dedicated administrator-only read model. Search may match stored name, email, or phone on
the server, but the response always masks contact values. Detail adds only aggregate activity,
communication flags, bounded recent request metadata, and bounded status audit events. Identity
fields, documents, private notes, storage data, and session/device metadata remain excluded.

Apply account-state changes in one database transaction: update the finite status, revoke active
sessions, and append a bounded audit record with the mandatory reason and previous/new status.
Archived records are outside this operational recovery path.

## Consequences

- Administrators can act without receiving unnecessary identity data.
- Restricted users lose every active session immediately.
- Status decisions remain attributable and reviewable.
- Restoring archived records requires a separate, explicitly designed retention workflow.
