import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("branch management", () => {
  it("keeps public reads separate from administrator mutations", () => {
    const controller = read("apps/api/src/branches/branches.controller.ts");
    const service = read("apps/api/src/branches/branches.service.ts");
    expect(controller).toContain("@Get()");
    expect(controller).toContain('@Get("admin")');
    expect(controller).toContain('@Post("admin")');
    expect(controller).toContain('@Put("admin/:id")');
    expect(controller).toContain('@Patch("admin/:id/disable")');
    expect(controller).toContain('@Delete("admin/:id")');
    for (const permission of [
      "branches.view",
      "branches.edit",
      "branches.create",
      "branches.disable",
      "branches.delete",
    ])
      expect(service).toContain(permission);
  });

  it("audits branch creation and updates without storing provider secrets", () => {
    const repository = read("apps/api/src/branches/branches.repository.ts");
    expect(repository).toContain('"BRANCH_CREATED"');
    expect(repository).toContain('"BRANCH_UPDATED"');
    expect(repository).toContain('"BRANCH_DISABLED"');
    expect(repository).toContain('"BRANCH_DELETED"');
    expect(repository).toContain('return "REFERENCED"');
    expect(repository).toContain("previousData");
    expect(repository).toContain("newData");
    expect(repository).not.toContain("AUTH_SECRET");
  });

  it("ships bilingual management routes and a responsive shared workspace", () => {
    const workspace = read("apps/web/components/branch-management-workspace.tsx");
    const styles = read("apps/web/app/globals.css");
    expect(read("apps/web/app/admin/branches/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/admin/branches/page.tsx")).toContain('locale="en"');
    expect(workspace).toContain('activePage="branches"');
    expect(workspace).toContain('credentials: "include"');
    expect(workspace).toContain("BranchLocationPicker");
    expect(workspace).toContain("BranchHoursEditor");
    expect(workspace).toContain('role="dialog"');
    expect(styles).toContain("@media (max-width: 620px)");
  });

  it("publishes only active administrator-approved branch contact details", () => {
    const repository = read("apps/api/src/branches/branches.repository.ts");
    const contracts = read("packages/contracts/src/index.ts");
    const surface = read("apps/web/components/public-branch-surface.tsx");
    const home = read("apps/web/components/public-home.tsx");
    const information = read("apps/web/components/public-information-page.tsx");

    expect(repository).toContain('where: { active: true, status: "ACTIVE" }');
    expect(repository).toContain("isApprovedPublicBranch");
    expect(repository).toContain('"تجريبي"');
    expect(repository).toContain("whatsappNumbers: true");
    expect(repository).toContain("whatsappVisible: true");
    expect(surface).toContain("https://wa.me/");
    expect(surface).toContain("encodeURIComponent(whatsappMessage)");
    expect(surface).toContain("branch.whatsappVisible !== false");
    expect(surface).toContain("branch.whatsappNumber ?? branch.whatsappNumbers[0]");
    expect(contracts).toContain("workingHours: Record<string, unknown>");
    expect(surface).toContain('fetch("/api/branches"');
    expect(surface).toContain("const officialBranch: BranchSummary");
    expect(surface).toContain("demo-branch-cairo");
    expect(surface).toContain("+201011105159");
    expect(surface).toContain("+201113999155");
    expect(surface).toContain("رحال لتأجير السيارات");
    expect(surface).toContain("10 Nasr El Thawra Street");
    expect(surface).toContain("https://wa.me/");
    expect(surface).toContain("The official branch fallback remains visible");
    expect(surface).not.toContain("تفاصيل الفرع الإضافية");
    expect(surface).not.toContain("Additional branch details");
    expect(surface).not.toContain("Loading the approved branch details");
    expect(home).toContain("<PublicBranchSurface locale={locale} />");
    expect(home).not.toContain("01011105159");
    expect(information).not.toContain("010 111 05159");
  });
});
