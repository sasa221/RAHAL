import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CustomerReview,
  CustomerReviewOverview,
  PublicReview,
  ReviewAdminOverview,
  ReviewModerationItem,
  ReviewModerationResult,
} from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import type { CreateReviewDto, ModerateReviewDto } from "./reviews.dto";
import { ReviewsRepository } from "./reviews.repository";

type Locale = "ar" | "en";

function nameFor(record: { fullNameAr: string | null; fullNameEn: string }, locale: Locale) {
  return locale === "ar" && record.fullNameAr ? record.fullNameAr : record.fullNameEn;
}

function vehicleName(record: { nameAr: string; nameEn: string }, locale: Locale) {
  return locale === "ar" ? record.nameAr : record.nameEn;
}

function safePublicName(name: string) {
  const [first = "Rahal", second] = name.trim().split(/\s+/);
  return second ? `${first} ${second[0]}.` : first;
}

function toCustomerReview(review: {
  id: string;
  reservationId: string;
  rating: number;
  comment: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  moderationNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CustomerReview {
  return {
    id: review.id,
    reservationId: review.reservationId,
    rating: review.rating,
    comment: review.comment ?? "",
    status: review.status,
    moderationNote: review.status === "REJECTED" ? review.moderationNote : null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly auth: AuthService,
    private readonly reviews: ReviewsRepository,
  ) {}

  async customerOverview(
    token: string | undefined,
    reservationId: string,
  ): Promise<CustomerReviewOverview> {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("A customer account is required.");
    }
    const record = await this.reviews.findCustomerReservation(reservationId, session.user.id);
    if (!record) throw new NotFoundException("The completed rental was not found.");
    const eligible = record.status === "COMPLETED" && Boolean(record.completedAt);
    return {
      eligible,
      reason: eligible ? null : "RENTAL_NOT_COMPLETED",
      reservation: {
        id: record.id,
        reference: record.reference,
        vehicleName: vehicleName(record.vehicle, session.user.preferredLocale),
        completedAt: record.completedAt?.toISOString() ?? null,
      },
      review: record.review ? toCustomerReview(record.review) : null,
    };
  }

  async create(
    token: string | undefined,
    reservationId: string,
    input: CreateReviewDto,
  ): Promise<CustomerReview> {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("A customer account is required.");
    }
    const reservation = await this.reviews.findCustomerReservation(reservationId, session.user.id);
    if (!reservation) throw new NotFoundException("The completed rental was not found.");
    if (reservation.review) {
      throw new ConflictException("This rental already has a review.");
    }
    if (reservation.status !== "COMPLETED" || !reservation.completedAt) {
      throw new ConflictException("A review can be submitted only after the rental is completed.");
    }
    const review = await this.reviews.create({
      reservationId,
      customerId: session.user.id,
      vehicleId: reservation.vehicleId,
      rating: input.rating,
      comment: input.comment.trim(),
    });
    if (!review) throw new ConflictException("This rental can no longer be reviewed.");
    return toCustomerReview(review);
  }

  async adminOverview(token: string | undefined, locale: Locale): Promise<ReviewAdminOverview> {
    const session = await this.auth.getSession(token);
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      throw new ForbiddenException("An administrator account is required.");
    }
    const result = await this.reviews.adminOverview();
    return {
      metrics: {
        ...result.metrics,
        averagePublishedRating:
          result.metrics.averagePublishedRating === null
            ? null
            : Number(result.metrics.averagePublishedRating.toFixed(1)),
      },
      reviews: result.reviews.map((review): ReviewModerationItem => ({
        id: review.id,
        reservationId: review.reservationId,
        reservationReference: review.reservation.reference,
        customerName: nameFor(review.customer, locale),
        vehicleName: vehicleName(review.vehicle, locale),
        rating: review.rating,
        comment: review.comment ?? "",
        status: review.status,
        moderationNote: review.moderationNote,
        createdAt: review.createdAt.toISOString(),
        moderatedAt: review.moderatedAt?.toISOString() ?? null,
        moderatorName: review.moderatedBy ? nameFor(review.moderatedBy, locale) : null,
      })),
    };
  }

  async moderate(
    token: string | undefined,
    reviewId: string,
    input: ModerateReviewDto,
  ): Promise<ReviewModerationResult> {
    const session = await this.auth.getSession(token);
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      throw new ForbiddenException("An administrator account is required.");
    }
    const note = input.note?.trim() || null;
    if (input.action === "REJECT" && !note) {
      throw new ConflictException("A rejection reason is required.");
    }
    const result = await this.reviews.moderate({
      reviewId,
      actorId: session.user.id,
      action: input.action,
      note,
    });
    if (!result) throw new ConflictException("This review has already been moderated.");
    return {
      id: result.id,
      status: result.status,
      moderatedAt: result.moderatedAt.toISOString(),
    };
  }

  async publicReviews(locale: Locale): Promise<PublicReview[]> {
    const reviews = await this.reviews.publicReviews(24);
    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment ?? "",
      customerName: safePublicName(nameFor(review.customer, locale)),
      vehicleName: vehicleName(review.vehicle, locale),
      publishedAt: review.approvedAt!.toISOString(),
    }));
  }
}
