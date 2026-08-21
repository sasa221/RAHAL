import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("administrator document access oversight", () => {
  const contracts = read("packages/contracts/src/index.ts");
  const controller = read("apps/api/src/admin-operations/admin-operations.controller.ts");
  const repository = read("apps/api/src/admin-operations/admin-operations.repository.ts");
  const service = read("apps/api/src/admin-operations/admin-operations.service.ts");
  const workspace = read("apps/web/components/admin-operations-workspace.tsx");
  const ledger = read("apps/web/components/admin-document-access-ledger.tsx");

  it("exposes an administrator-only, audit-permission-protected endpoint", () => {
    expect(controller).toContain('@Get("document-access")');
    expect(service).toContain("const session = await this.adminSession(token)");
    expect(service).toContain('await this.access.require(session, "audit.view")');
    expect(contracts).toContain("export type AdminDocumentAccessPage");
  });

  it("returns operational reasons without document bytes or sensitive storage data", () => {
    expect(repository).toContain("safeDocumentAccessSelect");
    expect(repository).toContain("reason: true");
    expect(repository).toContain("reservation:");
    expect(repository).not.toContain("safeDocumentAccessSelect = {\n  storageKey:");
    expect(service).toContain("maskIdentitySequences");
    expect(ledger).not.toContain("storageKey");
    expect(ledger).not.toContain("ipHash");
    expect(ledger).not.toContain("identityNumber");
  });

  it("provides a bilingual responsive oversight surface linked to the request", () => {
    expect(workspace).toContain("<AdminDocumentAccessLedger");
    expect(workspace).toContain("رقابة المستندات");
    expect(workspace).toContain("Document oversight");
    expect(ledger).toContain("/api/admin-operations/document-access");
    expect(workspace).toContain("اعرف من فتح المستند، ولماذا");
    expect(workspace).toContain("Know who touched a document and why");
    expect(ledger).toContain('localizedPath(locale, "/admin/requests")');
  });
});
