import { HttpException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthRateLimitService } from "./auth-rate-limit.service";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AuthRateLimitService", () => {
  it("limits repeated local development attempts within the same window", async () => {
    vi.stubEnv("REDIS_URL", "");
    const service = new AuthRateLimitService();

    await expect(service.assertAllowed("login:test", 2, 60_000)).resolves.toBeUndefined();
    await expect(service.assertAllowed("login:test", 2, 60_000)).resolves.toBeUndefined();
    await expect(service.assertAllowed("login:test", 2, 60_000)).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});
