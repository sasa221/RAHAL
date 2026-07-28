import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "./app.module";
import { BranchesRepository } from "./branches/branches.repository";
import { setupApp } from "./setup-app";
import { VehiclesRepository } from "./vehicles/vehicles.repository";
import { AuthRepository } from "./auth/auth.repository";
import { PasswordService } from "./auth/password.service";
import { hashSessionToken } from "./auth/auth.service";
import { AuthRateLimitService } from "./auth/auth-rate-limit.service";
import { ReservationsRepository } from "./reservations/reservations.repository";
import { PrivateDocumentStorage } from "./reservations/private-document-storage";
import { StaffRepository } from "./staff/staff.repository";

const fakeVehicles = [
  {
    id: "silver-executive",
    nameAr: "سيدان تنفيذية فضية",
    nameEn: "Silver Executive Sedan",
    categoryAr: "سيدان",
    categoryEn: "Sedan",
    dailyRateEgp: 4500,
    status: "AVAILABLE" as const,
  },
  {
    id: "graphite-suv",
    nameAr: "دفع رباعي جرافيت",
    nameEn: "Graphite Family SUV",
    categoryAr: "دفع رباعي",
    categoryEn: "SUV",
    dailyRateEgp: 5800,
    status: "AVAILABLE" as const,
  },
  {
    id: "white-compact",
    nameAr: "سيدان اقتصادية بيضاء",
    nameEn: "White Compact Sedan",
    categoryAr: "اقتصادية",
    categoryEn: "Economy",
    dailyRateEgp: 1900,
    status: "CONFIRMED_BOOKING" as const,
  },
];

