import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "./app.module";
import { setupApp } from "./setup-app";

describe("RAHAL API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = setupApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves health under the global API prefix", async () => {
    const response = await request(app.getHttpServer()).get("/api/health").expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      service: "rahal-api",
    });
    expect(typeof response.body.timestamp).toBe("string");
  });

  it("lists typed demo vehicles", async () => {
    const response = await request(app.getHttpServer()).get("/api/vehicles").expect(200);

    expect(response.body.meta).toMatchObject({ demo: true, total: 3 });
    expect(response.body.data[0]).toMatchObject({
      id: "demo-mercedes-c",
      nameAr: "مرسيدس C-Class",
      nameEn: "Mercedes-Benz C-Class",
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
});
