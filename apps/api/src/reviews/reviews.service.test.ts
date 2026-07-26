import { ConflictException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ReviewsService } from "./reviews.service";

const completedReservation = {
  id: "reservation-1",
  reference: "RHL-2026-900001",
  status: "COMPLETED" as const,
  completedAt: new Date("2026-07-20T12:00:00.000Z"),
  vehicleId: "vehicle-1",
  vehicle: { nameAr: "سيدان تنفيذية", nameEn: "Executive Sedan" },
  review: null,
};

const reviewRecord = {
  id: "review-1",
  reservationId: "reservation-1",
  rating: 5,
  comment: "A polished branch experience from pickup through return.",
  status: "PENDING" as const,
  moderationNote: null,
  approvedAt: null,
  moderatedAt: null,
  createdAt: new Date("2026-07-21T10:00:00.000Z"),
  updatedAt: new Date("2026-07-21T10:00:00.000Z"),
  reservation: {
    reference: "RHL-2026-900001",
    completedAt: new Date("2026-07-20T12:00:00.000Z"),
  },
  vehicle: { nameAr: "سيدان تنفيذية", nameEn: "Executive Sedan" },
  customer: { fullNameAr: "أحمد محمد حسن", fullNameEn: "Ahmed Mohamed Hassan" },
  moderatedBy: null,
};

function setup(role: "CUSTOMER" | "ADMIN" | "SALES" = "CUSTOMER") {
  const auth = {
    getSession: vi.fn().mockResolvedValue({
      user: { id: "customer-1", role, preferredLocale: "en" },
    }),
  };
  const repository = {
    findCustomerReservation: vi.fn().mockResolvedValue(completedReservation),
    create: vi.fn().mockResolvedValue(reviewRecord),
    adminOverview: vi.fn().mockResolvedValue({
      reviews: [reviewRecord],
      metrics: {
        pendingReviews: 1,
        approvedReviews: 0,
        rejectedReviews: 0,
        averagePublishedRating: null,
        pendingReservationRequests: 2,
        activeRentals: 1,
        fleetSize: 5,
      },
    }),
    moderate: vi.fn().mockResolvedValue({
      id: "review-1",
      status: "APPROVED",
      moderatedAt: new Date("2026-07-22T10:00:00.000Z"),
    }),
    publicReviews: vi.fn().mockResolvedValue([
      {
        ...reviewRecord,
        status: "APPROVED",
        approvedAt: new Date("2026-07-22T10:00:00.000Z"),
      },
    ]),
  };
  return {
    repository,
    service: new ReviewsService(auth as never, repository as never),
  };
}

describe("ReviewsService", () => {
  it("allows the owning customer to review only a completed rental", async () => {
    const { service, repository } = setup();
    await expect(
      service.create("session", "reservation-1", {
        rating: 5,
        comment: "A polished branch experience from pickup through return.",
      }),
    ).resolves.toMatchObject({ status: "PENDING", rating: 5 });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "customer-1",
        reservationId: "reservation-1",
        vehicleId: "vehicle-1",
      }),
    );
  });

  it("rejects a second review for the same rental", async () => {
    const { service, repository } = setup();
    repository.findCustomerReservation.mockResolvedValue({
      ...completedReservation,
      review: reviewRecord,
    });
    await expect(
      service.create("session", "reservation-1", {
        rating: 4,
        comment: "The completed rental already has customer feedback.",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("does not allow reviews before rental completion", async () => {
    const { service, repository } = setup();
    repository.findCustomerReservation.mockResolvedValue({
      ...completedReservation,
      status: "ACTIVE",
      completedAt: null,
    });
    await expect(
      service.create("session", "reservation-1", {
        rating: 4,
        comment: "This rental has not been completed at the branch.",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("requires an administrator for the moderation center", async () => {
    const { service } = setup("SALES");
    await expect(service.adminOverview("session", "en")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires a reason when an administrator rejects a review", async () => {
    const { service, repository } = setup("ADMIN");
    await expect(
      service.moderate("session", "review-1", { action: "REJECT" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.moderate).not.toHaveBeenCalled();
  });

  it("publishes only privacy-safe customer names", async () => {
    const { service } = setup();
    await expect(service.publicReviews("en")).resolves.toEqual([
      expect.objectContaining({
        customerName: "Ahmed M.",
        vehicleName: "Executive Sedan",
      }),
    ]);
  });
});
