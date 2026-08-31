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

  it("keeps both search-engine ownership tags on every public page", () => {
    const layout = read("apps/web/app/layout.tsx");

    expect(layout).toContain('google: "p8kxt8OOhPoPWB0Okc2JP7qPuBDD_HqfDRX7aUJMrgE"');
    expect(layout).toContain('"msvalidate.01": "6B1E107872A860D8242C8D71581CA707"');
  });

  it("provides descriptive alternatives for public and shared imagery", () => {
    const home = read("apps/web/components/public-home.tsx");
    const fleet = read("apps/web/components/public-fleet.tsx");
    const auth = read("apps/web/components/auth-access.tsx");
    const details = read("apps/web/components/vehicle-details.tsx");

    expect(home).not.toContain('alt=""');
    expect(home).toContain("alt={title}");
    expect(home).toContain("content.heroMedia?.alt?.trim() ||");
    expect(fleet).not.toContain('alt=""');
    expect(auth).not.toContain('alt=""');
    expect(details).not.toContain('<Image alt=""');
  });
});
