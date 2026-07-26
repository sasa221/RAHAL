import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { VehiclesService } from "./vehicles.service";

const input = {
  branchId: "branch-1",
  nameAr: "رحال سيدان",
  nameEn: "Rahal Sedan",
  make: "Rahal",
  model: "S1",
  year: 2026,
  registrationNumber: "RHL 1026",
  category: "sedan" as const,
  transmission: "AUTOMATIC" as const,
  fuelType: "PETROL",
  seats: 5,
  luggage: 2,
  doors: 4,
  dailyRateEgp: 2500,
  weeklyRateEgp: 15_000,
  minimumRentalDays: 2,
  driverPolicy: "OPTIONAL" as const,
  driverChargeEgp: 700,
  mileageAllowancePerDay: 200,
  depositAmountEgp: 10_000,
  active: true,
  featured: false,
};

function setup(role: "CUSTOMER" | "SALES" | "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
  const auth = {
    getSession: vi.fn().mockResolvedValue({ user: { id: "actor-1", role } }),
  };
  const repository = {
    adminCatalog: vi.fn(),
    findBranch: vi.fn().mockResolvedValue({ id: "branch-1" }),
    findManagedVehicle: vi.fn(),
    createManagedVehicle: vi.fn().mockResolvedValue({ id: "vehicle-1" }),
    updateManagedVehicle: vi.fn().mockResolvedValue({ id: "vehicle-1" }),
  };
  return {
    auth,
    repository,
    service: new VehiclesService(repository as never, auth as never),
  };
}

describe("VehiclesService administrator boundary", () => {
  it("rejects sales accounts from the managed catalog", async () => {
    const { service } = setup("SALES");
    await expect(service.adminCatalog("session")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates through an active branch with server-owned status mapping", async () => {
    const { service, repository } = setup();
    await service.createManagedVehicle("session", input);
    expect(repository.createManagedVehicle).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: "branch-1",
        registrationNumber: "RHL 1026",
        dailyRate: 2500,
        driverChargeType: "PER_DAY",
      }),
      "actor-1",
    );
    expect(repository.createManagedVehicle.mock.calls[0]![0]).not.toHaveProperty("status");
  });

  it("rejects a branch that is not active", async () => {
    const { service, repository } = setup();
    repository.findBranch.mockResolvedValue(null);
    await expect(service.createManagedVehicle("session", input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("does not deactivate a vehicle in a workflow-owned state", async () => {
    const { service, repository } = setup();
    repository.findManagedVehicle.mockResolvedValue({
      id: "vehicle-1",
      slug: "rahal-sedan-rhl1026",
      status: "RENTED",
    });
    await expect(
      service.updateManagedVehicle("session", "vehicle-1", { ...input, active: false }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.updateManagedVehicle).not.toHaveBeenCalled();
  });

  it("preserves an existing URL during updates", async () => {
    const { service, repository } = setup();
    repository.findManagedVehicle.mockResolvedValue({
      id: "vehicle-1",
      slug: "stable-vehicle-url",
      status: "AVAILABLE",
    });
    await service.updateManagedVehicle("session", "vehicle-1", input);
    expect(repository.updateManagedVehicle).toHaveBeenCalledWith(
      "vehicle-1",
      expect.objectContaining({ slug: "stable-vehicle-url" }),
      "actor-1",
    );
  });

  it("maps database uniqueness violations to a conflict", async () => {
    const { service, repository } = setup();
    repository.createManagedVehicle.mockRejectedValue({ code: "P2002" });
    await expect(service.createManagedVehicle("session", input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
