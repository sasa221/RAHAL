import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type {
  ApiSuccess,
  ReservationConsentBundle,
  ReservationConsents,
  ReservationCustomerDetails,
  ReservationDocumentChecklist,
  ReservationReview,
  SalesReservationQueueItem,
  SalesReservationReview,
  SubmittedReservation,
  ReservationDraft,
} from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import {
  SaveReservationConsentsDto,
  SaveReservationCustomerDetailsDto,
  SaveReservationDraftDto,
} from "./reservations.dto";
import { ReservationsService } from "./reservations.service";

@Controller("reservations")
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post("drafts")
  async saveDraft(
    @Body() input: SaveReservationDraftDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ReservationDraft>> {
    return { data: await this.reservations.saveDraft(readAuthCookie(request), input) };
  }

  @Post("drafts/:id/customer-details")
  async saveCustomerDetails(
    @Param("id") id: string,
    @Body() input: SaveReservationCustomerDetailsDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ReservationCustomerDetails>> {
    return {
      data: await this.reservations.saveCustomerDetails(readAuthCookie(request), id, input),
    };
  }

  @Get("consent-policies/:locale")
  async consentPolicies(
    @Param("locale") locale: string,
  ): Promise<ApiSuccess<ReservationConsentBundle>> {
    return { data: await this.reservations.getConsentBundle(locale) };
  }

  @Post("drafts/:id/consents")
  async saveConsents(
    @Param("id") id: string,
    @Body() input: SaveReservationConsentsDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ReservationConsents>> {
    return { data: await this.reservations.saveConsents(readAuthCookie(request), id, input) };
  }

  @Get("drafts/:id/documents")
  async documentChecklist(
    @Param("id") id: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<ReservationDocumentChecklist>> {
    return { data: await this.reservations.getDocumentChecklist(readAuthCookie(request), id) };
  }

  @Post("drafts/:id/documents/:type")
  @UseInterceptors(FileInterceptor("file", { limits: { files: 1, fileSize: 8 * 1024 * 1024 } }))
  async uploadDocument(
    @Param("id") id: string,
    @Param("type") type: string,
    @UploadedFile()
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<ReservationDocumentChecklist>> {
    return {
      data: await this.reservations.uploadDocument(readAuthCookie(request), id, type, file),
    };
  }

  @Delete("drafts/:id/documents/:documentId")
  async deleteDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<ReservationDocumentChecklist>> {
    return {
      data: await this.reservations.deleteDocument(readAuthCookie(request), id, documentId),
    };
  }

  @Get("drafts/:id/review")
  async reviewDraft(
    @Param("id") id: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<ReservationReview>> {
    return { data: await this.reservations.getReview(readAuthCookie(request), id) };
  }

  @Post("drafts/:id/submit")
  async submitDraft(
    @Param("id") id: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<SubmittedReservation>> {
    return { data: await this.reservations.submitReservation(readAuthCookie(request), id) };
  }

  @Get("sales/queue")
  async salesQueue(@Req() request: Request): Promise<ApiSuccess<SalesReservationQueueItem[]>> {
    return { data: await this.reservations.getSalesQueue(readAuthCookie(request)) };
  }

  @Get("sales/:id")
  async salesReview(
    @Param("id") id: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesReservationReview>> {
    return { data: await this.reservations.getSalesReview(readAuthCookie(request), id) };
  }

  @Post("sales/:id/claim")
  async claimForSalesReview(
    @Param("id") id: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesReservationReview>> {
    return { data: await this.reservations.claimSalesReview(readAuthCookie(request), id) };
  }
}
