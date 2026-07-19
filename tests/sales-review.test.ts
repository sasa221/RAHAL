import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("sales review workspace", () => {
  const workspace = read("apps/web/components/sales-review-workspace.tsx");
  const controller = read("apps/api/src/reservations/reservations.controller.ts");
  const repository = read("apps/api/src/reservations/reservations.repository.ts");

  it("provides shared Arabic and English staff routes", () => {
    expect(existsSync(join(root, "apps/web/app/sales/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "apps/web/app/en/sales/page.tsx"))).toBe(true);
    expect(read("apps/web/app/sales/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/sales/page.tsx")).toContain('locale="en"');
    expect(workspace).toContain('dir={locale === "ar" ? "rtl" : "ltr"}');
  });

  it("keeps queue access role-gated and customer data masked", () => {
    expect(controller).toContain('@Get("sales/queue")');
    expect(controller).toContain('@Post("sales/:id/claim")');
    expect(workspace).toContain('fetch("/api/reservations/sales/queue"');
    expect(workspace).toContain("emailMasked");
    expect(workspace).toContain("phoneMasked");
    expect(workspace).toContain("addressMasked");
    expect(workspace).not.toContain("storageKey");
    expect(workspace).not.toContain("identityNumber");
  });

  it("claims a request for review without creating or confirming a booking", () => {
    expect(repository).toContain(
      'data: { status: "UNDER_REVIEW", assignedSalesId: input.actorId }',
    );
    expect(repository).toContain('fromStatus: "PENDING_REVIEW"');
    expect(repository).toContain('eventKey: "RESERVATION_UNDER_REVIEW"');
    expect(repository).not.toContain("booking.create");
    expect(workspace).toContain("Claiming starts review and never confirms a booking");
    expect(workspace).toContain(
      "Final booking requires branch attendance, deposit, and a signed contract",
    );
  });
});
