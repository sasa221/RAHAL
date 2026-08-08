import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("administrator operational reports", () => {
  it("exposes an administrator-only bounded report endpoint", () => {
    const controller = read("apps/api/src/admin-operations/admin-operations.controller.ts");
    const service = read("apps/api/src/admin-operations/admin-operations.service.ts");
    expect(controller).toContain('@Get("reports")');
    expect(service).toContain("await this.adminSession(token)");
    expect(service).toContain("parseReportRange");
    expect(service).toContain("reportRanges");
    expect(service).toContain("The selected branch is not active or does not exist");
  });

  it("keeps cohort conversion, branch deposits, and utilization definitions explicit", () => {
    const service = read("apps/api/src/admin-operations/admin-operations.service.ts");
    const repository = read("apps/api/src/admin-operations/admin-operations.repository.ts");
    expect(service).toContain('"COHORT_CONFIRMATION_RATE"');
    expect(service).toContain('"DEPOSITS_RECORDED_EGP"');
    expect(service).toContain("occupiedDays / capacityDays");
    expect(repository).toContain("submittedAt: { gte: start, lt: end }");
    expect(repository).toContain("recordedAt: { gte: start, lt: end }");
    expect(repository).not.toContain("customerEmailSnapshot: true");
    expect(repository).not.toContain("customerPhoneSnapshot: true");
  });

  it("ships one bilingual responsive, chart-led report workspace", () => {
    const component = read("apps/web/components/admin-reports-workspace.tsx");
    const styles = read("apps/web/app/reports.css");
    const shell = read("apps/web/components/workspace-shell.tsx");
    expect(read("apps/web/app/admin/reports/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/admin/reports/page.tsx")).toContain('locale="en"');
    expect(component).toContain('activePage="reports"');
    expect(component).toContain("<TrendChart");
    expect(component).toContain("report-funnel");
    expect(component).toContain("fleet-utilization__dial");
    expect(component).toContain("exportReport");
    expect(styles).toContain("scroll-snap-type: x mandatory");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(shell).toContain('localizedPath(locale, "/admin/reports")');
  });

  it("surfaces data trust checks without customer details", () => {
    const component = read("apps/web/components/admin-reports-workspace.tsx");
    const contracts = read("packages/contracts/src/index.ts");
    expect(component).toContain("DATA QUALITY");
    expect(component).toContain("Customer data is never shown");
    expect(contracts).toContain('status: "TRUSTED" | "REVIEW_REQUIRED"');
    expect(contracts).toContain('"DEPOSIT_WITHOUT_ATTENDANCE"');
    expect(contracts).not.toContain("AdminReportsOverview = {\n  customer");
  });
});
