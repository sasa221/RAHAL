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
import { ReservationsRepository } from "./reservations/reservations.repository";

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
          [authUser.email, authUser.phone].includes(identifier) ? authUser : null,
        createUser: async () => authUser,
        createSession: async (input: { refreshTokenHash: string; expiresAt: Date }) => {
          storedSessionHash = input.refreshTokenHash;
          return { id: "session-e2e", expiresAt: input.expiresAt };
        },
        findSession: async (refreshTokenHash: string) =>
          refreshTokenHash === storedSessionHash
            ? {
                id: "session-e2e",
                expiresAt: new Date(Date.now() + 60_000),
                user: authUser,
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
      .overrideProvider(ReservationsRepository)
      .useValue({
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
});
