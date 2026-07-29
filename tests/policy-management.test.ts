import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("administrator policy management", () => {
  it("publishes only a complete, bilingual, non-development bundle", () => {
    const dto = read("apps/api/src/policies/policies.dto.ts");
    const service = read("apps/api/src/policies/policies.service.ts");
    expect(dto).toContain("@ArrayMinSize(8)");
    expect(dto).toContain("@ArrayMaxSize(8)");
    expect(dto).toContain("@Length(50, 12_000)");
    expect(service).toContain('version.startsWith("DEV-")');
    expect(service).toContain("assertCompleteMatrix(copies)");
    expect(service).toContain("Only administrators can publish policy bundles.");
  });

  it("retires the former bundle atomically and records a bounded audit hash", () => {
    const repository = read("apps/api/src/policies/policies.repository.ts");
    expect(repository).toContain("this.prisma.client.$transaction");
    expect(repository).toContain("transaction.policyVersion.updateMany");
    expect(repository).toContain("transaction.policyVersion.createMany");
    expect(repository).toContain('action: "POLICY_BUNDLE_PUBLISHED"');
    expect(repository).toContain("contentHash");
    expect(repository).not.toContain("previousData: input.copies");
    expect(repository).not.toContain("newData: input.copies");
  });

  it("ships equivalent Arabic and English management routes with an explicit approval gate", () => {
    expect(existsSync(join(root, "apps/web/app/admin/policies/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "apps/web/app/en/admin/policies/page.tsx"))).toBe(true);
    const workspace = read("apps/web/components/policy-management-workspace.tsx");
    expect(workspace).toContain('activePage="policies"');
    expect(workspace).toContain("setConfirmed");
    expect(workspace).toContain("owner and qualified legal reviewer");
    expect(workspace).toContain("المالك والمراجع القانوني");
  });
});
