# RAHAL | رحال

Bilingual car-rental reservation and fleet-management platform for Egypt.

## Applications

- `apps/web`: Next.js customer website and role-based dashboards.
- `apps/api`: NestJS REST API.
- `packages/database`: Prisma schema and PostgreSQL client.
- `packages/contracts`: Shared API response and domain types.
- `packages/ui`: Shared brand tokens and reusable UI primitives.
- `packages/config`: Shared repository configuration.

## Local setup

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000
- API health: http://localhost:4000/api/health
- PostgreSQL: `127.0.0.1:5433` (the container uses `5432` internally)

The public UI currently uses fictional local content, while the API reads a fictional eight-vehicle fleet and branch from PostgreSQL. The reservation wizard now reaches a masked final review and a guarded `PENDING_REVIEW` submission; the active development-only policy bundle intentionally prevents real submission until approved legal copy is installed. Drafts support private document uploads through a development-only local adapter configured by `PRIVATE_DOCUMENT_STORAGE_PATH`; production must use approved private S3-compatible storage before uploads are enabled. Production integrations for email, push notifications, and WhatsApp are intentionally not configured yet.

## Authentication foundation

The API exposes the first secure account/session slice under `/api/auth`:

- `POST /register`: creates a pending-verification customer account.
- `POST /login`: accepts email or phone plus password.
- `GET /session`: returns the current redacted user session.
- `DELETE /session`: revokes the current session.
- `POST /verification/request`: issues a short-lived phone or email verification code.
- `POST /verification/confirm`: validates the current code and activates fully verified accounts.

Passwords use Node's memory-hard scrypt implementation. Browser sessions use an opaque token in an HTTP-only, same-site cookie; only the token hash is stored. Set a unique `AUTH_SECRET` of at least 32 characters in every deployed environment. Bilingual customer sign-in, registration, verification, password recovery, password change, and session management are implemented. Verification and recovery codes are never returned by the API or rendered in the browser. Email verification can be delivered through Gmail SMTP during local development with `GMAIL_SMTP_USER` and a Google App Password, allowing delivery to arbitrary test recipients without a custom domain. Production delivery uses Resend with `RESEND_API_KEY`, `VERIFICATION_EMAIL_FROM`, and a verified sender domain. Phone verification uses an approved Meta authentication template through the four `WHATSAPP_*` settings in `.env.example`. A signed HTTPS webhook remains available as an alternative provider boundary. Each channel fails closed when its provider is absent or rejects delivery, and the database retains only code HMACs.

Customer registration accepts passwords from 8 to 128 characters. The bilingual account UI applies the same limit before submission, while the API remains the authoritative validation boundary.

## Sales review foundation

Authorized sales and administrator accounts can open the shared staff workspace at `/sales` or `/en/sales`. It lists active submitted requests, returns only masked customer and safe document metadata, and lets one employee atomically claim an unassigned request for `UNDER_REVIEW`. The assigned reviewer can request more information, reject with a customer-visible reason, or issue a 48-hour pre-approval. None of these actions confirms a booking or exposes private storage keys. Alternative offers and audited document viewing remain pending.

Authenticated customers can track only their own submitted requests at `/account/requests` or `/en/account/requests`. They see safe request/document states and the customer-visible conversation. If sales requests more information, a bounded customer reply returns the request to `UNDER_REVIEW` and notifies the assigned reviewer without confirming a booking.

The assigned reviewer can also send a 48-hour alternative vehicle/date offer after availability checks. The customer may accept or decline it from the same request page; either response returns the request to sales review, and acceptance still does not confirm or create a booking. Protected document viewing and review are permission-checked, reason-gated, non-cacheable, and audited.

The API runs a non-overlapping review-window sweep on startup and every minute. Expired alternatives return to sales review, expired pre-approvals close as `EXPIRED`, and both paths write auditable events and notifications without creating bookings.

## Completed-rental reviews

Customers can submit one moderated review from their request detail only after the branch rental lifecycle is completed. Administrators review pending feedback at `/admin/reviews` or `/en/admin/reviews`; approved privacy-minimized experiences appear at `/reviews` and `/en/reviews`. Public review responses never expose full customer names, contact details, documents, or internal operational notes.

## Customer account preferences

Customer self-service is available at `/account/profile` and `/en/account/profile`. Customers can update future profile defaults and independently configure Email, WhatsApp, Push, marketing consent, and quiet hours while the essential in-app channel remains enabled. Verified sign-in email and phone are read-only, submitted reservation snapshots are unchanged, and external preferences take effect only when their approved production delivery workers are configured.
