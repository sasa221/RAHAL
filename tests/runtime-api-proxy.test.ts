import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("runtime API proxy", () => {
  const proxy = read("apps/web/app/api/[...path]/route.ts");
  const nextConfig = read("apps/web/next.config.ts");

  it("resolves API_URL at request time and preserves all supported methods", () => {
    expect(proxy).toContain("process.env.API_URL");
    expect(proxy).toContain('url.protocol !== "http:"');
    expect(proxy).toContain("export const GET = forward");
    expect(proxy).toContain("export const POST = forward");
    expect(proxy).toContain("export const DELETE = forward");
    expect(nextConfig).not.toContain("async rewrites()");
  });

  it("forwards only bounded request headers and preserves response cookies", () => {
    expect(proxy).toContain('"accept", "content-type", "cookie", "user-agent", "x-request-id"');
    expect(proxy).toContain("response.headers.getSetCookie()");
    expect(proxy).toContain("hopByHopHeaders");
    expect(proxy).not.toContain("request.headers.forEach");
  });

  it("fails safely without leaking an internal API URL", () => {
    expect(proxy).toContain('"API_UNAVAILABLE"');
    expect(proxy).toContain('"The Rahal service is temporarily unavailable."');
    expect(proxy).not.toContain("target.toString()");
  });
});
