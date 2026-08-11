import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("production HTTP boundary", () => {
  const apiSetup = read("apps/api/src/setup-app.ts");
  const apiFilter = read("apps/api/src/http-exception.filter.ts");
  const health = read("apps/api/src/health.controller.ts");
  const webConfig = read("apps/web/next.config.ts");
  const workflow = read(".github/workflows/quality.yml");

  it("adds bounded correlation IDs and defensive API headers", () => {
    expect(apiSetup).toContain("safeRequestId");
    expect(apiSetup).toContain('response.setHeader("x-request-id", requestId)');
    expect(apiSetup).toContain('"x-content-type-options", "nosniff"');
    expect(apiSetup).toContain('"x-frame-options", "DENY"');
    expect(apiSetup).toContain("strict-transport-security");
    expect(apiSetup).toContain("app.enableShutdownHooks()");
  });

  it("returns request IDs while logging only bounded failure context", () => {
    expect(apiFilter).toContain("requestId,");
    expect(apiFilter).toContain('event: "HTTP_REQUEST_FAILED"');
    expect(apiFilter).toContain("method: request.method");
    expect(apiFilter).toContain("path: request.path");
    expect(apiFilter).not.toContain("request.body");
    expect(apiFilter).not.toContain("request.query");
  });

  it("separates liveness and dependency readiness", () => {
    expect(health).toContain('@Get("live")');
    expect(health).toContain('@Get("ready")');
    expect(health).toContain("SELECT 1");
    expect(health).toContain("rateLimits?.readiness()");
    expect(health).toContain("documentStorage?.readiness()");
    expect(health).toContain("Dependency readiness check failed.");
  });

  it("applies equivalent browser-facing protections", () => {
    expect(webConfig).toContain("poweredByHeader: false");
    expect(webConfig).toContain("X-Content-Type-Options");
    expect(webConfig).toContain("X-Frame-Options");
    expect(webConfig).toContain("Permissions-Policy");
    expect(webConfig).toContain("Content-Security-Policy");
    expect(webConfig).toContain("frame-ancestors 'none'");
    expect(webConfig).toContain("object-src 'none'");
    expect(webConfig).toContain("connect-src 'self' blob:");
    expect(webConfig).toContain("Strict-Transport-Security");
  });

  it("keeps dependency and migration checks in the shared CI gate", () => {
    expect(workflow).toContain("pnpm audit");
    expect(workflow).toContain("pnpm db:migrate");
    expect(workflow).toContain("pnpm test");
    expect(workflow).toContain("pnpm build");
  });
});
