import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("staff fleet calendar", () => {
  const controller = read("apps/api/src/fleet/fleet.controller.ts");
  const service = read("apps/api/src/fleet/fleet.service.ts");
  const repository = read("apps/api/src/fleet/fleet.repository.ts");
  const component = read("apps/web/components/fleet-calendar-workspace.tsx");
  const shell = read("apps/web/components/workspace-shell.tsx");
  const styles = read("apps/web/app/globals.css");

  it("exposes a staff-only bounded calendar endpoint", () => {
    expect(controller).toContain('@Get("calendar")');
    expect(service).toContain('new Set(["SALES", "ADMIN", "SUPER_ADMIN"])');
    expect(service).toContain("range cannot exceed 63 days");
    expect(service).toContain("Only Rahal staff can access the fleet calendar");
  });

  it("keeps customer identity data out of the calendar query and contract", () => {
    const contracts = read("packages/contracts/src/index.ts");
    const calendarContracts = contracts
      .split("export type FleetCalendarEventKind")[1]!
      .split("export type InAppNotification")[0]!;
    expect(repository).not.toContain("customerNameSnapshot");
    expect(repository).not.toContain("customerEmailSnapshot");
    expect(repository).not.toContain("customerPhoneSnapshot");
    expect(calendarContracts).not.toContain("customer:");
    expect(component).toContain("never shows customer names or contact details");
  });

  it("separates non-blocking requests from confirmed operational occupancy", () => {
    expect(service).toContain('kind: "PENDING"');
    expect(service).toContain("blocksAvailability: false");
    expect(service).toContain('kind: booking.status === "ACTIVE" ? "ACTIVE" : "CONFIRMED"');
    expect(repository).toContain('status: { in: ["CONFIRMED", "ACTIVE"] }');
  });

  it("allows only administrators to create or remove audited blocks", () => {
    expect(controller).toContain('@Post("blocks")');
    expect(controller).toContain('@Delete("blocks/:id")');
    expect(service).toContain('new Set(["ADMIN", "SUPER_ADMIN"])');
    expect(repository).toContain('action: "FLEET_BLOCK_CREATED"');
    expect(repository).toContain('action: "FLEET_BLOCK_REMOVED"');
    expect(repository).toContain("transaction.auditLog.create");
  });

  it("rejects overlaps with confirmed rentals and existing blocks", () => {
    expect(repository).toContain("findBlockingConflict");
    expect(repository).toContain("blocks:");
    expect(repository).toContain("bookings:");
    expect(service).toContain("overlaps an existing confirmed booking or fleet block");
  });

  it("provides bilingual desktop and mobile calendar experiences", () => {
    expect(component).toContain("ar: {");
    expect(component).toContain("en: {");
    expect(component).toContain('className="fleet-calendar-panel"');
    expect(component).toContain('className="fleet-agenda"');
    expect(styles).toContain(".fleet-calendar-panel");
    expect(styles).toContain(".fleet-agenda");
    expect(styles).toContain("@media (max-width: 760px)");
    expect(shell).toContain('activePage === "fleet"');
    expect(shell).toContain('"/fleet"');
  });
});
