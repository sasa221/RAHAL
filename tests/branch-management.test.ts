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
    expect(service).toContain('["ADMIN", "SUPER_ADMIN"]');
  });

  it("audits branch creation and updates without storing provider secrets", () => {
    const repository = read("apps/api/src/branches/branches.repository.ts");
    expect(repository).toContain('"BRANCH_CREATED"');
    expect(repository).toContain('"BRANCH_UPDATED"');
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
    expect(styles).toContain("@media (max-width: 620px)");
  });

  it("publishes only active administrator-approved branch contact details", () => {
    const repository = read("apps/api/src/branches/branches.repository.ts");
    const contracts = read("packages/contracts/src/index.ts");
    const surface = read("apps/web/components/public-branch-surface.tsx");
    const home = read("apps/web/components/public-home.tsx");
    const information = read("apps/web/components/public-information-page.tsx");

    expect(repository).toContain("where: { active: true }");
    expect(repository).toContain("isApprovedPublicBranch");
    expect(repository).toContain('"تجريبي"');
    expect(repository).toContain("whatsappNumbers: true");
    expect(contracts).toContain("workingHours: Record<string, unknown>");
    expect(surface).toContain('fetch("/api/branches"');
    expect(surface).toContain("No unconfirmed address or number is shown.");
    expect(surface).toContain('useState<"READY" | "UNAVAILABLE">("UNAVAILABLE")');
    expect(surface).not.toContain("Loading the approved branch details");
    expect(home).toContain("<PublicBranchSurface locale={locale} />");
    expect(home).not.toContain("01011105159");
    expect(information).not.toContain("010 111 05159");
  });
});
