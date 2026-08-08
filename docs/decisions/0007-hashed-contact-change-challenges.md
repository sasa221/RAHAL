# 0007: Hash-only contact-change challenges

- Status: Accepted
- Date: 2026-08-08

## Context

Customers need to replace a verified sign-in email or phone. Treating those fields as ordinary
profile inputs would bypass verification. Persisting a pending destination as plaintext would also
create another sensitive-data surface.

## Decision

The browser resubmits the normalized target during confirmation. The server stores only an HMAC of
that target and an HMAC of the owner, finite channel, target hash, and code. Confirmation recomputes
both hashes, applies expiry and attempt limits, and then conditionally consumes the challenge inside
the same transaction that changes and verifies the contact.

The current session remains active so the successful user is not unexpectedly signed out. Every
other active session is revoked. The audit row records only channel and revoked-session count.

## Consequences

- Pending contact destinations are not recoverable from the challenge table.
- A stolen code cannot authorize a different destination or channel.
- The user must resubmit the exact normalized destination with the code.
- Provider delivery to the new destination is required before any account field changes.
