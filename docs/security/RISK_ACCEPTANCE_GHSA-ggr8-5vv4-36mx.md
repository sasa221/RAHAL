# Temporary dependency risk acceptance: GHSA-ggr8-5vv4-36mx

- Status: temporarily accepted for local and CI dependency verification only
- Accepted: 2026-08-22
- Next review: 2026-09-05
- Automatic expiry: 2026-09-30

## Finding

- Advisory: `GHSA-ggr8-5vv4-36mx` / pnpm advisory `1145093`
- Severity: High
- Package and version: `deepmerge-ts@7.1.5`
- Patched version: `deepmerge-ts@8.0.0` or newer
- Production-audit path:
  `packages__database>@prisma/client>prisma>@prisma/config>deepmerge-ts`
- Full-audit tooling path:
  `packages__database>prisma>@prisma/config>deepmerge-ts`

## Why it cannot be upgraded safely today

Prisma 7.9.0 and the available 7.9.1 patch specify `deepmerge-ts@7.1.5` exactly inside
`@prisma/config`; they do not declare a semver range compatible with 8.x. DeepmergeTS 8 is a major
release. Forcing it through a workspace override would place Prisma on an unsupported dependency
graph and could break schema loading, client generation, migrations, or deployment tooling.

## Build-time/tooling evidence

- `pnpm why --prod deepmerge-ts` resolves the package through the optional Prisma peer exposed by
  `@prisma/client`, then `prisma -> @prisma/config`.
- `@prisma/client@7.9.0` declares `prisma` as an optional peer dependency.
- The application runtime imports `@prisma/client` generated output and `@prisma/adapter-pg` from
  `packages/database/src/index.ts`.
- The only repository import of `prisma/config` is `packages/database/prisma.config.ts`, which is
  used for schema validation, client generation, and migrations.
- Built API, database, and standalone web JavaScript contain no `deepmerge-ts`, `@prisma/config`, or
  `prisma/config` reference.
- RAHAL does not pass user-controlled recursive object graphs into Prisma configuration tooling.

The package manager labels the optional-peer path as production, so the risk is not reclassified or
hidden. The strict CI exception exists to distinguish package metadata from the deployed request
runtime while retaining a failing audit gate for every other finding.

## Compensating controls

- The exception matches the advisory numeric ID, GHSA ID, package, exact version, severity,
  vulnerable/patched ranges, and exact full/production dependency paths.
- Any new advisory, version change, dependency-path change, or expired date fails CI.
- Full and production audit JSON reports are retained as CI artifacts.
- Prisma configuration and migrations are not exposed to web requests and are not run from
  attacker-controlled input.
- No `deepmerge-ts@8` override is permitted without an official compatible Prisma release and the
  full Prisma/runtime verification suite.

## Removal condition

Remove this record and `config/security-audit-policy.json` exception immediately when a stable,
compatible Prisma release no longer installs vulnerable `deepmerge-ts`. Apply that supported Prisma
update, regenerate the client, deploy all migrations in a disposable environment, run runtime and
E2E tests, and require both full and production audits to pass without the exception.
