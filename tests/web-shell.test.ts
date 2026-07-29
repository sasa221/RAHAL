import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("public site localization", () => {
  it("keeps the root Arabic document RTL", () => {
    const layout = read("apps/web/app/layout.tsx");
    const arabicPage = read("apps/web/app/page.tsx");

    expect(layout).toContain('requestHeaders.get("x-rahal-locale") === "en"');
    expect(layout).toContain('lang={locale === "en" ? "en-EG" : "ar-EG"}');
    expect(layout).toContain('dir={locale === "en" ? "ltr" : "rtl"}');
    expect(layout).toContain("RAHAL | رحال لتأجير السيارات");
    expect(arabicPage).toContain('<PublicHome locale="ar" />');
  });

  it("renders English through the same shared component", () => {
    const arabicPage = read("apps/web/app/page.tsx");
    const englishPage = read("apps/web/app/en/page.tsx");
    const publicHome = read("apps/web/components/public-home.tsx");

    expect(arabicPage).toContain("PublicHome");
    expect(englishPage).toContain('<PublicHome locale="en" />');
    expect(publicHome).toContain("dir={content.dir} lang={content.htmlLang}");
  });

  it("self-hosts Arabic and Latin fonts with one consistent interface family", () => {
    const layout = read("apps/web/app/layout.tsx");
    const styles = read("apps/web/app/globals.css");

    expect(layout).toContain('src: "./fonts/alexandria-arabic.woff2"');
    expect(layout).toContain('src: "./fonts/cormorant-garamond-latin.woff2"');
    expect(layout).toContain('src: "./fonts/manrope-latin.woff2"');
    expect(layout).toContain('from "next/font/local"');
    expect(layout).not.toContain('from "next/font/google"');
    expect(layout.match(/display: "swap"/g)).toHaveLength(3);
    expect(styles).toContain("--font-arabic: var(--font-alexandria)");
    expect(styles).toContain('--font-display: var(--font-manrope), "Segoe UI", Arial, sans-serif');
    expect(styles).toContain('.public-site[dir="rtl"]');
  });
});
