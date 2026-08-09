import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/production-smoke.yml"),
  "utf8",
);
const globalSetup = readFileSync(resolve(process.cwd(), "tests/e2e/global-setup.ts"), "utf8");

describe("production smoke workflow", () => {
  it("runs only for a successful Rahal web deployment or an explicit manual dispatch", () => {
    expect(workflow).toContain("deployment_status:");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("github.event.deployment_status.state == 'success'");
    expect(workflow).toContain("github.event.deployment.environment == 'Production – rahal-eg'");
  });

  it("audits the public production alias with the read-only public suite", () => {
    expect(workflow).toContain("https://rahal-eg.vercel.app");
    expect(workflow).not.toContain("github.event.deployment_status.environment_url");
    expect(workflow).toContain("pnpm exec playwright test tests/e2e/public-release.spec.ts");
    expect(workflow).not.toContain("authenticated-release.spec.ts");
    expect(workflow).not.toContain("authenticated-lifecycle.spec.ts");
  });

  it("uses no production secret and keeps repository permissions read-only", () => {
    expect(workflow).toContain("contents: read");
    expect(workflow).not.toContain("secrets.");
    expect(workflow).not.toContain("DATABASE_URL");
  });

  it("does not load the local database runtime for a deployed audit", () => {
    expect(globalSetup).not.toContain('import { createPrismaClient } from "@rahal/database"');
    expect(globalSetup).toContain('"../../packages/database/dist/src/index.js"');
    expect(globalSetup.indexOf("if (process.env.RAHAL_E2E_BASE_URL) return;")).toBeLessThan(
      globalSetup.indexOf('"../../packages/database/dist/src/index.js"'),
    );
  });
});
