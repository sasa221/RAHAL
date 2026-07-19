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

The public UI currently uses fictional local content, while the API reads a fictional eight-vehicle fleet and branch from PostgreSQL. Reservation drafts now support private document uploads through a development-only local adapter configured by `PRIVATE_DOCUMENT_STORAGE_PATH`; production must use approved private S3-compatible storage before uploads are enabled. Production integrations for email, push notifications, and WhatsApp are intentionally not configured yet.

## Authentication foundation

The API exposes the first secure account/session slice under `/api/auth`:

- `POST /register`: creates a pending-verification customer account.
- `POST /login`: accepts email or phone plus password.
- `GET /session`: returns the current redacted user session.
- `DELETE /session`: revokes the current session.
- `POST /verification/request`: issues a short-lived phone or email verification code.
- `POST /verification/confirm`: validates the current code and activates fully verified accounts.

Passwords use Node's memory-hard scrypt implementation. Browser sessions use an opaque token in an HTTP-only, same-site cookie; only the token hash is stored. Set a unique `AUTH_SECRET` of at least 32 characters in every deployed environment. Bilingual customer sign-in, registration, and verification are available at `/auth` and `/en/auth`. Verification codes are never returned by the API or rendered in the browser. Email verification can be delivered through Gmail SMTP during local development with `GMAIL_SMTP_USER` and a Google App Password, allowing delivery to arbitrary test recipients without a custom domain. Production delivery uses Resend with `RESEND_API_KEY`, `VERIFICATION_EMAIL_FROM`, and a verified sender domain. Phone verification uses an approved Meta authentication template through the four `WHATSAPP_*` settings in `.env.example`. A signed HTTPS webhook remains available as an alternative provider boundary. Each channel fails closed when its provider is absent or rejects delivery, and the database retains only the code HMAC. Password recovery remains pending.

Customer registration accepts passwords from 8 to 128 characters. The bilingual account UI applies the same limit before submission, while the API remains the authoritative validation boundary.
