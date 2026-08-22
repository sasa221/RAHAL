import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pages = [
  "about",
  "how-it-works",
  "contact",
  "faq",
  "terms",
  "privacy",
  "cancellation",
] as const;

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("public information and document locale release gate", () => {
  const component = read("apps/web/components/public-information-page.tsx");
  const styles = read("apps/web/app/globals.css");
  const layout = read("apps/web/app/layout.tsx");
  const proxy = read("apps/web/proxy.ts");

  it("ships every required information page in Arabic and English", () => {
    for (const page of pages) {
      expect(existsSync(join(root, "apps/web/app", page, "page.tsx"))).toBe(true);
      expect(existsSync(join(root, "apps/web/app/en", page, "page.tsx"))).toBe(true);
    }
  });

  it("sets the root document language and direction from the requested route", () => {
    expect(proxy).toContain('pathname === "/en" || pathname.startsWith("/en/")');
    expect(proxy).toContain('requestHeaders.set("x-rahal-locale", locale)');
    expect(layout).toContain('requestHeaders.get("x-rahal-locale") === "en"');
    expect(layout).toContain('lang={locale === "en" ? "en-EG" : "ar-EG"}');
    expect(layout).toContain('dir={locale === "en" ? "ltr" : "rtl"}');
  });

  it("shares one premium responsive component without presenting draft policy as final", () => {
    expect(component).toContain("publicInformationMetadata");
    expect(component).toContain("PublicInformationPage");
    expect(component).toContain("<ExperienceMotion />");
    expect(component).toContain('className="information-faq"');
    expect(component).toContain("Required before launch");
    expect(component).toContain("مطلوب قبل الإطلاق");
    expect(component).toContain("There is no online payment");
    expect(component).toContain("لا يوجد دفع أونلاين");
    expect(styles).toContain("@keyframes information-orbit");
    expect(styles).toContain("@media (max-width: 680px)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps protected-document and branch boundaries explicit", () => {
    expect(component).toContain("لا ترسل بطاقتك أو رخصتك عبر واتساب");
    expect(component).toContain("Do not send your ID or licence by WhatsApp");
    expect(component).toContain("only at the Rahal branch");
    expect(component).toContain("فرع رحال فقط");
    expect(component).not.toContain("storageKey");
    expect(component).not.toContain("identityNumber");
  });
});
