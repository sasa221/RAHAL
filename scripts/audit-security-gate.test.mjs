import assert from "node:assert/strict";
import { test } from "node:test";

import { validateAuditReport } from "./audit-security-gate.mjs";

const exception = {
  advisoryId: 1145093,
  githubAdvisoryId: "GHSA-ggr8-5vv4-36mx",
  module: "deepmerge-ts",
  version: "7.1.5",
  severity: "high",
  vulnerableVersions: "<8.0.0",
  patchedVersions: ">=8.0.0",
  expectedPaths: {
    production: ["database>@prisma/client>prisma>@prisma/config>deepmerge-ts"],
    full: ["database>@prisma/client>prisma>@prisma/config>deepmerge-ts"],
  },
  expiresOn: "2026-09-30",
};

const policy = {
  productionFailureLevel: "high",
  failOnAnyUnlistedAdvisory: true,
  exceptions: [exception],
};

function report() {
  return {
    advisories: {
      1145093: {
        id: 1145093,
        github_advisory_id: "GHSA-ggr8-5vv4-36mx",
        module_name: "deepmerge-ts",
        severity: "high",
        vulnerable_versions: "<8.0.0",
        patched_versions: ">=8.0.0",
        findings: [
          {
            version: "7.1.5",
            paths: ["database>@prisma/client>prisma>@prisma/config>deepmerge-ts"],
          },
        ],
      },
    },
  };
}

test("accepts only the exact documented Prisma finding", () => {
  assert.deepEqual(validateAuditReport(report(), policy, "production"), ["GHSA-ggr8-5vv4-36mx"]);
});

test("fails when an additional advisory appears", () => {
  const changed = report();
  changed.advisories[9999999] = {
    id: 9999999,
    github_advisory_id: "GHSA-unlisted",
    module_name: "unexpected-package",
    severity: "moderate",
    findings: [{ version: "1.0.0", paths: ["application>unexpected-package"] }],
  };

  assert.throws(
    () => validateAuditReport(changed, policy, "production"),
    /Unlisted production advisory GHSA-unlisted/,
  );
});

test("fails when the accepted dependency path changes", () => {
  const changed = report();
  changed.advisories[1145093].findings[0].paths = ["application>deepmerge-ts"];

  assert.throws(
    () => validateAuditReport(changed, policy, "production"),
    /Dependency path changed/,
  );
});

test("fails after the temporary exception expires", () => {
  assert.throws(
    () => validateAuditReport(report(), policy, "production", new Date("2026-10-01")),
    /Risk exception expired/,
  );
});
