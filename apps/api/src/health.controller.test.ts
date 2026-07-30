import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  beforeEach(() => {
    for (const name of [
      "PRIVATE_DOCUMENT_STORAGE_PATH",
      "PRIVATE_S3_REGION",
      "PRIVATE_S3_BUCKET",
      "PRIVATE_S3_ACCESS_KEY_ID",
      "PRIVATE_S3_SECRET_ACCESS_KEY",
    ]) {
      vi.stubEnv(name, "");
    }
  });
  afterEach(() => vi.unstubAllEnvs());

  it("separates liveness from database readiness", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ value: 1 }]);
    const controller = new HealthController({
      client: { $queryRaw: queryRaw },
    } as never);

    expect(controller.live()).toMatchObject({ status: "alive", service: "rahal-api" });
    await expect(controller.ready()).resolves.toMatchObject({
      status: "degraded",
      service: "rahal-api",
      dependencies: { database: "ready", rateLimit: "ready", privateStorage: "unconfigured" },
    });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("fails readiness without leaking the database error", async () => {
    const controller = new HealthController({
      client: {
        $queryRaw: vi.fn().mockRejectedValue(new Error("database credentials were rejected")),
      },
    } as never);

    await expect(controller.ready()).rejects.toEqual(
      new ServiceUnavailableException("Dependency readiness check failed."),
    );
  });

  it("checks shared throttling and private storage when providers are available", async () => {
    vi.stubEnv("PRIVATE_DOCUMENT_STORAGE_PATH", ".private-storage");
    const rateReadiness = vi.fn();
    const storageReadiness = vi.fn();
    const controller = new HealthController(
      { client: { $queryRaw: vi.fn() } } as never,
      { readiness: rateReadiness } as never,
      { configured: () => true, readiness: storageReadiness } as never,
    );

    await expect(controller.ready()).resolves.toMatchObject({ status: "ready" });
    expect(rateReadiness).toHaveBeenCalledOnce();
    expect(storageReadiness).toHaveBeenCalledOnce();
  });
});
