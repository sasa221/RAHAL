# Dependency security remediation

Date: 2026-08-21
Baseline commit: `905224fa5ef739265212563fa32080da2fa83910`
Scope: local remediation only; no commit, push, deploy, or production change.

## Baseline audit

`pnpm audit --json` reported 14 advisories: 5 high, 7 moderate, 2 low, and 0 critical.

| Advisory            | Severity | Dependency class                           | Resolved path and actual use                                                                                                                                                         | Patched version        | Compatibility assessment                                                                                                         |
| ------------------- | -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| GHSA-g9mf-h72j-4rw9 | Moderate | Production                                 | `@vercel/blob -> undici`; the protected admin vehicle-image route calls server-side `put()`. The application does not call Undici directly.                                          | `undici >=6.23.0`      | Updating Blob 1.x to 2.x is major; reviewed below.                                                                               |
| GHSA-2mjp-6q6p-2qxm | Moderate | Production                                 | Same Blob upload path; HTTP is used.                                                                                                                                                 | `undici >=6.24.0`      | Same Blob major update.                                                                                                          |
| GHSA-vrm6-8vpv-qv8q | High     | Production dependency, capability not used | Same path, but the finding targets WebSocket compression and RAHAL does not use Undici WebSockets.                                                                                   | `undici >=6.24.0`      | Same Blob major update.                                                                                                          |
| GHSA-v9p9-hfj2-hcw8 | High     | Production dependency, capability not used | Same path, but the finding targets the WebSocket client.                                                                                                                             | `undici >=6.24.0`      | Same Blob major update.                                                                                                          |
| GHSA-4992-7rv2-5pvq | Moderate | Production dependency, capability not used | Same path; RAHAL uses ordinary Blob HTTP upload and does not call Undici's `upgrade` option.                                                                                         | `undici >=6.24.0`      | Same Blob major update.                                                                                                          |
| GHSA-p88m-4jfj-68fv | Moderate | Production                                 | Same Blob HTTP path; RAHAL does not parse cookies through Undici directly.                                                                                                           | `undici >=6.27.0`      | Same Blob major update.                                                                                                          |
| GHSA-vxpw-j846-p89q | High     | Production dependency, capability not used | Same path, but the finding targets the WebSocket client.                                                                                                                             | `undici >=6.27.0`      | Same Blob major update.                                                                                                          |
| GHSA-g8m3-5g58-fq7m | Low      | Production                                 | Same transitive HTTP dependency; no direct application cookie API use.                                                                                                               | `undici >=6.27.0`      | Same Blob major update.                                                                                                          |
| GHSA-8xcm-r25x-g524 | Moderate | Production                                 | Same Blob HTTP path; no direct retry-interceptor configuration by RAHAL.                                                                                                             | `undici >=6.28.0`      | Same Blob major update.                                                                                                          |
| GHSA-m8rv-5g2x-5cg5 | Moderate | Production                                 | Same Blob upload path accepts a validated browser `File`; this is the closest finding to an actively used path.                                                                      | `undici >=6.28.0`      | Same Blob major update.                                                                                                          |
| GHSA-v3r7-h72x-cjcm | Moderate | Production                                 | Same transitive HTTP dependency; no direct application cookie API use.                                                                                                               | `undici >=6.28.0`      | Same Blob major update.                                                                                                          |
| GHSA-35p6-xmwp-9g52 | Low      | Production                                 | Same Blob HTTP path; socket handling is transitive.                                                                                                                                  | `undici >=6.27.0`      | Same Blob major update.                                                                                                          |
| GHSA-2v37-7h3g-55p8 | High     | Mixed production/build/test                | `Next -> PostCSS -> nanoid` is part of the web build; Vitest/Vite also reaches it in development. RAHAL does not call Nano ID custom generators.                                     | `nanoid >=3.3.18`      | Patch within PostCSS's accepted `^3.3.17` range; no major override.                                                              |
| GHSA-ggr8-5vv4-36mx | High     | Prisma tooling/build; not request runtime  | `Prisma -> @prisma/config -> deepmerge-ts`. It is exercised by Prisma configuration, generate, validation and migrations. No untrusted recursive graph is passed by the application. | `deepmerge-ts >=8.0.0` | Major. Prisma 7.9.0 and 7.9.1 request exactly 7.1.5, so an override is unsupported unless Prisma publishes a compatible release. |

## Vercel Blob 2.x compatibility review

- RAHAL imports only server-side `put()` in `apps/web/app/api/admin/vehicle-images/route.ts`.
- The 2.0 breaking change applies to client-upload `handleUpload()` callback URL inference outside
  Vercel. RAHAL does not use `handleUpload`, `upload`, or `onUploadCompleted`.
- Blob 2.8 requires Node 20 or newer; local and CI configuration use Node 22.
- `put(pathname, file, { access, addRandomSuffix, contentType })` remains supported.
- The existing explicit `BLOB_READ_WRITE_TOKEN` availability gate remains unchanged. OIDC adoption
  is a separate production configuration decision and is not part of this remediation.

Primary references:

- <https://github.com/vercel/storage/releases/tag/%40vercel%2Fblob%402.0.0>
- <https://vercel.com/docs/vercel-blob/using-blob-sdk>
- <https://vercel.com/changelog/vercel-blob-now-supports-oidc-authentication>

## Environment and retained-data corrections

- Vercel production configuration remains `UNVERIFIED — ACCESS DENIED` after the read-only API
  returned HTTP 403.
