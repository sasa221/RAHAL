import { ReservationExpiryService } from "./reservation-expiry.service";

describe("reservation expiry worker", () => {
  it("sweeps stale alternatives and pre-approvals using one repository boundary", async () => {
    const now = new Date("2026-07-19T21:30:00.000Z");
    const expireStaleReviewWindows = vi
      .fn()
      .mockResolvedValue({ expiredOffers: 2, expiredPreApprovals: 1 });
    const service = new ReservationExpiryService({ expireStaleReviewWindows } as never);

    await expect(service.sweepExpiredReviewWindows(now)).resolves.toEqual({
      expiredOffers: 2,
      expiredPreApprovals: 1,
    });
    expect(expireStaleReviewWindows).toHaveBeenCalledWith(now);
  });

  it("does not overlap sweeps when the previous pass is still running", async () => {
    let release:
      ((value: { expiredOffers: number; expiredPreApprovals: number }) => void) | undefined;
    const expireStaleReviewWindows = vi.fn().mockImplementation(
      () =>
        new Promise<{ expiredOffers: number; expiredPreApprovals: number }>((resolve) => {
          release = resolve;
        }),
    );
    const service = new ReservationExpiryService({ expireStaleReviewWindows } as never);

    const first = service.sweepExpiredReviewWindows();
    await expect(service.sweepExpiredReviewWindows()).resolves.toEqual({
      expiredOffers: 0,
      expiredPreApprovals: 0,
    });
    expect(expireStaleReviewWindows).toHaveBeenCalledTimes(1);
    release?.({ expiredOffers: 0, expiredPreApprovals: 0 });
    await expect(first).resolves.toEqual({ expiredOffers: 0, expiredPreApprovals: 0 });
  });
});
