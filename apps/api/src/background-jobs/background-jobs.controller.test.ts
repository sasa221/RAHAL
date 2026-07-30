import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { BackgroundJobsController } from "./background-jobs.controller";

describe("BackgroundJobsController", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed when a scheduled-job secret is not configured", async () => {
    const controller = new BackgroundJobsController({ runScheduledBatch: vi.fn() } as never);

    await expect(controller.run()).rejects.toEqual(
      new ServiceUnavailableException("Scheduled jobs are not configured."),
    );
  });

  it("requires the bearer secret and returns only bounded job summaries", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret-with-at-least-32-characters");
    const runScheduledBatch = vi.fn().mockResolvedValue({
      expiry: { expiredDrafts: 1, expiredOffers: 2, expiredPreApprovals: 0 },
      outbox: { processed: 4 },
    });
    const controller = new BackgroundJobsController({ runScheduledBatch } as never);

    await expect(controller.run("Bearer wrong")).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      controller.run("Bearer test-cron-secret-with-at-least-32-characters"),
    ).resolves.toMatchObject({
      status: "completed",
      outbox: { processed: 4 },
      expiry: { expiredDrafts: 1 },
    });
    expect(runScheduledBatch).toHaveBeenCalledOnce();
  });
});
