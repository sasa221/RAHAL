import { BadRequestException } from "@nestjs/common";
import { DriverPolicy } from "@rahal/database";
import { ReservationsService } from "./reservations.service";

function futureDate(offset: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

describe("reservation draft service", () => {
  const session = {
    user: {
      id: "customer-1",
      role: "CUSTOMER" as const,
    },
  };
  const vehicle = {
    id: "silver-executive",
    branchId: "demo-branch-cairo",
    minimumRentalDays: 2,
    driverPolicy: DriverPolicy.OPTIONAL,
    dailyRate: { toNumber: () => 4500 },
    driverCharge: { toNumber: () => 700 },
  };

  it("saves an authenticated customer's valid first-step draft", async () => {
    const saveDraft = vi.fn().mockResolvedValue({ reference: "RHL-2026-123456" });
    const service = new ReservationsService(
      { getSession: vi.fn().mockResolvedValue(session) } as never,
      { findVehicle: vi.fn().mockResolvedValue(vehicle), saveDraft } as never,
    );

    await expect(
      service.saveDraft("session-token", {
        vehicleId: vehicle.id,
        pickupDate: futureDate(2),
        returnDate: futureDate(5),
        driverRequested: true,
      }),
    ).resolves.toMatchObject({ reference: "RHL-2026-123456" });
    expect(saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "customer-1", rentalDays: 3 }),
    );
  });

  it("rejects a rental shorter than the vehicle minimum", async () => {
    const service = new ReservationsService(
      { getSession: vi.fn().mockResolvedValue(session) } as never,
      { findVehicle: vi.fn().mockResolvedValue(vehicle), saveDraft: vi.fn() } as never,
    );

    await expect(
      service.saveDraft("session-token", {
        vehicleId: vehicle.id,
        pickupDate: futureDate(2),
        returnDate: futureDate(3),
        driverRequested: false,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects past pickup dates", async () => {
    const service = new ReservationsService(
      { getSession: vi.fn().mockResolvedValue(session) } as never,
      { findVehicle: vi.fn().mockResolvedValue(vehicle), saveDraft: vi.fn() } as never,
    );

    await expect(
      service.saveDraft("session-token", {
        vehicleId: vehicle.id,
        pickupDate: "2025-01-01",
        returnDate: "2025-01-04",
        driverRequested: false,
      }),
    ).rejects.toThrow("Pickup date must be in the future.");
  });

  it("rejects staff sessions at the service boundary", async () => {
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "sales-1", role: "SALES" },
        }),
      } as never,
      { findVehicle: vi.fn(), saveDraft: vi.fn() } as never,
    );

    await expect(
      service.saveDraft("session-token", {
        vehicleId: vehicle.id,
        pickupDate: futureDate(2),
        returnDate: futureDate(5),
        driverRequested: false,
      }),
    ).rejects.toThrow("Only customer accounts can create reservation drafts.");
  });

  it("enforces the database driver policy", async () => {
    const service = new ReservationsService(
      { getSession: vi.fn().mockResolvedValue(session) } as never,
      {
        findVehicle: vi
          .fn()
          .mockResolvedValue({ ...vehicle, driverPolicy: DriverPolicy.MANDATORY }),
        saveDraft: vi.fn(),
      } as never,
    );

    await expect(
      service.saveDraft("session-token", {
        vehicleId: vehicle.id,
        pickupDate: futureDate(2),
        returnDate: futureDate(5),
        driverRequested: false,
      }),
    ).rejects.toThrow("This vehicle requires a driver.");
  });
});
