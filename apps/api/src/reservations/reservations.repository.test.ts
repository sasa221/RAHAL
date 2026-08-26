import { describe, expect, it, vi } from "vitest";
import { ReservationsRepository } from "./reservations.repository";

describe("reservation submission repository", () => {
  it("rejects an Egyptian customer before accepting the non-Egyptian declaration", async () => {
    const transaction = {
      reservation: {
        findFirst: vi.fn().mockResolvedValue({
          id: "draft-1",
          reference: "RHL-2026-123456",
          status: "DRAFT",
          submittedAt: null,
          vehicleId: "silver-executive",
          pickupAt: new Date(Date.now() + 172_800_000),
          returnAt: new Date(Date.now() + 432_000_000),
          driverRequested: false,
          customerDetailsCompletedAt: new Date(),
          customerCategorySnapshot: "EGYPTIAN",
          termsVersion: "DEV-2026-07-19",
          termsAcceptedAt: new Date(),
          privacyConsentAt: new Date(),
          documentConsentAt: new Date(),
          operationalConsentAt: new Date(),
          nonEgyptianAcknowledgedAt: null,
          customer: { emailVerifiedAt: new Date() },
          vehicle: { active: true, archivedAt: null, status: "AVAILABLE" },
        }),
      },
    };
    const prisma = {
      client: {
        $transaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
      },
    };
    const repository = new ReservationsRepository(prisma as never);

    await expect(
      repository.submitDraft({
        draftId: "draft-1",
        customerId: "customer-1",
        locale: "en",
        nonEgyptianAcknowledged: true,
      }),
    ).resolves.toEqual({ kind: "EGYPTIAN_CUSTOMER_NOT_ELIGIBLE" });
  });
});
