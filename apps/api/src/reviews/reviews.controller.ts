import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  CustomerReview,
  CustomerReviewOverview,
  PublicReview,
  ReviewAdminOverview,
  ReviewModerationResult,
} from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { CreateReviewDto, ModerateReviewDto } from "./reviews.dto";
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get("public")
  async publicReviews(@Query("locale") locale?: string): Promise<ApiSuccess<PublicReview[]>> {
    return { data: await this.reviews.publicReviews(locale === "ar" ? "ar" : "en") };
  }

  @Get("customer/:reservationId")
  async customerOverview(
    @Req() request: Request,
    @Param("reservationId") reservationId: string,
  ): Promise<ApiSuccess<CustomerReviewOverview>> {
    return {
      data: await this.reviews.customerOverview(readAuthCookie(request), reservationId),
    };
  }

  @Post("customer/:reservationId")
  async create(
    @Req() request: Request,
    @Param("reservationId") reservationId: string,
    @Body() input: CreateReviewDto,
  ): Promise<ApiSuccess<CustomerReview>> {
    return { data: await this.reviews.create(readAuthCookie(request), reservationId, input) };
  }

  @Get("admin")
  async adminOverview(
    @Req() request: Request,
    @Query("locale") locale?: string,
  ): Promise<ApiSuccess<ReviewAdminOverview>> {
    return {
      data: await this.reviews.adminOverview(
        readAuthCookie(request),
        locale === "ar" ? "ar" : "en",
      ),
    };
  }

  @Post("admin/:reviewId/moderate")
  async moderate(
    @Req() request: Request,
    @Param("reviewId") reviewId: string,
    @Body() input: ModerateReviewDto,
  ): Promise<ApiSuccess<ReviewModerationResult>> {
    return {
      data: await this.reviews.moderate(readAuthCookie(request), reviewId, input),
    };
  }
}
