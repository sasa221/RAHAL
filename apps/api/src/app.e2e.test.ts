import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "./app.module";
import { BranchesRepository } from "./branches/branches.repository";
import { setupApp } from "./setup-app";
import { VehiclesRepository } from "./vehicles/vehicles.repository";

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
});
