import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("sales review workspace", () => {
  const workspace = read("apps/web/components/sales-review-workspace.tsx");
  const controller = read("apps/api/src/reservations/reservations.controller.ts");
  const repository = read("apps/api/src/reservations/reservations.repository.ts");
  const shell = read("apps/web/components/workspace-shell.tsx");

  it("provides shared Arabic and English staff routes", () => {
    expect(existsSync(join(root, "apps/web/app/sales/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "apps/web/app/en/sales/page.tsx"))).toBe(true);
    expect(read("apps/web/app/sales/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/sales/page.tsx")).toContain('locale="en"');
    expect(workspace).toContain('dir={locale === "ar" ? "rtl" : "ltr"}');
    expect(workspace).toContain('<WorkspaceShell kind="sales" locale={locale}>');
    expect(workspace).toContain('className="portal-metrics"');
    expect(shell).toContain('className="portal-sidebar"');
  });

  it("keeps queue access role-gated and customer data masked", () => {
    expect(controller).toContain('@Get("sales/queue")');
    expect(controller).toContain('@Post("sales/:id/claim")');
    expect(controller).toContain('@Post("sales/:id/decision")');
    expect(workspace).toContain('fetch("/api/reservations/sales/queue"');
    expect(workspace).toContain("emailMasked");
    expect(workspace).toContain("phoneMasked");
    expect(workspace).toContain("addressMasked");
    expect(workspace).not.toContain("storageKey");
    expect(workspace).not.toContain("identityNumber");
  });

  it("claims a request for review without creating or confirming a booking", () => {
    const claimImplementation = repository
      .split("async claimSalesReview")[1]!
      .split("async decideSalesReview")[0]!;
    expect(repository).toContain(
      'data: { status: "UNDER_REVIEW", assignedSalesId: input.actorId }',
    );
    expect(repository).toContain('fromStatus: "PENDING_REVIEW"');
    expect(repository).toContain('eventKey: "RESERVATION_UNDER_REVIEW"');
    expect(claimImplementation).not.toContain("booking.create");
    expect(workspace).toContain("Claiming starts review and never confirms a booking");
    expect(workspace).toContain(
      "Final booking requires branch attendance, deposit, and a signed contract",
    );
  });

  it("keeps pre-approved requests visible for branch completion", () => {
    expect(repository).toContain('"PRE_APPROVED"');
    expect(workspace).toContain('["PRE_APPROVED", text.preApprovedStatus]');
    expect(workspace).toContain("recordBranchRequirements");
    expect(workspace).toContain("confirmFinalBooking");
  });

  it("records explicit customer-facing decisions without exposing notes as outbox fields", () => {
    expect(repository).toContain('input.action === "REQUEST_INFORMATION"');
    expect(repository).toContain('input.action === "PRE_APPROVE"');
    expect(repository).toContain('input.action === "REJECT"');
    expect(repository).toContain("transaction.customerMessage.create");
    expect(repository).toContain('status: "UNDER_REVIEW"');
    expect(workspace).toContain('submitDecision("REQUEST_INFORMATION")');
    expect(workspace).toContain('submitDecision("PRE_APPROVE")');
    expect(workspace).toContain('submitDecision("REJECT")');
    expect(workspace).toContain("No action here confirms a booking");
  });
});