describe("RAHAL API", () => {
  let app: INestApplication;
  let storedSessionHash = "";
  let storedSessionUser: typeof authUser | typeof salesUser;
  let documentCookie = "";
  let salesAssigned = false;
  let customerResponded = false;
  let alternativeOffered = false;
  let alternativeResponded = false;
  let uploadedDocuments: Array<{
    id: string;
    type: "NATIONAL_ID_FRONT";
    status: "UPLOADED";
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
  }> = [];

  const authUser = {
    id: "customer-e2e",
    email: "customer@example.com",
    phone: "+201001112222",
    passwordHash: "secure-password-hash",
    fullNameAr: null,
    fullNameEn: "Rahal Customer",
    preferredLocale: "en",
    systemRole: "CUSTOMER" as const,
    status: "ACTIVE" as const,
    emailVerifiedAt: new Date("2026-07-01T00:00:00Z"),
    phoneVerifiedAt: new Date("2026-07-01T00:00:00Z"),
  };

  const salesUser = {
    ...authUser,
    id: "sales-e2e",
    email: "sales@example.com",
    phone: "+201001115555",
    fullNameEn: "Rahal Sales Employee",
    systemRole: "SALES" as const,
  };

  storedSessionUser = authUser;

  const salesReviewRecord = () => ({
    id: "reservation-draft-e2e",
    reference: "RHL-2026-123456",
    status:
      alternativeOffered && !alternativeResponded
        ? "ALTERNATIVE_OFFERED"
        : salesAssigned
          ? "UNDER_REVIEW"
          : "PENDING_REVIEW",
    submittedAt: new Date("2026-07-19T18:00:00.000Z"),
    preApprovalExpiresAt: null,
    createdAt: new Date("2026-07-19T17:00:00.000Z"),
    pickupAt: new Date("2026-08-01T12:00:00.000Z"),
    returnAt: new Date("2026-08-04T12:00:00.000Z"),
    driverRequested: false,
    estimatedTotal: { toNumber: () => 13_500 },
    assignedSalesId: salesAssigned ? salesUser.id : null,
    customerNameSnapshot: "Rahal Customer",
    customerEmailSnapshot: "customer@example.com",
    customerPhoneSnapshot: "+201001112222",
    nationalitySnapshot: "Egyptian",
    customerCategorySnapshot: "EGYPTIAN",
    addressSnapshot: "Fictional Cairo address",
    emergencyContactNameSnapshot: "Emergency Contact",
    emergencyContactPhoneSnapshot: "+201009998888",
    termsVersion: "PROD-2026-01",
    termsAcceptedAt: new Date(),
    privacyConsentAt: new Date(),
    documentConsentAt: new Date(),
    operationalConsentAt: new Date(),
    vehicle: {
      id: "silver-executive",
      nameAr: "سيدان تنفيذية فضية",
      nameEn: "Silver Executive Sedan",
    },
    branch: {
      id: "demo-branch-cairo",
      nameAr: "فرع رحال القاهرة التجريبي",
      nameEn: "Rahal Cairo Demo Branch",
    },
    customer: {
      email: authUser.email,
      phone: authUser.phone,
      emailVerifiedAt: authUser.emailVerifiedAt,
      phoneVerifiedAt: authUser.phoneVerifiedAt,
    },
    documents: [{ type: "NATIONAL_ID_FRONT", status: "UPLOADED", createdAt: new Date() }],
    events: [
      {
        fromStatus: "DRAFT",
        toStatus: "PENDING_REVIEW",
        note: "Customer submitted the reservation request for sales review.",
        createdAt: new Date("2026-07-19T18:00:00.000Z"),
      },
    ],
    alternativeOffers: alternativeOffered
      ? [
          {
            id: "alternative-e2e",
            status: alternativeResponded ? "ACCEPTED" : "PENDING",
            proposedPickupAt: new Date("2026-08-06T12:00:00.000Z"),
            proposedReturnAt: new Date("2026-08-09T12:00:00.000Z"),
            dailyRateSnapshot: { toNumber: () => 5800 },
            estimatedTotal: { toNumber: () => 17_400 },
            note: "We can offer the family SUV for these alternative dates.",
            expiresAt: new Date("2026-08-03T12:00:00.000Z"),
            respondedAt: alternativeResponded ? new Date("2026-08-01T12:15:00.000Z") : null,
            vehicle: {
              id: "graphite-suv",
              nameAr: "دفع رباعي جرافيت",
              nameEn: "Graphite Family SUV",
            },
          },
        ]
      : [],
  });

  const customerRequestRecord = () => ({
    ...salesReviewRecord(),
    status:
      alternativeOffered && !alternativeResponded
        ? "ALTERNATIVE_OFFERED"
        : customerResponded
          ? "UNDER_REVIEW"
          : "MORE_INFORMATION_REQUIRED",
    assignedSalesId: salesUser.id,
    documents: [{ type: "NATIONAL_ID_FRONT", status: "UPLOADED" }],
    customerMessages: [
      {
        id: "sales-message-e2e",
        body: "Please confirm the emergency contact relationship.",
        createdAt: new Date("2026-07-19T20:00:00.000Z"),
        sender: { systemRole: "SALES" },
      },
      ...(customerResponded
        ? [
            {
              id: "customer-message-e2e",
              body: "The emergency contact is my brother.",
              createdAt: new Date("2026-07-19T20:05:00.000Z"),
              sender: { systemRole: "CUSTOMER" },
            },
          ]
        : []),
    ],
    alternativeOffers: salesReviewRecord().alternativeOffers,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(VehiclesRepository)
      .useValue({
        list: async () => fakeVehicles,
        findById: async (id: string) => fakeVehicles.find((vehicle) => vehicle.id === id) ?? null,
      })
      .overrideProvider(BranchesRepository)
      .useValue({
        list: async () => [
          {
            id: "demo-branch-cairo",
            nameAr: "فرع رحال القاهرة التجريبي",
            nameEn: "Rahal Cairo Demo Branch",
            addressAr: "عنوان تجريبي — القاهرة، مصر",
            addressEn: "Fictional address — Cairo, Egypt",
            active: true,
          },
        ],
      })
      .overrideProvider(AuthRepository)
      .useValue({
        findByIdentifier: async (identifier: string) =>
          [authUser.email, authUser.phone].includes(identifier)
            ? authUser
            : [salesUser.email, salesUser.phone].includes(identifier)
              ? salesUser
              : null,
        createUser: async () => authUser,
        createSession: async (input: {
          userId: string;
          refreshTokenHash: string;
          expiresAt: Date;
        }) => {
          storedSessionHash = input.refreshTokenHash;
          storedSessionUser = input.userId === salesUser.id ? salesUser : authUser;
          return { id: "session-e2e", expiresAt: input.expiresAt };
        },
        findSession: async (refreshTokenHash: string) =>
          refreshTokenHash === storedSessionHash
            ? {
                id: "session-e2e",
                expiresAt: new Date(Date.now() + 60_000),
                user: storedSessionUser,
              }
            : null,
        touchSession: async () => undefined,
        revokeSession: async () => ({ count: 1 }),
        writeAudit: async () => undefined,
      })
      .overrideProvider(PasswordService)
      .useValue({
        hash: async () => "secure-password-hash",
        verify: async (password: string) => password === "correct-customer-password",
      })
      .overrideProvider(AuthRateLimitService)
      .useValue({ assertAllowed: () => undefined })
      .overrideProvider(ReservationsRepository)
      .useValue({
        expireStaleReviewWindows: async () => ({
          expiredDrafts: 0,
          expiredOffers: 0,
          expiredPreApprovals: 0,
          removedDraftStorageKeys: [],
        }),
        findVehicle: async () => ({
          id: "silver-executive",
          branchId: "demo-branch-cairo",
          minimumRentalDays: 2,
          driverPolicy: "OPTIONAL",
          dailyRate: { toNumber: () => 4500 },
          driverCharge: { toNumber: () => 700 },
        }),
        saveDraft: async (input: {
          vehicle: { id: string };
          pickupAt: Date;
          returnAt: Date;
          driverRequested: boolean;
          rentalDays: number;
        }) => ({
          id: "reservation-draft-e2e",
          reference: "RHL-2026-123456",
          status: "DRAFT",
          vehicleId: input.vehicle.id,
          pickupAt: input.pickupAt.toISOString(),
          returnAt: input.returnAt.toISOString(),
          driverRequested: input.driverRequested,
          estimatedTotalEgp: 4500 * input.rentalDays,
        }),
        findOwnedDraft: async (id: string, customerId: string) =>
          id === "reservation-draft-e2e" && customerId === authUser.id
            ? {
                id,
                reference: "RHL-2026-123456",
                driverRequested: false,
                customerCategorySnapshot: "EGYPTIAN",
                customerDetailsCompletedAt: new Date(),
                documentConsentAt: new Date(),
              }
            : null,
        findOwnedDocumentContext: async (id: string, customerId: string) =>
          id === "reservation-draft-e2e" && customerId === authUser.id
            ? {
                id,
                reference: "RHL-2026-123456",
                status: "DRAFT",
                driverRequested: false,
                customerCategorySnapshot: "EGYPTIAN",
                customerDetailsCompletedAt: new Date(),
                documentConsentAt: new Date(),
              }
            : null,
        findOwnedDraftReview: async (id: string, customerId: string) => {
          if (id !== "reservation-draft-e2e" || customerId !== authUser.id) return null;
          const pickupAt = new Date();
          pickupAt.setUTCDate(pickupAt.getUTCDate() + 2);
          const returnAt = new Date(pickupAt);
          returnAt.setUTCDate(returnAt.getUTCDate() + 3);
          return {
            id,
            reference: "RHL-2026-123456",
            status: "DRAFT",
            pickupAt,
            returnAt,
            driverRequested: false,
            estimatedTotal: { toNumber: () => 13_500 },
            customerNameSnapshot: "Rahal Customer",
            customerEmailSnapshot: "customer@example.com",
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
              nameAr: "سيدان تنفيذية فضية",
              nameEn: "Silver Executive Sedan",
              status: "AVAILABLE",
              active: true,
              archivedAt: null,
            },
            branch: {
              id: "demo-branch-cairo",
              nameAr: "فرع رحال القاهرة التجريبي",
              nameEn: "Rahal Cairo Demo Branch",
            },
          };
        },
        hasSubmissionConflict: async () => false,
        submitDraft: async (input: { draftId: string; customerId: string }) =>
          input.draftId === "reservation-draft-e2e" && input.customerId === authUser.id
            ? {
                kind: "SUBMITTED",
                data: {
                  id: input.draftId,
                  reference: "RHL-2026-123456",
                  status: "PENDING_REVIEW",
                  submittedAt: new Date("2026-07-19T18:00:00.000Z").toISOString(),
                },
              }
            : { kind: "NOT_FOUND" },
        findSalesQueue: async () => [salesReviewRecord()],
        findSalesReview: async (id: string) =>
          id === "reservation-draft-e2e" ? salesReviewRecord() : null,
        claimSalesReview: async (input: { reservationId: string; actorId: string }) => {
          if (input.reservationId !== "reservation-draft-e2e") return { kind: "NOT_FOUND" };
          if (input.actorId !== salesUser.id) return { kind: "ALREADY_ASSIGNED" };
          salesAssigned = true;
          return { kind: "CLAIMED" };
        },
        decideSalesReview: async (input: {
          reservationId: string;
          actorId: string;
          action: "REQUEST_INFORMATION" | "PRE_APPROVE" | "REJECT";
        }) =>
          input.reservationId === "reservation-draft-e2e" && input.actorId === salesUser.id
            ? {
                kind: "DECIDED",
                data: {
                  id: input.reservationId,
                  reference: "RHL-2026-123456",
                  status:
                    input.action === "REQUEST_INFORMATION"
                      ? "MORE_INFORMATION_REQUIRED"
                      : input.action === "PRE_APPROVE"
                        ? "PRE_APPROVED"
                        : "REJECTED",
                  decidedAt: "2026-07-19T20:00:00.000Z",
                  expiresAt: input.action === "PRE_APPROVE" ? "2026-07-21T20:00:00.000Z" : null,
                },
              }
            : { kind: "NOT_ASSIGNED" },
        createAlternativeOffer: async (input: { reservationId: string; actorId: string }) => {
          if (input.reservationId !== "reservation-draft-e2e") return { kind: "NOT_FOUND" };
          if (input.actorId !== salesUser.id) return { kind: "NOT_ASSIGNED" };
          alternativeOffered = true;
          alternativeResponded = false;
          return {
            kind: "OFFERED",
            data: {
              id: "alternative-e2e",
              reservationId: input.reservationId,
              reservationStatus: "ALTERNATIVE_OFFERED",
              expiresAt: "2026-08-03T12:00:00.000Z",
            },
          };
        },
        findCustomerRequests: async (customerId: string) =>
          customerId === authUser.id ? [customerRequestRecord()] : [],
        findCustomerRequest: async (id: string, customerId: string) =>
          id === "reservation-draft-e2e" && customerId === authUser.id
            ? customerRequestRecord()
            : null,
        respondToInformationRequest: async (input: {
          reservationId: string;
          customerId: string;
          message: string;
        }) => {
          if (input.reservationId !== "reservation-draft-e2e" || input.customerId !== authUser.id) {
            return { kind: "NOT_FOUND" };
          }
          if (customerResponded) return { kind: "INVALID_STATUS" };
          customerResponded = true;
          return {
            kind: "RESPONDED",
            data: {
              id: input.reservationId,
              reference: "RHL-2026-123456",
              status: "UNDER_REVIEW",
              respondedAt: "2026-07-19T20:05:00.000Z",
            },
          };
        },
        respondToAlternativeOffer: async (input: {
          reservationId: string;
          customerId: string;
          action: "ACCEPT" | "DECLINE";
        }) => {
          if (
            input.reservationId !== "reservation-draft-e2e" ||
            input.customerId !== authUser.id ||
            !alternativeOffered
          ) {
            return { kind: "NOT_FOUND" };
          }
          alternativeResponded = true;
          return {
            kind: "RESPONDED",
            data: {
              id: "alternative-e2e",
              reservationId: input.reservationId,
              offerStatus: input.action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
              reservationStatus: "UNDER_REVIEW",
              respondedAt: "2026-08-01T12:15:00.000Z",
            },
          };
        },
        saveCustomerDetails: async (input: {
          draftId: string;
          reference: string;
          fullName: string;
          email: string;
          phone: string;
          nationality: string;
          address: string;
          emergencyContactName: string;
          emergencyContactPhone: string;
        }) => ({
          draftId: input.draftId,
          reference: input.reference,
          fullName: input.fullName,
          emailMasked: "cu***@example.com",
          phoneMasked: "+20••••2222",
          nationality: input.nationality,
          address: input.address,
          emergencyContactName: input.emergencyContactName,
          emergencyContactPhoneMasked: "+20••••8888",
          completedAt: new Date().toISOString(),
        }),
        findConsentPolicies: async (locale: string) =>
          ["RENTAL_TERMS", "PRIVACY", "DOCUMENT_PROCESSING", "RESERVATION_PROCESS"].map(
            (policyKey) => ({
              policyKey,
              version: "DEV-2026-07-19",
              title: `${policyKey} ${locale}`,
              body: "Development-only policy summary.",
            }),
          ),
        saveConsents: async (input: {
          draftId: string;
          reference: string;
          policyVersion: string;
          marketingAccepted: boolean;
        }) => ({
          draftId: input.draftId,
          reference: input.reference,
          policyVersion: input.policyVersion,
          requiredAcceptedAt: new Date().toISOString(),
          marketingAccepted: input.marketingAccepted,
        }),
        findDocumentRequirementRules: async () => [
          {
            key: "egyptian-id-front",
            documentType: "NATIONAL_ID_FRONT",
            requiresSelfDrive: false,
            labelAr: "وجه بطاقة الرقم القومي",
            labelEn: "National ID front",
            allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
            maxSizeBytes: 8 * 1024 * 1024,
          },
        ],
        findActiveDocuments: async () => uploadedDocuments,
        replaceDocument: async (input: {
          type: "NATIONAL_ID_FRONT";
          storageKey: string;
          originalName: string;
          mimeType: string;
          sizeBytes: number;
        }) => {
          uploadedDocuments = [
            {
              id: "document-e2e",
              type: input.type,
              status: "UPLOADED",
              storageKey: input.storageKey,
              originalName: input.originalName,
              mimeType: input.mimeType,
              sizeBytes: input.sizeBytes,
              createdAt: new Date(),
            },
          ];
          return { documentId: "document-e2e", replacedStorageKeys: [] };
        },
        deleteOwnedDocument: async () => {
          const document = uploadedDocuments[0];
          uploadedDocuments = [];
          return document ?? null;
        },
      })
      .overrideProvider(PrivateDocumentStorage)
      .useValue({
        put: async () => "reservations/reservation-draft-e2e/private-document.png",
        remove: async () => undefined,
      })
      .overrideProvider(StaffRepository)
      .useValue({
        permissionAccess: async () => ({
          permissionOverrides: [],
          staffRole: { permissions: [{ permissionId: "e2e-permission" }] },
        }),
      })
      .compile();

    app = setupApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves health under the global API prefix", async () => {
    const response = await request(app.getHttpServer()).get("/api/health").expect(200);
    expect(response.body).toMatchObject({ status: "ok", service: "rahal-api" });
    expect(typeof response.body.timestamp).toBe("string");
  });

  it("lists typed vehicles from the repository boundary", async () => {
    const response = await request(app.getHttpServer()).get("/api/vehicles").expect(200);
    expect(response.body.meta).toMatchObject({ source: "database", total: 3 });
    expect(response.body.data[0]).toMatchObject({
      id: "silver-executive",
      nameAr: "سيدان تنفيذية فضية",
      nameEn: "Silver Executive Sedan",
      dailyRateEgp: 4500,
      status: "AVAILABLE",
    });
  });

  it("returns a structured 404 for a missing vehicle", async () => {
    const response = await request(app.getHttpServer()).get("/api/vehicles/missing").expect(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Vehicle 'missing' was not found.",
        statusCode: 404,
      },
    });
  });

  it("lists active pickup and return branches", async () => {
    const response = await request(app.getHttpServer()).get("/api/branches").expect(200);
    expect(response.body.meta).toMatchObject({ source: "database", total: 1 });
    expect(response.body.data[0]).toMatchObject({
      id: "demo-branch-cairo",
      nameEn: "Rahal Cairo Demo Branch",
      active: true,
    });
  });

  it("accepts an eight-character registration password and rejects seven characters", async () => {
    const registration = {
      fullNameEn: "Fictional Rahal Customer",
      email: "new-customer@example.com",
      phone: "+201001113333",
      preferredLocale: "en",
    };

    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ ...registration, password: "Seven77" })
      .expect(400);

    const accepted = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ ...registration, password: "Eight888" })
      .expect(201);

    expect(accepted.body.data.user).not.toHaveProperty("passwordHash");
    expect(accepted.headers["set-cookie"]?.[0]).toContain("rahal_session=");
  });

  it("creates an HTTP-only session without exposing secrets", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "correct-customer-password" })
      .expect(201);

    expect(login.body.data.user).toMatchObject({
      id: authUser.id,
      email: authUser.email,
      role: "CUSTOMER",
      emailVerified: true,
      phoneVerified: true,
    });
    expect(login.body.data.user).not.toHaveProperty("passwordHash");
    expect(login.body.data).not.toHaveProperty("token");
    expect(storedSessionHash).toMatch(/^[a-f0-9]{64}$/);

    const cookie = login.headers["set-cookie"]?.[0];
    expect(cookie).toContain("rahal_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/api");

    const sessionToken = cookie?.match(/rahal_session=([^;]+)/)?.[1];
    expect(sessionToken).toBeTruthy();
    expect(storedSessionHash).toBe(hashSessionToken(decodeURIComponent(sessionToken ?? "")));

    const current = await request(app.getHttpServer())
      .get("/api/auth/session")
      .set("Cookie", cookie ?? "")
      .expect(200);
    expect(current.body.data.user.id).toBe(authUser.id);
  });

  it("rejects invalid authentication payloads before the service", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "" })
      .expect(400);
    expect(response.body.error).toMatchObject({ code: "BAD_REQUEST", statusCode: 400 });
  });

  it("saves an authenticated reservation draft without confirming a booking", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "correct-customer-password" })
      .expect(201);
    const cookie = login.headers["set-cookie"]?.[0] ?? "";
    const pickup = new Date();
    pickup.setUTCDate(pickup.getUTCDate() + 2);
    const returnDate = new Date(pickup);
    returnDate.setUTCDate(returnDate.getUTCDate() + 3);

    const response = await request(app.getHttpServer())
      .post("/api/reservations/drafts")
      .set("Cookie", cookie)
      .send({
        vehicleId: "silver-executive",
        pickupDate: pickup.toISOString().slice(0, 10),
        returnDate: returnDate.toISOString().slice(0, 10),
        driverRequested: false,
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      reference: "RHL-2026-123456",
      status: "DRAFT",
      vehicleId: "silver-executive",
    });
    expect(response.body.data.status).not.toBe("CONFIRMED");
  });

  it("saves customer details only for the authenticated draft owner", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "correct-customer-password" })
      .expect(201);
    const cookie = login.headers["set-cookie"]?.[0] ?? "";

    const response = await request(app.getHttpServer())
      .post("/api/reservations/drafts/reservation-draft-e2e/customer-details")
      .set("Cookie", cookie)
      .send({
        customerCategory: "EGYPTIAN",
        nationality: "Egyptian",
        address: "Fictional Cairo address",
        emergencyContactName: "Emergency Contact",
        emergencyContactPhone: "+201009998888",
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      draftId: "reservation-draft-e2e",
      emailMasked: "cu***@example.com",
      phoneMasked: "+20••••2222",
    });
    expect(response.body.data).not.toHaveProperty("email");
    expect(response.body.data).not.toHaveProperty("phone");

    await request(app.getHttpServer())
      .post("/api/reservations/drafts/another-customer-draft/customer-details")
      .set("Cookie", cookie)
      .send({
        customerCategory: "EGYPTIAN",
        nationality: "Egyptian",
        address: "Fictional Cairo address",
        emergencyContactName: "Emergency Contact",
        emergencyContactPhone: "+201009998888",
      })
      .expect(404);
  });

  it("serves a versioned policy bundle and stores required consents separately from marketing", async () => {
    const bundle = await request(app.getHttpServer())
      .get("/api/reservations/consent-policies/en")
      .expect(200);
    expect(bundle.body.data).toMatchObject({
      version: "DEV-2026-07-19",
      developmentOnly: true,
    });
    expect(bundle.body.data.policies).toHaveLength(4);

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "correct-customer-password" })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post("/api/reservations/drafts/reservation-draft-e2e/consents")
      .set("Cookie", login.headers["set-cookie"]?.[0] ?? "")
      .send({
        policyVersion: "DEV-2026-07-19",
        termsAccepted: true,
        privacyAccepted: true,
        documentAccepted: true,
        operationalAccepted: true,
        marketingAccepted: false,
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      policyVersion: "DEV-2026-07-19",
      marketingAccepted: false,
    });
  });

  it("uploads a required document without exposing its private storage key", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "correct-customer-password" })
      .expect(201);
    documentCookie = login.headers["set-cookie"]?.[0] ?? "";
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const response = await request(app.getHttpServer())
      .post("/api/reservations/drafts/reservation-draft-e2e/documents/NATIONAL_ID_FRONT")
      .set("Cookie", documentCookie)
      .attach("file", png, { filename: "identity-front.png", contentType: "image/png" })
      .expect(201);

    expect(response.body.data).toMatchObject({ complete: true });
    expect(response.body.data.requirements[0].document).toMatchObject({
      originalName: "identity-front.png",
      status: "UPLOADED",
    });
    expect(JSON.stringify(response.body)).not.toContain("storageKey");
    expect(JSON.stringify(response.body)).not.toContain("private-document.png");
  });

  it("rejects a file whose bytes do not match its claimed document type", async () => {
    await request(app.getHttpServer())
      .post("/api/reservations/drafts/reservation-draft-e2e/documents/NATIONAL_ID_FRONT")
      .set("Cookie", documentCookie)
      .attach("file", Buffer.from("not an image"), {
        filename: "fake.png",
        contentType: "image/png",
      })
      .expect(400);
  });

  it("returns a masked final review and blocks development policy submission", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/reservations/drafts/reservation-draft-e2e/review")
      .set("Cookie", documentCookie)
      .expect(200);

    expect(response.body.data).toMatchObject({
      reference: "RHL-2026-123456",
      status: "DRAFT",
      canSubmit: false,
      blockers: expect.arrayContaining(["APPROVED_POLICY_REQUIRED"]),
      customer: {
        emailMasked: expect.stringContaining("***"),
        phoneMasked: expect.stringContaining("••••"),
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("Fictional Cairo address");
    expect(JSON.stringify(response.body)).not.toContain("private-document.png");
  });

  it("submits to pending review without ever confirming a booking", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/reservations/drafts/reservation-draft-e2e/submit")
      .set("Cookie", documentCookie)
      .expect(201);

    expect(response.body.data).toMatchObject({
      reference: "RHL-2026-123456",
      status: "PENDING_REVIEW",
    });
    expect(response.body.data.status).not.toBe("CONFIRMED");
  });

  it("rejects customer access to the sales review queue", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "correct-customer-password" })
      .expect(201);

    await request(app.getHttpServer())
      .get("/api/reservations/sales/queue")
      .set("Cookie", login.headers["set-cookie"]?.[0] ?? "")
      .expect(403);
  });

  it("returns only the signed-in customer's safe submitted request details", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "correct-customer-password" })
      .expect(201);
    const cookie = login.headers["set-cookie"]?.[0] ?? "";

    const queue = await request(app.getHttpServer())
      .get("/api/reservations/customer/requests")
      .set("Cookie", cookie)
      .expect(200);
    expect(queue.body.data[0]).toMatchObject({
      reference: "RHL-2026-123456",
      status: "MORE_INFORMATION_REQUIRED",
      needsResponse: true,
    });

    const detail = await request(app.getHttpServer())
      .get("/api/reservations/customer/requests/reservation-draft-e2e")
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.data.messages[0]).toMatchObject({
      sender: "RAHAL",
      body: "Please confirm the emergency contact relationship.",
    });
    expect(detail.body.data.documents[0]).toEqual({
      type: "NATIONAL_ID_FRONT",
      status: "UPLOADED",
    });
    expect(JSON.stringify(detail.body)).not.toContain("storageKey");
    expect(JSON.stringify(detail.body)).not.toContain("identityNumber");

    await request(app.getHttpServer())
      .get("/api/reservations/customer/requests/not-owned")
      .set("Cookie", cookie)
      .expect(404);
  });

  it("lets the customer answer a request for information without confirming a booking", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "correct-customer-password" })
      .expect(201);
    const cookie = login.headers["set-cookie"]?.[0] ?? "";

    await request(app.getHttpServer())
      .post("/api/reservations/customer/requests/reservation-draft-e2e/respond")
      .set("Cookie", cookie)
      .send({ message: "Too short" })
      .expect(400);

    const response = await request(app.getHttpServer())
      .post("/api/reservations/customer/requests/reservation-draft-e2e/respond")
      .set("Cookie", cookie)
      .send({ message: "The emergency contact is my brother." })
      .expect(201);
    expect(response.body.data).toMatchObject({
      reference: "RHL-2026-123456",
      status: "UNDER_REVIEW",
    });
    expect(response.body.data.status).not.toBe("CONFIRMED");
  });

  it("rejects sales access to customer-owned request routes", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: salesUser.email, password: "correct-customer-password" })
      .expect(201);

    await request(app.getHttpServer())
      .get("/api/reservations/customer/requests")
      .set("Cookie", login.headers["set-cookie"]?.[0] ?? "")
      .expect(403);
  });

  it("lets sales inspect masked requests and claim one without confirming it", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: salesUser.email, password: "correct-customer-password" })
      .expect(201);
    const cookie = login.headers["set-cookie"]?.[0] ?? "";

    const queue = await request(app.getHttpServer())
      .get("/api/reservations/sales/queue")
      .set("Cookie", cookie)
      .expect(200);
    expect(queue.body.data[0]).toMatchObject({
      reference: "RHL-2026-123456",
      status: "PENDING_REVIEW",
      assignedToCurrentUser: false,
    });

    const review = await request(app.getHttpServer())
      .get("/api/reservations/sales/reservation-draft-e2e")
      .set("Cookie", cookie)
      .expect(200);
    expect(review.body.data.customer).toMatchObject({
      emailMasked: expect.stringContaining("***"),
      phoneMasked: expect.stringContaining("••••"),
      addressMasked: expect.not.stringContaining("Fictional Cairo address"),
    });
    expect(JSON.stringify(review.body)).not.toContain("storageKey");

    const claimed = await request(app.getHttpServer())
      .post("/api/reservations/sales/reservation-draft-e2e/claim")
      .set("Cookie", cookie)
      .expect(201);
    expect(claimed.body.data).toMatchObject({
      status: "UNDER_REVIEW",
      assignedToCurrentUser: true,
    });
    expect(claimed.body.data.status).not.toBe("CONFIRMED");
  });

  it("lets the assigned reviewer offer an available alternative without booking it", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: salesUser.email, password: "correct-customer-password" })
      .expect(201);
    const pickup = new Date();
    pickup.setUTCDate(pickup.getUTCDate() + 3);
    const returnDate = new Date(pickup);
    returnDate.setUTCDate(returnDate.getUTCDate() + 3);

    const response = await request(app.getHttpServer())
      .post("/api/reservations/sales/reservation-draft-e2e/alternative-offers")
      .set("Cookie", login.headers["set-cookie"]?.[0] ?? "")
      .send({
        vehicleId: "graphite-suv",
        pickupDate: pickup.toISOString().slice(0, 10),
        returnDate: returnDate.toISOString().slice(0, 10),
        note: "We can offer the family SUV for these alternative dates.",
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      id: "alternative-e2e",
      reservationStatus: "ALTERNATIVE_OFFERED",
    });
    expect(response.body.data.reservationStatus).not.toBe("CONFIRMED");
  });

  it("lets the owning customer accept an alternative back into review without confirmation", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: authUser.email, password: "correct-customer-password" })
      .expect(201);
    const cookie = login.headers["set-cookie"]?.[0] ?? "";

    const detail = await request(app.getHttpServer())
      .get("/api/reservations/customer/requests/reservation-draft-e2e")
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.data.alternativeOffer).toMatchObject({
      id: "alternative-e2e",
      status: "PENDING",
      vehicle: { name: "Graphite Family SUV" },
      estimate: { currency: "EGP", total: 17_400 },
    });
    expect(detail.body.data.needsResponse).toBe(true);

    const response = await request(app.getHttpServer())
      .post("/api/reservations/customer/requests/reservation-draft-e2e/alternative-offer")
      .set("Cookie", cookie)
      .send({ action: "ACCEPT" })
      .expect(201);
    expect(response.body.data).toMatchObject({
      offerStatus: "ACCEPTED",
      reservationStatus: "UNDER_REVIEW",
    });
    expect(response.body.data.reservationStatus).not.toBe("CONFIRMED");
  });

  it("records a validated pre-approval without creating a confirmed booking", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ identifier: salesUser.email, password: "correct-customer-password" })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post("/api/reservations/sales/reservation-draft-e2e/decision")
      .set("Cookie", login.headers["set-cookie"]?.[0] ?? "")
      .send({
        action: "PRE_APPROVE",
        note: "Please attend the Rahal branch within the stated pre-approval window.",
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      reference: "RHL-2026-123456",
      status: "PRE_APPROVED",
      expiresAt: "2026-07-21T20:00:00.000Z",
    });
    expect(response.body.data.status).not.toBe("CONFIRMED");

    await request(app.getHttpServer())
      .post("/api/reservations/sales/reservation-draft-e2e/decision")
      .set("Cookie", login.headers["set-cookie"]?.[0] ?? "")
      .send({ action: "REJECT", note: "short" })
      .expect(400);
  });
});
