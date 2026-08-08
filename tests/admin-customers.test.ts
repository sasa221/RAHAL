import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("secure administrator customer management", () => {
  const repository = read("apps/api/src/admin-customers/admin-customers.repository.ts");
  const service = read("apps/api/src/admin-customers/admin-customers.service.ts");
  const component = read("apps/web/components/admin-customers-workspace.tsx");

  it("protects every customer endpoint with administrator access", () => {
    const controller = read("apps/api/src/admin-customers/admin-customers.controller.ts");
    expect(controller).toContain('@Controller("admin-customers")');
    expect(service.match(/await this\.adminSession\(token\)/g)).toHaveLength(3);
    expect(service).toContain('["ADMIN", "SUPER_ADMIN"]');
  });

  it("never projects identity, document, or raw profile fields to contracts", () => {
    const contracts = read("packages/contracts/src/index.ts");
    const block = contracts.slice(
      contracts.indexOf("export type AdminCustomerListItem"),
      contracts.indexOf("export type VehicleOperationalStatus"),
    );
    expect(block).toContain("emailMasked");
    expect(block).toContain("phoneMasked");
    expect(block).not.toContain("nationality");
    expect(block).not.toContain("dateOfBirth");
    expect(block).not.toContain("identity");
    expect(block).not.toContain("document");
    expect(repository).not.toContain("passwordHash: true");
  });

  it("revokes active sessions and writes a bounded audit record with every status decision", () => {
    expect(repository).toContain('status: "REVOKED"');
    expect(repository).toContain('action: "CUSTOMER_STATUS_CHANGE"');
    expect(repository).toContain("sessionsRevoked: revoked.count");
    expect(repository).toContain("previousData: { status: audit.previousStatus }");
  });

  it("ships one bilingual, responsive, motion-aware customer workspace", () => {
    const styles = read("apps/web/app/customers.css");
    expect(read("apps/web/app/admin/customers/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/admin/customers/page.tsx")).toContain('locale="en"');
    expect(component).toContain('activePage="customers"');
    expect(component).toContain("customer-drawer");
    expect(component).toContain("customer-modal");
    expect(component).toContain("setTimeout");
    expect(styles).toContain("@media (max-width: 700px)");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });
});
