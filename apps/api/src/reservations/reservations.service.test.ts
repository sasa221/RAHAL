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

  it("saves owned-draft details using trusted session contacts", async () => {
    const saveCustomerDetails = vi.fn().mockResolvedValue({
      draftId: "draft-1",
      reference: "RHL-2026-123456",
    });
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: {
            id: "customer-1",
            role: "CUSTOMER",
            fullName: "Trusted Customer",
            email: "trusted@example.com",
            phone: "+201001112222",
          },
        }),
      } as never,
      {
        findOwnedDraft: vi.fn().mockResolvedValue({ id: "draft-1", reference: "RHL-2026-123456" }),
        saveCustomerDetails,
      } as never,
    );

    await service.saveCustomerDetails("session-token", "draft-1", {
      nationality: "Egyptian",
      address: "Fictional Cairo address",
      emergencyContactName: "Emergency Contact",
      emergencyContactPhone: "+201009998888",
    });

    expect(saveCustomerDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "customer-1",
        fullName: "Trusted Customer",
        email: "trusted@example.com",
        phone: "+201001112222",
      }),
    );
  });

  it("does not allow a customer to update another draft", async () => {
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "customer-1", role: "CUSTOMER" },
        }),
      } as never,
      { findOwnedDraft: vi.fn().mockResolvedValue(null), saveCustomerDetails: vi.fn() } as never,
    );

    await expect(
      service.saveCustomerDetails("session-token", "another-customer-draft", {
        nationality: "Egyptian",
        address: "Fictional Cairo address",
        emergencyContactName: "Emergency Contact",
        emergencyContactPhone: "+201009998888",
      }),
    ).rejects.toThrow("The reservation draft was not found.");
  });

  it("builds a consent bundle only when every policy has the same version", async () => {
    const policyKeys = ["RENTAL_TERMS", "PRIVACY", "DOCUMENT_PROCESSING", "RESERVATION_PROCESS"];
    const service = new ReservationsService(
      {} as never,
      {
        findConsentPolicies: vi.fn().mockResolvedValue(
          policyKeys.map((policyKey) => ({
            policyKey,
            version: "DEV-2026-07-19",
            title: `${policyKey} title`,
            body: `${policyKey} body`,
          })),
        ),
      } as never,
    );

    await expect(service.getConsentBundle("en")).resolves.toMatchObject({
      version: "DEV-2026-07-19",
      developmentOnly: true,
      policies: expect.arrayContaining([expect.objectContaining({ key: "PRIVACY" })]),
    });
  });

  it("rejects stale consent versions and requires completed customer details", async () => {
    const user = {
      id: "customer-1",
      role: "CUSTOMER",
      preferredLocale: "en",
    };
    const service = new ReservationsService(
      { getSession: vi.fn().mockResolvedValue({ user }) } as never,
      {
        findOwnedDraft: vi.fn().mockResolvedValue({
          id: "draft-1",
          reference: "RHL-2026-123456",
          customerDetailsCompletedAt: new Date(),
        }),
        findConsentPolicies: vi.fn().mockResolvedValue(
          ["RENTAL_TERMS", "PRIVACY", "DOCUMENT_PROCESSING", "RESERVATION_PROCESS"].map(
            (policyKey) => ({
              policyKey,
              version: "DEV-2026-07-19",
              title: "Policy",
              body: "Development policy body",
            }),
          ),
        ),
        saveConsents: vi.fn(),
      } as never,
    );

    await expect(
      service.saveConsents("session-token", "draft-1", {
        policyVersion: "OLD-VERSION",
        termsAccepted: true,
        privacyAccepted: true,
        documentAccepted: true,
        operationalAccepted: true,
        marketingAccepted: false,
      }),
    ).rejects.toThrow("The policy version changed.");
  });
});
