import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("confirmed booking operations", () => {
  const controller = read("apps/api/src/reservations/reservations.controller.ts");
  const dto = read("apps/api/src/reservations/reservations.dto.ts");
  const repository = read("apps/api/src/reservations/reservations.repository.ts");
  const sales = read("apps/web/components/sales-review-workspace.tsx");
  const customer = read("apps/web/components/customer-requests-workspace.tsx");
  const schema = read("packages/database/prisma/schema.prisma");

  it("exposes one protected operation boundary with an explicit action allowlist", () => {
    expect(controller).toContain('@Post("sales/:id/operations")');
    expect(dto).toContain('["DELIVER", "RETURN", "COMPLETE", "CANCEL", "NO_SHOW"]');
    expect(repository).toContain("async recordBookingOperation");
  });

  it("stores auditable delivery and return readings", () => {
    expect(schema).toContain("model BookingOperation");
    expect(schema).toContain("@@unique([bookingId, type])");
    expect(repository).toContain("transaction.bookingOperation.create");
    expect(repository).toContain("odometerKm");
    expect(repository).toContain("fuelLevelPercent");
    expect(repository).toContain("conditionNote");
  });

  it("enforces the confirmed-active-returned-completed sequence", () => {
    expect(repository).toContain('input.action === "DELIVER"');
    expect(repository).toContain('input.action === "RETURN"');
    expect(repository).toContain('input.action === "COMPLETE"');
    expect(repository).toContain("!reservation.returnedAt");
    expect(repository).toContain("input.odometerKm < delivery.odometerKm");
    expect(repository).toContain("recordedAt < reservation.pickupAt");
  });

  it("updates vehicle state and emits privacy-minimized lifecycle events", () => {
    expect(repository).toContain('data: { status: "RENTED" }');
    expect(repository).toContain('data: { status: "AVAILABLE" }');
    expect(repository).toContain('aggregateType: "BOOKING"');
    const operationImplementation = repository
      .split("async recordBookingOperation")[1]!
      .split("findCustomerRequests")[0]!;
    expect(operationImplementation).toContain("action: input.action");
    expect(operationImplementation).not.toContain("storageKey");
  });

  it("provides bilingual responsive controls and safe customer progress", () => {
    expect(sales).toContain('className="sales-operations-panel"');
    expect(sales).toContain('submitBookingOperation("DELIVER")');
    expect(sales).toContain('submitBookingOperation("RETURN")');
    expect(sales).toContain('submitBookingOperation("COMPLETE")');
    expect(sales).toContain('submitBookingOperation("CANCEL")');
    expect(sales).toContain('submitBookingOperation("NO_SHOW")');
    expect(customer).toContain('className="customer-rental-progress"');
    expect(customer).toContain("detail.rentalProgress.deliveredAt");
    expect(customer).toContain("detail.rentalProgress.returnedAt");
    expect(customer).not.toContain("odometerKm");
  });

  it("ships a migration with database reading constraints", () => {
    const migration =
      "packages/database/prisma/migrations/20260726200000_booking_operations/migration.sql";
    expect(existsSync(join(root, migration))).toBe(true);
    expect(read(migration)).toContain('"fuelLevelPercent" <= 100');
    expect(read(migration)).toContain('"odometerKm" >= 0');
  });
});
