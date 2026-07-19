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

The public UI currently uses fictional local content, while the API reads a fictional eight-vehicle fleet and branch from PostgreSQL. Production integrations for private documents, email, push notifications, and WhatsApp are intentionally not configured yet.

## Authentication foundation

The API exposes the first secure account/session slice under `/api/auth`:

- `POST /register`: creates a pending-verification customer account.
- `POST /login`: accepts email or phone plus password.
- `GET /session`: returns the current redacted user session.
- `DELETE /session`: revokes the current session.

Passwords use Node's memory-hard scrypt implementation. Browser sessions use an opaque token in an HTTP-only, same-site cookie; only the token hash is stored. Set a unique `AUTH_SECRET` of at least 32 characters in every deployed environment. Phone OTP, email verification, password reset, and the customer-facing auth screens remain deliberately unimplemented until their complete tested slices are added.