- The 17 retained rows are local synthetic fixtures. They must not be migrated to production.
  Staging must receive newly generated, isolated fixtures instead.
- The validated local backup remains outside Git and should be securely deleted after its review
  purpose ends.

## Applied dependency changes

| Package        | Before   | After    | Result                                                                                                                                                                               |
| -------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@vercel/blob` | `1.1.1`  | `2.8.0`  | Its transitive `undici` moved to `6.28.0`; all 12 Undici advisories were removed. No product API change was required because RAHAL uses only the compatible server-side `put()` API. |
| `nanoid`       | `3.3.17` | `3.3.18` | The workspace override stayed within PostCSS's compatible 3.x range; the Nano ID advisory was removed.                                                                               |
| `deepmerge-ts` | `7.1.5`  | `7.1.5`  | Intentionally unchanged. Prisma 7.9.0 and the current 7.9.1 patch request exactly 7.1.5, not a compatible range. Forcing 8.x would be an unsupported major override.                 |

No product source code was changed. The only major package update was Blob 1.x to 2.x, and the
reviewed breaking client-upload callback behavior is not used by RAHAL.

## Audit result after remediation

The final `pnpm audit --json` result is stored in `docs/dependency-audit-after.json`.

- Before: 14 advisories — 5 high, 7 moderate, 2 low, 0 critical.
- After: 1 advisory — 1 high, 0 moderate, 0 low, 0 critical.
- Removed: 13 advisories.
- Residual: `GHSA-ggr8-5vv4-36mx` in `deepmerge-ts@7.1.5`, reached through
  `@prisma/config@7.9.0`.

The residual finding is not hidden or downgraded: `pnpm audit` correctly exits with code 1. The
affected merge library is used by Prisma configuration/generation/migration tooling, not by the
deployed request handlers, and the application does not pass attacker-controlled recursive object
graphs to it. The supported remediation is to adopt an official Prisma release that removes or
upgrades the exact dependency when one becomes available. Prisma 8 was pre-release during this
review and was not adopted as an unsupported production toolchain change.

`pnpm audit --prod` also reports this one advisory because `@prisma/client` declares `prisma` as an
optional peer dependency. The exact production-audit path is
`packages__database>@prisma/client>prisma>@prisma/config>deepmerge-ts`. Repository imports and built
artifacts show that `prisma/config` is used only by `packages/database/prisma.config.ts`; deployed
request runtime uses the generated Prisma client and PostgreSQL adapter without bundling
`deepmerge-ts` or `@prisma/config`.

## CI audit gate

The former workflow ran raw `pnpm audit`, which exits with code 1 for the accepted upstream Prisma
finding and would therefore fail every push. It now runs `pnpm security:audit:test` followed by
`pnpm security:audit`.

The gate:

- records complete full and production JSON reports as a retained GitHub Actions artifact;
- matches the one temporary exception by numeric advisory ID, GHSA ID, package, exact version,
  severity, vulnerable/patched ranges, and exact dependency paths;
- fails on every unlisted advisory, including an additional advisory below the configured High
  production threshold;
- fails when the accepted version or dependency path changes;
- fails when the exception expires after 2026-09-30;
- points to a dedicated risk record with a review date of 2026-09-05.

The gate tests passed 4/4: the exact finding was accepted, while an extra Moderate advisory, a path
change, and an expired exception were each rejected.

## Verification results

| Gate                                                | Result                                                  |
| --------------------------------------------------- | ------------------------------------------------------- |
| Frozen-lockfile reinstall/verification through pnpm | Passed                                                  |
| Prisma client generation                            | Passed — Prisma Client 7.9.0                            |
| Local migrations                                    | Passed — 23 migrations, none pending                    |
| Format check                                        | Passed                                                  |
| Lint                                                | Passed                                                  |
| Typecheck                                           | Passed — all 6 workspace projects                       |
| Unit/integration                                    | Passed — 74 files, 395 tests                            |
| Production build                                    | Passed — web build produced 77 routes; API build passed |
| Blob and protected-document targeted tests          | Passed — 5 files, 41 tests                              |
| Document-security E2E                               | Passed — 2/2 Desktop and Mobile                         |
| Full E2E                                            | Passed — 249 passed, 1 intentionally skipped, 0 failed  |
| Strict audit-gate tests                             | Passed — 4/4, including negative failure cases          |
| Git whitespace check                                | Passed                                                  |

The first full E2E attempt produced one Playwright artifact-read failure under 10-worker
concurrency after the tested page had already navigated successfully. The same mobile dashboard
spec passed alone (2/2), and the complete suite passed reliably with six workers (249 passed, one
intentional skip). The project E2E script now fixes CI concurrency at six workers rather than
concealing or accepting the ten-worker timeout.

## Files changed by this remediation

- `apps/web/package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `.github/workflows/quality.yml`
- `.gitignore`
- `package.json`
- `config/security-audit-policy.json`
- `scripts/audit-security-gate.mjs`
- `scripts/audit-security-gate.test.mjs`
- `tests/production-http-boundary.test.ts`
- `docs/DEPENDENCY_SECURITY_REMEDIATION.md`
- `docs/dependency-audit-after.json`
- `docs/security/RISK_ACCEPTANCE_GHSA-ggr8-5vv4-36mx.md`

Tracked visual-regression PNG files were regenerated by the required E2E run with only small
binary-size differences and no corresponding interface change. They were reviewed and restored to
their existing baseline; none will enter this dependency-remediation change.

No commit, push, deploy, cleanup, backup execution, or production migration was performed.
