import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("public search discovery", () => {
  it("publishes robots and a bilingual sitemap while excluding private workspaces", () => {
    const robots = read("apps/web/app/robots.ts");
    const sitemap = read("apps/web/app/sitemap.ts");

    expect(robots).toContain("/sitemap.xml");
    expect(robots).toContain('"/admin/"');
    expect(robots).toContain('"/account/"');
    expect(sitemap).toContain('"/cars"');
    expect(sitemap).toContain("getPublicVehicles()");
    expect(sitemap).toContain('"ar-EG"');
    expect(sitemap).toContain('"en-EG"');
  });

  it("sets canonical and reciprocal language alternates from the real request path", () => {
    const layout = read("apps/web/app/layout.tsx");
    const proxy = read("apps/web/proxy.ts");

    expect(proxy).toContain('requestHeaders.set("x-rahal-path", pathname)');
    expect(layout).toContain("generateMetadata");
    expect(layout).toContain("canonical: path");
    expect(layout).toContain('"x-default": arabicPath');
  });
});
