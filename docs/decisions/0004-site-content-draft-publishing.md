# ADR 0004: Bilingual site-content draft and publishing boundary

## Status

Accepted on 2026-08-08.

## Context

RAHAL administrators need to maintain the public home, About, How it works, FAQ, and Contact
presentation in Arabic and English without a code deployment. Public copy must remain internally
consistent, must not revive prohibited legacy geography or services, and must not expose an
unfinished edit while an administrator is still working.

Legal policies remain outside this general content editor because they require an immutable,
versioned approval workflow and qualified review.

## Decision

- One `ContentEntry` identifies each supported public section.
- Each Arabic and English `ContentTranslation` keeps a mutable draft and a separate published
  snapshot.
- Saving a draft never changes the customer-facing site.
- Publishing copies both complete locale drafts to their published snapshots in one transaction.
- The public API returns published snapshots only and returns no draft metadata.
- Editing requires the independent `content.edit` permission. Publishing requires
  `content.publish`; the default matrix grants it to `SUPER_ADMIN` only, while an explicit staff
  override can delegate it without widening unrelated administrator access.
- Every save and publish records actor, reason, section, locale set, status, and a SHA-256 content
  hash. Full public copy is not duplicated into the audit log.
- The API rejects the prohibited legacy geography, currency, pickup, concierge, Elite, and SMS
  terminology before persistence.
- If a section has never been published, the existing reviewed application copy remains the public
  fallback.

### Typed-content migration (2026-08-21)

- Schema version 2 replaces the generic title/paragraph/item editor with a discriminated document
  for each supported section: hero, process, trust features, editorial pages, FAQ, and contact.
- Migration `20260821113000_typed_site_content` is additive. It adds draft and published schema
  version markers and never rewrites either JSON snapshot.
- Existing version 1 JSON remains readable during the transition. Opening it in the studio creates
  an in-memory version 2 draft; the old row is not changed until an authorized editor explicitly
  saves it.
- A version 2 save stores the typed document and a compatibility projection. Public reads prefer
  the published typed document and temporarily fall back to the published version 1 fields or the
  reviewed application defaults.
- Publishing copies the complete draft JSON and its schema version to the published snapshot in the
  same transaction. Later draft saves do not modify the published JSON or published schema version.
- The fallback is temporary and must be removed only after every supported section has a verified,
  bilingual version 2 publication and a database backup has been approved.

## Consequences

Administrators gain a safe bilingual publishing workflow and live preview. Editing and publishing
are explicit separate actions, public reads stay cache-safe and privacy-bounded, and policy copy
cannot accidentally bypass its dedicated approval boundary.
