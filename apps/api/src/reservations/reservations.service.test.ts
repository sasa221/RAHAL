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

  it("lists only owned live drafts with a truthful next-step summary", async () => {
    const now = new Date();
    const findCustomerDrafts = vi.fn().mockResolvedValue([
      {
        id: "draft-1",
        reference: "RHL-2026-123456",
        status: "DRAFT",
        createdAt: now,
        updatedAt: now,
        pickupAt: new Date(now.getTime() + 3 * 86_400_000),
        returnAt: new Date(now.getTime() + 6 * 86_400_000),
        driverRequested: false,
        estimatedTotal: { toNumber: () => 13_500 },
        customerEmailSnapshot: "customer@example.com",
        customerPhoneSnapshot: "+201001112222",
        nationalitySnapshot: "Egyptian",
        customerCategorySnapshot: "EGYPTIAN",
        addressSnapshot: "Fictional Cairo address",
        emergencyContactNameSnapshot: "Demo Contact",
        emergencyContactPhoneSnapshot: "+201009998888",
        customerDetailsCompletedAt: now,
        termsVersion: "POLICY-1",
        termsAcceptedAt: now,
        privacyConsentAt: now,
        documentConsentAt: now,
        operationalConsentAt: now,
        marketingConsentAt: null,
        vehicle: { id: "vehicle-1", nameAr: "سيارة تجريبية", nameEn: "Demo vehicle" },
        branch: { id: "branch-1", nameAr: "فرع رحال", nameEn: "Rahal branch" },
        documents: [{ type: "NATIONAL_ID_FRONT", status: "UPLOADED" }],
      },
    ]);
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "customer-1", role: "CUSTOMER", preferredLocale: "en" },
        }),
      } as never,
      {
        findCustomerDrafts,
        findDocumentRequirementRules: vi.fn().mockResolvedValue([
          {
            documentType: "NATIONAL_ID_FRONT",
            requiresSelfDrive: false,
          },
          {
            documentType: "DRIVING_LICENSE_FRONT",
            requiresSelfDrive: true,
          },
        ]),
      } as never,
    );

    await expect(service.getCustomerDrafts("session-token", "ar")).resolves.toMatchObject([
      {
        id: "draft-1",
        vehicle: { name: "سيارة تجريبية" },
        progress: {
          completedSteps: 3,
          documentsUploaded: 1,
          documentsRequired: 2,
          nextStep: "DOCUMENTS",
        },
      },
    ]);
    expect(findCustomerDrafts).toHaveBeenCalledWith("customer-1", expect.any(Date));
  });

  it("abandons only an owned draft and removes its private objects", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const abandonCustomerDraft = vi.fn().mockResolvedValue({
      data: {
        id: "draft-1",
        reference: "RHL-2026-123456",
        status: "EXPIRED",
        abandonedAt: new Date().toISOString(),
      },
      storageKeys: ["reservations/draft-1/private.pdf"],
    });
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "customer-1", role: "CUSTOMER" },
        }),
      } as never,
      { abandonCustomerDraft } as never,
      { remove } as never,
    );

    await expect(service.abandonCustomerDraft("session-token", "draft-1")).resolves.toMatchObject({
      id: "draft-1",
      status: "EXPIRED",
    });
    expect(abandonCustomerDraft).toHaveBeenCalledWith("draft-1", "customer-1");
    expect(remove).toHaveBeenCalledWith("reservations/draft-1/private.pdf");
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
      customerCategory: "EGYPTIAN",
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
        customerCategory: "EGYPTIAN",
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

  it("selects required documents from customer category and driver rules", async () => {
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "customer-1", role: "CUSTOMER", preferredLocale: "en" },
        }),
      } as never,
      {
        findOwnedDocumentContext: vi.fn().mockResolvedValue({
          id: "draft-1",
          reference: "RHL-2026-123456",
          status: "DRAFT",
          driverRequested: true,
          customerCategorySnapshot: "EGYPTIAN",
          customerDetailsCompletedAt: new Date(),
          documentConsentAt: new Date(),
        }),
        findDocumentRequirementRules: vi.fn().mockResolvedValue([
          {
            key: "id-front",
            documentType: "NATIONAL_ID_FRONT",
            requiresSelfDrive: false,
            labelAr: "هوية",
            labelEn: "National ID front",
            allowedMimeTypes: ["image/png"],
            maxSizeBytes: 1024,
          },
          {
            key: "licence-front",
            documentType: "DRIVING_LICENSE_FRONT",
            requiresSelfDrive: true,
            labelAr: "رخصة",
            labelEn: "Driving licence front",
            allowedMimeTypes: ["image/png"],
            maxSizeBytes: 1024,
          },
        ]),
        findActiveDocuments: vi.fn().mockResolvedValue([]),
      } as never,
    );

    await expect(service.getDocumentChecklist("session-token", "draft-1")).resolves.toMatchObject({
      complete: false,
      requirements: [{ type: "NATIONAL_ID_FRONT", label: "National ID front" }],
    });
  });

  it("blocks document access until document-processing consent is stored", async () => {
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "customer-1", role: "CUSTOMER", preferredLocale: "en" },
        }),
      } as never,
      {
        findOwnedDocumentContext: vi.fn().mockResolvedValue({
          id: "draft-1",
          reference: "RHL-2026-123456",
          status: "DRAFT",
          driverRequested: false,
          customerCategorySnapshot: "EGYPTIAN",
          customerDetailsCompletedAt: new Date(),
          documentConsentAt: null,
        }),
      } as never,
    );

    await expect(service.getDocumentChecklist("session-token", "draft-1")).rejects.toThrow(
      "Document processing consent is required before upload.",
    );
  });

  it("returns masked final-review data and blocks development-only policies", async () => {
    const policyKeys = ["RENTAL_TERMS", "PRIVACY", "DOCUMENT_PROCESSING", "RESERVATION_PROCESS"];
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: {
            id: "customer-1",
            role: "CUSTOMER",
            preferredLocale: "en",
            fullName: "Trusted Customer",
            email: "trusted@example.com",
            phone: "+201001112222",
            emailVerified: true,
            phoneVerified: true,
          },
        }),
      } as never,
      {
        findOwnedDraftReview: vi.fn().mockResolvedValue({
          id: "draft-1",
          reference: "RHL-2026-123456",
          pickupAt: new Date(Date.now() + 172_800_000),
          returnAt: new Date(Date.now() + 432_000_000),
          driverRequested: false,
          estimatedTotal: { toNumber: () => 13_500 },
          customerNameSnapshot: "Trusted Customer",
          customerEmailSnapshot: "trusted@example.com",
          customerPhoneSnapshot: "+201001112222",
          nationalitySnapshot: "Egyptian",
          customerCategorySnapshot: "EGYPTIAN",
          addressSnapshot: "Fictional Cairo address",
          emergencyContactNameSnapshot: "Emergency Contact",
          emergencyContactPhoneSnapshot: "+201009998888",
          customerDetailsCompletedAt: new Date(),
          termsVersion: "DEV-2026-07-19",
          termsAcceptedAt: new Date(),
          privacyConsentAt: new Date(),
          documentConsentAt: new Date(),
          operationalConsentAt: new Date(),
          marketingConsentAt: null,
          vehicle: {
            id: "silver-executive",
            nameAr: "سيارة فضية",
            nameEn: "Silver Executive Sedan",
            status: "AVAILABLE",
            active: true,
            archivedAt: null,
          },
          branch: { id: "branch-1", nameAr: "فرع رحال", nameEn: "Rahal Branch" },
        }),
        findDocumentRequirementRules: vi.fn().mockResolvedValue([
          {
            documentType: "NATIONAL_ID_FRONT",
            requiresSelfDrive: false,
            labelAr: "وجه الهوية",
            labelEn: "National ID front",
          },
        ]),
        findActiveDocuments: vi
          .fn()
          .mockResolvedValue([{ type: "NATIONAL_ID_FRONT", status: "UPLOADED" }]),
        findConsentPolicies: vi.fn().mockResolvedValue(
          policyKeys.map((policyKey) => ({
            policyKey,
            version: "DEV-2026-07-19",
            title: "Policy",
            body: "Development policy body",
          })),
        ),
        hasSubmissionConflict: vi.fn().mockResolvedValue(false),
      } as never,
    );

    const review = await service.getReview("session-token", "draft-1");

    expect(review).toMatchObject({
      canSubmit: false,
      blockers: ["APPROVED_POLICY_REQUIRED"],
      customer: {
        emailMasked: expect.stringContaining("***"),
        phoneMasked: expect.stringContaining("••••"),
        addressMasked: expect.not.stringContaining("Fictional Cairo address"),
      },
    });
  });

  it("returns only pending review after an authoritative submission", async () => {
    const submitDraft = vi.fn().mockResolvedValue({
      kind: "SUBMITTED",
      data: {
        id: "draft-1",
        reference: "RHL-2026-123456",
        status: "PENDING_REVIEW",
        submittedAt: "2026-07-19T18:00:00.000Z",
      },
    });
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "customer-1", role: "CUSTOMER", preferredLocale: "en" },
        }),
      } as never,
      { submitDraft } as never,
    );

    await expect(service.submitReservation("session-token", "draft-1")).resolves.toMatchObject({
      status: "PENDING_REVIEW",
    });
    expect(submitDraft).toHaveBeenCalledWith({
      draftId: "draft-1",
      customerId: "customer-1",
      locale: "en",
    });
  });

  it("records branch requirements through the assigned sales boundary", async () => {
    const recordBranchChecklist = vi.fn().mockResolvedValue({
      kind: "RECORDED",
      data: {
        id: "reservation-1",
        reference: "RHL-2026-123456",
        status: "PRE_APPROVED",
        attendedAt: "2026-07-26T18:00:00.000Z",
        depositRecordedAt: "2026-07-26T18:00:00.000Z",
        contractSignedAt: "2026-07-26T18:00:00.000Z",
      },
    });
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "sales-1", role: "SALES", preferredLocale: "en" },
        }),
      } as never,
      { recordBranchChecklist } as never,
      undefined,
      { require: vi.fn() } as never,
    );

    await expect(
      service.recordBranchChecklist("session-token", "reservation-1", {
        customerAttended: true,
        depositAmountEgp: 10_000,
        receiptNumber: "RCP-2026-001",
      }),
    ).resolves.toMatchObject({ status: "PRE_APPROVED" });
    expect(recordBranchChecklist).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "sales-1",
        depositAmountEgp: 10_000,
        receiptNumber: "RCP-2026-001",
      }),
    );
  });

  it("protects a valid signed contract PDF before recording its metadata", async () => {
    const recordSignedContract = vi.fn().mockResolvedValue({
      kind: "RECORDED",
      data: {
        id: "reservation-1",
        reference: "RHL-2026-123456",
        status: "SIGNED",
        signedAt: "2026-07-26T17:55:00.000Z",
      },
    });
    const put = vi.fn().mockResolvedValue("contracts/reservation-1/opaque.pdf");
    const remove = vi.fn();
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "sales-1", role: "SALES", preferredLocale: "en" },
        }),
      } as never,
      { recordSignedContract } as never,
      { put, remove } as never,
      { require: vi.fn() } as never,
    );
    const buffer = Buffer.from("%PDF-signed-contract");

    await expect(
      service.uploadSignedContract("session-token", "reservation-1", {
        originalname: "signed-contract.pdf",
        mimetype: "application/pdf",
        size: buffer.length,
        buffer,
      }),
    ).resolves.toMatchObject({ status: "SIGNED" });
    expect(put).toHaveBeenCalledWith("reservation-1", "application/pdf", buffer, "contracts");
    expect(recordSignedContract).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: "reservation-1",
        actorId: "sales-1",
        storageKey: "contracts/reservation-1/opaque.pdf",
      }),
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it("rejects invalid signed-contract bytes before protected storage", async () => {
    const put = vi.fn();
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "sales-1", role: "SALES", preferredLocale: "en" },
        }),
      } as never,
      {} as never,
      { put } as never,
      { require: vi.fn() } as never,
    );
    const buffer = Buffer.from("not-a-pdf");

    await expect(
      service.uploadSignedContract("session-token", "reservation-1", {
        originalname: "signed-contract.pdf",
        mimetype: "application/pdf",
        size: buffer.length,
        buffer,
      }),
    ).rejects.toThrow("The signed contract must be a valid PDF document.");
    expect(put).not.toHaveBeenCalled();
  });

  it("opens a protected signed contract only for the assigned reviewer and audits access", async () => {
    const recordContractAccess = vi.fn();
    const read = vi.fn().mockResolvedValue(Buffer.from("%PDF-signed"));
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "sales-1", role: "SALES", preferredLocale: "en" },
        }),
      } as never,
      {
        findSignedContract: vi.fn().mockResolvedValue({
          id: "contract-1",
          storageKey: "contracts/reservation-1/opaque.pdf",
          reservation: { assignedSalesId: "sales-1" },
        }),
        recordContractAccess,
      } as never,
      { read } as never,
      { require: vi.fn() } as never,
    );

    await expect(
      service.accessSignedContract(
        "session-token",
        "reservation-1",
        { reason: "Confirming the protected branch contract" },
        "ip-hash",
      ),
    ).resolves.toEqual({ bytes: Buffer.from("%PDF-signed") });
    expect(recordContractAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: "contract-1",
        actorId: "sales-1",
        succeeded: true,
      }),
    );
  });

  it("confirms a booking only through the protected repository transition", async () => {
    const confirmBooking = vi.fn().mockResolvedValue({
      kind: "CONFIRMED",
      data: {
        id: "reservation-1",
        reference: "RHL-2026-123456",
        status: "CONFIRMED",
        booking: {
          id: "booking-1",
          reference: "BKG-2026-123456",
          status: "CONFIRMED",
          confirmedAt: "2026-07-26T18:05:00.000Z",
        },
      },
    });
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "sales-1", role: "SALES", preferredLocale: "en" },
        }),
      } as never,
      { confirmBooking } as never,
      undefined,
      { require: vi.fn() } as never,
    );

    await expect(service.confirmBooking("session-token", "reservation-1")).resolves.toMatchObject({
      status: "CONFIRMED",
      booking: { reference: "BKG-2026-123456" },
    });
  });

  it("records an assigned sales delivery through the lifecycle boundary", async () => {
    const recordBookingOperation = vi.fn().mockResolvedValue({
      kind: "RECORDED",
      data: {
        id: "reservation-1",
        reference: "RHL-2026-123456",
        status: "ACTIVE",
        action: "DELIVER",
        recordedAt: "2026-07-26T20:00:00.000Z",
      },
    });
    const service = new ReservationsService(
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "sales-1", role: "SALES", preferredLocale: "en" },
        }),
      } as never,
      { recordBookingOperation } as never,
      undefined,
      { require: vi.fn() } as never,
    );

    await expect(
      service.recordBookingOperation("session-token", "reservation-1", {
        action: "DELIVER",
        odometerKm: 42_100,
        fuelLevelPercent: 75,
        note: "Vehicle inspected and delivered in good condition.",
      }),
    ).resolves.toMatchObject({ status: "ACTIVE", action: "DELIVER" });
    expect(recordBookingOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "sales-1",
        odometerKm: 42_100,
        fuelLevelPercent: 75,
      }),
    );
  });
});
