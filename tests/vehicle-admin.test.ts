import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("administrator vehicle management", () => {
  const controller = read("apps/api/src/vehicles/vehicles.controller.ts");
  const dto = read("apps/api/src/vehicles/vehicle-admin.dto.ts");
  const repository = read("apps/api/src/vehicles/vehicles.repository.ts");
  const service = read("apps/api/src/vehicles/vehicles.service.ts");
  const manager = read("apps/web/components/fleet-vehicle-manager.tsx");
  const calendar = read("apps/web/components/fleet-calendar-workspace.tsx");
  const styles = read("apps/web/app/globals.css");

  it("exposes protected catalog, create, and update boundaries", () => {
    expect(controller).toContain('@Get("admin/catalog")');
    expect(controller).toContain('@Post("admin")');
    expect(controller).toContain('@Patch("admin/:id")');
    expect(service).toContain('session.user.role !== "ADMIN"');
    expect(service).toContain('session.user.role !== "SUPER_ADMIN"');
    expect(service).toContain("Only administrators can manage vehicles");
  });

  it("validates operational and EGP pricing fields on the server", () => {
    expect(dto).toContain('["economy", "sedan", "suv"]');
    expect(dto).toContain('["AUTOMATIC", "MANUAL"]');
    expect(dto).toContain('["OPTIONAL", "MANDATORY", "UNAVAILABLE"]');
    expect(dto).toContain("dailyRateEgp");
    expect(dto).toContain("depositAmountEgp");
    expect(dto).toContain("@Max(100_000_000)");
  });

  it("does not let administrators fake workflow-owned vehicle states", () => {
    expect(repository).toContain('status: input.active ? "AVAILABLE" : "INACTIVE"');
    expect(repository).toContain('previous.status === "AVAILABLE"');
    expect(repository).toContain('previous.status === "INACTIVE"');
    expect(service).toContain("active operational state cannot be deactivated");
    expect(dto).not.toContain("status!");
  });

  it("audits creation and updates with a bounded operational snapshot", () => {
    expect(repository).toContain('action: "VEHICLE_CREATED"');
    expect(repository).toContain('action: "VEHICLE_UPDATED"');
    expect(repository).toContain("previousData: auditVehicle(previous)");
    expect(repository).toContain("newData: auditVehicle(vehicle)");
    expect(repository).not.toContain("customerNameSnapshot");
  });

  it("handles duplicate registrations and inactive branches safely", () => {
    expect(service).toContain("The selected active branch was not found.");
    expect(service).toContain('"P2002"');
    expect(service).toContain("registration number or generated vehicle URL already exists");
    expect(repository).toContain("where: { id, active: true }");
  });

  it("ships one bilingual responsive registry and editor", () => {
    expect(manager).toContain("ar: {");
    expect(manager).toContain("en: {");
    expect(manager).toContain('"/api/vehicles/admin/catalog"');
    expect(manager).toContain('method: id ? "PATCH" : "POST"');
    expect(calendar).toContain("<FleetVehicleManager");
    expect(calendar).toContain('kind === "admin"');
    expect(calendar).toContain('href="#vehicle-registry"');
    expect(manager).toContain('className="fleet-editor-advanced"');
    expect(read("apps/web/app/admin/fleet/page.tsx")).toContain('kind="admin"');
    expect(read("apps/web/app/en/admin/fleet/page.tsx")).toContain('kind="admin"');
    expect(styles).toContain(".fleet-vehicle-registry");
    expect(styles).toContain(".fleet-vehicle-editor");
    expect(styles).toContain(".fleet-editor-advanced");
    expect(styles).toContain("@media (max-width: 760px)");
  });
});
