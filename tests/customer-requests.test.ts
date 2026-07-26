import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("customer request follow-up", () => {
  const workspace = read("apps/web/components/customer-requests-workspace.tsx");
  const controller = read("apps/api/src/reservations/reservations.controller.ts");
  const repository = read("apps/api/src/reservations/reservations.repository.ts");
  const shell = read("apps/web/components/workspace-shell.tsx");

  it("shares one responsive workspace across Arabic and English routes", () => {
    expect(existsSync(join(root, "apps/web/app/account/requests/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "apps/web/app/en/account/requests/page.tsx"))).toBe(true);
    expect(read("apps/web/app/account/requests/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/account/requests/page.tsx")).toContain('locale="en"');
    expect(workspace).toContain('dir={locale === "ar" ? "rtl" : "ltr"}');
    expect(workspace).toContain('<WorkspaceShell kind="customer" locale={locale}>');
    expect(workspace).toContain('className="customer-status-track"');
    expect(shell).toContain('className="portal-bottom-nav"');
    expect(shell).toContain('src="/images/rahal-logo.png"');
  });

  it("uses owner-authorized request endpoints and excludes protected values", () => {
    expect(controller).toContain('@Get("customer/requests")');
    expect(controller).toContain('@Get("customer/requests/:id")');
    expect(controller).toContain('@Post("customer/requests/:id/respond")');
    expect(workspace).toContain('credentials: "include"');
    expect(workspace).not.toContain("storageKey");
    expect(workspace).not.toContain("identityNumber");
  });

  it("returns a requested-information response to review atomically without booking creation", () => {
    const responseImplementation = repository
      .split("async respondToInformationRequest")[1]!
      .split("async respondToAlternativeOffer")[0]!;
    expect(repository).toContain('status: "MORE_INFORMATION_REQUIRED"');
    expect(repository).toContain('data: { status: "UNDER_REVIEW" }');
    expect(repository).toContain("transaction.customerMessage.create");
    expect(repository).toContain('eventKey: "RESERVATION_CUSTOMER_RESPONDED"');
    expect(responseImplementation).not.toContain("booking.create");
  });

  it("shows branch progress and only a safe booking reference to the owner", () => {
    expect(workspace).toContain('className="customer-branch-progress"');
    expect(workspace).toContain("detail.branchProgress.depositRecorded");
    expect(workspace).toContain("detail.branchProgress.contractSigned");
    expect(workspace).toContain("detail.branchProgress.bookingReference");
    expect(workspace).not.toContain("receiptNumber");
  });

  it("shows delivery, return, and completion timestamps without staff readings", () => {
    expect(workspace).toContain("detail.rentalProgress.deliveredAt");
    expect(workspace).toContain("detail.rentalProgress.returnedAt");
    expect(workspace).toContain("detail.rentalProgress.completedAt");
    expect(workspace).not.toContain("fuelLevelPercent");
    expect(workspace).not.toContain("odometerKm");
  });

  it("keeps replies bounded and final confirmation at the branch", () => {
    expect(workspace).toContain("message.trim().length < 10");
    expect(workspace).toContain("maxLength={500}");
    expect(workspace).toContain("A submitted request is not a confirmed booking");
    expect(workspace).toContain(
      "Final confirmation requires branch attendance, deposit payment, and signed rental documents",
    );
  });
});
