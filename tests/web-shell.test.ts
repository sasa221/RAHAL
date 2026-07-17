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

    expect(layout).toContain('<html lang="ar" dir="rtl">');
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
});
