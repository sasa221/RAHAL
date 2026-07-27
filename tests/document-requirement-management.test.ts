import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("administrator document requirement management", () => {
  const controller = read("apps/api/src/document-requirements/document-requirements.controller.ts");
  const dto = read("apps/api/src/document-requirements/document-requirements.dto.ts");
  const repository = read("apps/api/src/document-requirements/document-requirements.repository.ts");
  const service = read("apps/api/src/document-requirements/document-requirements.service.ts");
  const workspace = read("apps/web/components/document-requirements-workspace.tsx");
  const shell = read("apps/web/components/workspace-shell.tsx");
  const styles = read("apps/web/app/document-policy.css");

  it("provides administrator-only list, create and update boundaries", () => {
    expect(controller).toContain('@Controller("admin-document-requirements")');
    expect(controller).toContain("@Get()");
    expect(controller).toContain("@Post()");
    expect(controller).toContain('@Patch(":id")');
    expect(service).toContain('["ADMIN", "SUPER_ADMIN"].includes(session.user.role)');
    expect(service).toContain("Only administrators can manage document requirement rules");
  });

  it("validates the finite document policy surface", () => {
    expect(dto).toContain('"NATIONAL_ID_FRONT"');
    expect(dto).toContain('"PASSPORT"');
    expect(dto).toContain('"image/jpeg"');
    expect(dto).toContain('"application/pdf"');
    expect(dto).toContain("@ArrayMinSize(1)");
    expect(dto).toContain("@Min(1024 * 1024)");
    expect(dto).toContain("@Max(20 * 1024 * 1024)");
    expect(dto).toContain("@Length(10, 300)");
  });

  it("keeps one active base document per customer category", () => {
    expect(service).toContain("countOtherBaseRules");
    expect(service).toContain("Each customer category must keep at least one active base document");
    expect(repository).toContain("requiresSelfDrive: false");
    expect(repository).toContain("active: true");
  });

  it("records bounded rule configuration changes without customer or file data", () => {
    expect(repository).toContain('action: "DOCUMENT_REQUIREMENT_CREATED"');
    expect(repository).toContain('action: "DOCUMENT_REQUIREMENT_UPDATED"');
    expect(repository).toContain('entityType: "DOCUMENT_REQUIREMENT_RULE"');
    expect(repository).toContain("transaction.auditLog.create");
    expect(repository).not.toContain("storageKey");
    expect(repository).not.toContain("originalName");
    expect(repository).not.toContain("customerName");
  });

  it("ships shared Arabic and English routes and a dynamic scenario simulator", () => {
    expect(existsSync(join(root, "apps/web/app/admin/documents/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "apps/web/app/en/admin/documents/page.tsx"))).toBe(true);
    expect(workspace).toContain("اختبار السيناريو");
    expect(workspace).toContain("Scenario simulator");
    expect(workspace).toContain('driverScenario === "SELF_DRIVE"');
    expect(workspace).toContain("/api/admin-document-requirements");
    expect(shell).toContain('activePage === "documents"');
  });

  it("uses purpose-built responsive motion with a reduced-motion fallback", () => {
    expect(styles).toContain(".document-policy__orbit");
    expect(styles).toContain(".document-simulator__result");
    expect(styles).toContain(".document-rule-editor");
    expect(styles).toContain("@media (max-width: 760px)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
