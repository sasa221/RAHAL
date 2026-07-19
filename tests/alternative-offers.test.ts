import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("alternative reservation offers", () => {
  const controller = read("apps/api/src/reservations/reservations.controller.ts");
  const repository = read("apps/api/src/reservations/reservations.repository.ts");
  const sales = read("apps/web/components/sales-review-workspace.tsx");
  const customer = read("apps/web/components/customer-requests-workspace.tsx");

  it("exposes distinct staff-create and customer-response boundaries", () => {
    expect(controller).toContain('@Post("sales/:id/alternative-offers")');
    expect(controller).toContain('@Post("customer/requests/:id/alternative-offer")');
    expect(sales).toContain("submitAlternativeOffer");
    expect(customer).toContain("respondToAlternative");
  });

  it("checks operational availability before offering and accepting", () => {
    expect(repository).toContain("transaction.vehicleBlock.findFirst");
    expect(repository).toContain("transaction.booking.findFirst");
    expect(repository).toContain('status: { in: ["CONFIRMED", "ACTIVE"] }');
    expect(repository).toContain('status: "AVAILABLE"');
  });

  it("snapshots the alternative and keeps customer acceptance under review", () => {
    expect(repository).toContain("dailyRateSnapshot: dailyRate");
    expect(repository).toContain("estimatedTotal");
    expect(repository).toContain('toStatus: "ALTERNATIVE_OFFERED"');
    expect(repository).toContain('reservationStatus: "UNDER_REVIEW"');
    expect(repository).not.toContain("booking.create");
  });

  it("states that alternative offers never confirm a booking", () => {
    expect(sales).toContain("The offer lasts 48 hours and never confirms a booking");
    expect(customer).toContain("Accepting never confirms a booking");
    expect(customer).toContain('respondToAlternative("ACCEPT")');
    expect(customer).toContain('respondToAlternative("DECLINE")');
  });
});
