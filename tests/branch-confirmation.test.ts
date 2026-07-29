import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("branch completion and booking confirmation", () => {
  const controller = read("apps/api/src/reservations/reservations.controller.ts");
  const repository = read("apps/api/src/reservations/reservations.repository.ts");
  const service = read("apps/api/src/reservations/reservations.service.ts");
  const contracts = read("packages/contracts/src/index.ts");
  const schema = read("packages/database/prisma/schema.prisma");

  it("records branch requirements separately from final confirmation", () => {
    expect(controller).toContain('@Post("sales/:id/branch-checklist")');
    expect(controller).toContain('@Post("sales/:id/confirm")');
    expect(repository).toContain("async recordBranchChecklist");
    expect(repository).toContain("async confirmBooking");
    expect(repository).toContain('toStatus: "PRE_APPROVED"');
    expect(repository).toContain('toStatus: "CONFIRMED"');
  });

  it("requires attendance, deposit, and a signed contract before booking creation", () => {
    expect(schema).toContain("branchAttendedAt");
    expect(repository).toContain("!reservation.branchAttendedAt");
    expect(repository).toContain("!reservation.deposit");
    expect(repository).toContain("!reservation.contracts.length");
    expect(service).toContain("BRANCH_REQUIREMENTS_INCOMPLETE");
  });

  it("requires a scanned protected PDF instead of trusting a signed checkbox", () => {
    expect(controller).toContain('@Post("sales/:id/signed-contract")');
    expect(service).toContain("uploadSignedContract");
    expect(service).toContain("documentScanner.assertClean");
    expect(repository).toContain("async recordSignedContract");
    expect(repository).toContain("storageKey: input.storageKey");
    expect(controller).toContain('@Post("sales/:id/signed-contract/access")');
    expect(repository).toContain("recordContractAccess");
    expect(schema).toContain("model ContractAccessLog");
    expect(read("apps/web/components/sales-review-workspace.tsx")).not.toContain(
      "contractSigned: true",
    );
  });

  it("rechecks availability and relies on the database overlap constraint", () => {
    expect(repository).toContain("transaction.vehicleBlock.findFirst");
    expect(repository).toContain("transaction.booking.findFirst");
    expect(repository).toContain("Booking_vehicle_period_no_overlap");
    expect(repository).toContain("isBookingConflictError");
  });

  it("creates an EGP snapshot and privacy-minimized notification", () => {
    const confirmationImplementation = repository
      .split("async confirmBooking")[1]!
      .split("async recordBookingOperation")[0]!;
    expect(repository).toContain('currency: "EGP"');
    expect(repository).toContain('eventKey: "RESERVATION_BOOKING_CONFIRMED"');
    expect(repository).toContain("transaction.booking.create");
    expect(contracts).toContain("SalesBookingConfirmationResult");
    expect(confirmationImplementation).toContain(
      'where: { status: "SIGNED", signedAt: { not: null }, storageKey: { not: null } }',
    );
    expect(confirmationImplementation).toContain("select: { id: true }");
    const confirmationContract = contracts
      .split("export type SalesBookingConfirmationResult")[1]!
      .split("export type SalesBookingOperationResult")[0]!;
    expect(confirmationContract).not.toContain("storageKey");
  });

  it("ships a reviewable migration for branch attendance", () => {
    const migration =
      "packages/database/prisma/migrations/20260726190000_branch_confirmation_workflow/migration.sql";
    expect(existsSync(join(root, migration))).toBe(true);
    expect(read(migration)).toContain('ADD COLUMN "branchAttendedAt"');
  });
});
