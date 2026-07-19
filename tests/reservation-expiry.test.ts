import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("automatic reservation review expiry", () => {
  const worker = read("apps/api/src/reservations/reservation-expiry.service.ts");
  const repository = read("apps/api/src/reservations/reservations.repository.ts");
  const moduleSource = read("apps/api/src/reservations/reservations.module.ts");

  it("registers a non-overlapping background sweep with clean shutdown", () => {
    expect(moduleSource).toContain("ReservationExpiryService");
    expect(worker).toContain("OnApplicationBootstrap");
    expect(worker).toContain("OnApplicationShutdown");
    expect(worker).toContain("this.timer.unref()");
    expect(worker).toContain("if (this.running)");
  });

  it("expires pending alternatives back to sales review", () => {
    expect(repository).toContain('where: { status: "PENDING", expiresAt: { lte: now } }');
    expect(repository).toContain('data: { status: "EXPIRED" }');
    expect(repository).toContain('fromStatus: "ALTERNATIVE_OFFERED"');
    expect(repository).toContain('toStatus: "UNDER_REVIEW"');
    expect(repository).toContain('eventKey: "RESERVATION_ALTERNATIVE_EXPIRED"');
  });

  it("expires stale pre-approvals without creating bookings", () => {
    expect(repository).toContain(
      'where: { status: "PRE_APPROVED", preApprovalExpiresAt: { lte: now } }',
    );
    expect(repository).toContain('fromStatus: "PRE_APPROVED"');
    expect(repository).toContain('toStatus: "EXPIRED"');
    expect(repository).toContain('eventKey: "RESERVATION_PRE_APPROVAL_EXPIRED"');
    expect(repository).not.toContain("booking.create");
  });
});
