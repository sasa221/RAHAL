import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("site content management", () => {
  it("keeps draft and published copies separate", () => {
    const schema = read("packages/database/prisma/schema.prisma");
    const migration = read(
      "packages/database/prisma/migrations/20260808120000_site_content_publishing/migration.sql",
    );
    const repository = read("apps/api/src/content/content.repository.ts");
    expect(schema).toContain("publishedTitle String?");
    expect(schema).toContain("publishedBody  Json?");
    expect(migration).toContain('ADD COLUMN "publishedBody" JSONB');
    expect(repository).toContain("SITE_CONTENT_DRAFT_SAVED");
    expect(repository).toContain("SITE_CONTENT_PUBLISHED");
    expect(repository).toContain("draftHash");
    expect(repository).not.toContain("previousData: previous.translations");
  });

  it("exposes public reads and administrator-only mutations", () => {
    const controller = read("apps/api/src/content/content.controller.ts");
    const service = read("apps/api/src/content/content.service.ts");
    expect(controller).toContain('@Get("public")');
    expect(controller).toContain('@Get("admin")');
    expect(controller).toContain('@Put("admin/:key")');
    expect(controller).toContain('@Post("admin/:key/publish")');
    expect(service).toContain('"content.edit"');
    expect(service).toContain('"content.publish"');
    expect(service).toContain("forbiddenContent");
  });

  it("ships one bilingual responsive content studio with live preview", () => {
    const workspace = read("apps/web/components/content-management-workspace.tsx");
    const shell = read("apps/web/components/workspace-shell.tsx");
    const styles = read("apps/web/app/globals.css");
    expect(read("apps/web/app/admin/content/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/admin/content/page.tsx")).toContain('locale="en"');
    expect(workspace).toContain('activePage="content"');
    expect(workspace).toContain("content-studio__preview");
    expect(workspace).toContain("hasUnpublishedChanges");
    expect(shell).toContain('localizedPath(locale, "/admin/content")');
    expect(styles).toContain("@media (max-width: 760px)");
    expect(styles).toContain("scroll-snap-type: inline mandatory");
  });

  it("feeds published content into the public home and information pages", () => {
    const publicApi = read("apps/web/lib/public-api.ts");
    const overlay = read("apps/web/lib/site-content.ts");
    const home = read("apps/web/components/public-home.tsx");
    const information = read("apps/web/components/public-information-page.tsx");
    expect(publicApi).toContain("/api/content/public");
    expect(overlay).toContain("HOME_HERO");
    expect(overlay).toContain("HOME_PROCESS");
    expect(home).toContain("getPublishedSiteContent()");
    expect(information).toContain("publishedTranslation");
    expect(information).toContain('if (page === "faq") return "FAQ"');
  });
});
