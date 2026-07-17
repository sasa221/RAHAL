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
pnpm db:generate
pnpm dev
```

- Web: http://localhost:3000
- API health: http://localhost:4000/api/health

The initial UI and API use fictional demo vehicles. Production integrations for private documents, email, push notifications, and WhatsApp are intentionally not configured yet.
