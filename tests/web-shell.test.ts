import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("web shell directionality", () => {
  it("keeps the root Arabic document RTL", () => {
    const layout = read("apps/web/app/layout.tsx");

    expect(layout).toContain('<html lang="ar" dir="rtl">');
    expect(layout).toContain("RAHAL | رحال لتأجير السيارات");
  });

  it("keeps the English page LTR", () => {
    const englishPage = read("apps/web/app/en/page.tsx");

    expect(englishPage).toContain('<main dir="ltr" className="ltr">');
    expect(englishPage).toContain("Pickup and return at our branch");
  });
});
