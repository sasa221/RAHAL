import { ReservationExpiryService } from "./reservation-expiry.service";

describe("reservation expiry worker", () => {
  it("sweeps stale drafts, alternatives, and pre-approvals using one repository boundary", async () => {
    const now = new Date("2026-07-19T21:30:00.000Z");
    const expireStaleReviewWindows = vi.fn().mockResolvedValue({
      expiredDrafts: 3,
      expiredOffers: 2,
      expiredPreApprovals: 1,
      removedDraftStorageKeys: ["reservations/draft-1/document.pdf"],
    });
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = new ReservationExpiryService(
      { expireStaleReviewWindows } as never,
      { remove } as never,
    );

    await expect(service.sweepExpiredReviewWindows(now)).resolves.toEqual({
      expiredDrafts: 3,
      expiredOffers: 2,
      expiredPreApprovals: 1,
    });
    expect(expireStaleReviewWindows).toHaveBeenCalledWith(now);
    expect(remove).toHaveBeenCalledWith("reservations/draft-1/document.pdf");
  });

  it("does not overlap sweeps when the previous pass is still running", async () => {
    let release:
      | ((value: {
          expiredDrafts: number;
          expiredOffers: number;
          expiredPreApprovals: number;
          removedDraftStorageKeys: string[];
        }) => void)
      | undefined;
    const expireStaleReviewWindows = vi.fn().mockImplementation(
      () =>
        new Promise<{
          expiredDrafts: number;
          expiredOffers: number;
          expiredPreApprovals: number;
          removedDraftStorageKeys: string[];
        }>((resolve) => {
          release = resolve;
        }),
    );
    const service = new ReservationExpiryService({ expireStaleReviewWindows } as never);

    const first = service.sweepExpiredReviewWindows();
    await expect(service.sweepExpiredReviewWindows()).resolves.toEqual({
      expiredDrafts: 0,
      expiredOffers: 0,
      expiredPreApprovals: 0,
    });
    expect(expireStaleReviewWindows).toHaveBeenCalledTimes(1);
    release?.({
      expiredDrafts: 0,
      expiredOffers: 0,
      expiredPreApprovals: 0,
      removedDraftStorageKeys: [],
    });
    await expect(first).resolves.toEqual({
      expiredDrafts: 0,
      expiredOffers: 0,
      expiredPreApprovals: 0,
    });
  });
});
