import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const reviewSelect = {
  id: true,
  reservationId: true,
  rating: true,
  comment: true,
  status: true,
  moderationNote: true,
  moderatedAt: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  reservation: { select: { reference: true, completedAt: true } },
  vehicle: { select: { nameAr: true, nameEn: true } },
  customer: { select: { fullNameAr: true, fullNameEn: true } },
  moderatedBy: { select: { fullNameAr: true, fullNameEn: true } },
} as const;

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCustomerReservation(reservationId: string, customerId: string) {
    return this.prisma.client.reservation.findFirst({
      where: { id: reservationId, customerId },
      select: {
        id: true,
        reference: true,
        status: true,
        completedAt: true,
        vehicleId: true,
        vehicle: { select: { nameAr: true, nameEn: true } },
        review: { select: reviewSelect },
      },
    });
  }

  create(input: {
    reservationId: string;
    customerId: string;
    vehicleId: string;
    rating: number;
    comment: string;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: {
          id: input.reservationId,
          customerId: input.customerId,
          status: "COMPLETED",
          completedAt: { not: null },
          review: null,
        },
        select: { id: true },
      });
      if (!reservation) return null;
      const review = await transaction.review.create({
        data: input,
        select: reviewSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.customerId,
          action: "REVIEW_SUBMITTED",
          entityType: "REVIEW",
          entityId: review.id,
          newData: { rating: input.rating, status: "PENDING" },
        },
      });
      return review;
    });
  }

  async adminOverview() {
    const [
      reviews,
      pendingReviews,
      approvedReviews,
      rejectedReviews,
      rating,
      pendingReservationRequests,
      activeRentals,
      fleetSize,
    ] = await Promise.all([
      this.prisma.client.review.findMany({
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 150,
        select: reviewSelect,
      }),
      this.prisma.client.review.count({ where: { status: "PENDING" } }),
      this.prisma.client.review.count({ where: { status: "APPROVED" } }),
      this.prisma.client.review.count({ where: { status: "REJECTED" } }),
      this.prisma.client.review.aggregate({
        where: { status: "APPROVED" },
        _avg: { rating: true },
      }),
      this.prisma.client.reservation.count({
        where: {
          status: {
            in: [
              "PENDING_REVIEW",
              "UNDER_REVIEW",
              "MORE_INFORMATION_REQUIRED",
              "PRE_APPROVED",
              "ALTERNATIVE_OFFERED",
            ],
          },
        },
      }),
      this.prisma.client.booking.count({ where: { status: "ACTIVE" } }),
      this.prisma.client.vehicle.count({ where: { active: true, archivedAt: null } }),
    ]);
    return {
      reviews,
      metrics: {
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        averagePublishedRating: rating._avg.rating,
        pendingReservationRequests,
        activeRentals,
        fleetSize,
      },
    };
  }

  moderate(input: {
    reviewId: string;
    actorId: string;
    action: "APPROVE" | "REJECT";
    note: string | null;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const current = await transaction.review.findFirst({
        where: { id: input.reviewId, status: "PENDING" },
        select: { id: true, rating: true, status: true },
      });
      if (!current) return null;
      const moderatedAt = new Date();
      const status = input.action === "APPROVE" ? ("APPROVED" as const) : ("REJECTED" as const);
      const updated = await transaction.review.updateMany({
        where: { id: input.reviewId, status: "PENDING" },
        data: {
          status,
          moderationNote: input.note,
          moderatedAt,
          moderatedById: input.actorId,
          approvedAt: status === "APPROVED" ? moderatedAt : null,
        },
      });
      if (!updated.count) return null;
      await transaction.auditLog.create({
        data: {
          actorId: input.actorId,
          action: `REVIEW_${status}`,
          entityType: "REVIEW",
          entityId: input.reviewId,
          reason: input.note,
          previousData: { status: current.status, rating: current.rating },
          newData: { status },
        },
      });
      return { id: input.reviewId, status, moderatedAt };
    });
  }

  publicReviews(limit: number) {
    return this.prisma.client.review.findMany({
      where: { status: "APPROVED", approvedAt: { not: null }, comment: { not: null } },
      orderBy: { approvedAt: "desc" },
      take: limit,
      select: reviewSelect,
    });
  }
}
