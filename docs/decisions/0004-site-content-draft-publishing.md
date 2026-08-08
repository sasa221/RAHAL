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
- Administrator mutations require an authenticated `ADMIN` or `SUPER_ADMIN` session.
- Every save and publish records actor, reason, section, locale set, status, and a SHA-256 content
  hash. Full public copy is not duplicated into the audit log.
- The API rejects the prohibited legacy geography, currency, pickup, concierge, Elite, and SMS
  terminology before persistence.
- If a section has never been published, the existing reviewed application copy remains the public
  fallback.

## Consequences

Administrators gain a safe bilingual publishing workflow and live preview. Editing and publishing
are explicit separate actions, public reads stay cache-safe and privacy-bounded, and policy copy
cannot accidentally bypass its dedicated approval boundary.
