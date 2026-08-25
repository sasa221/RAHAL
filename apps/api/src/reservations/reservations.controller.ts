import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type {
  ApiSuccess,
  CustomerInformationResponse,
  CustomerAlternativeOfferResponse,
  CustomerReservationDraftAbandonResult,
  CustomerReservationDraftDetail,
  CustomerReservationDraftSummary,
  CustomerReservationDetail,
  CustomerReservationSummary,
  ReservationConsentBundle,
  ReservationConsents,
  ReservationCustomerDetails,
  ReservationDocumentChecklist,
  ReservationReview,
  SalesReservationDecisionResult,
  SalesBranchChecklistResult,
  SalesBookingConfirmationResult,
  SalesBookingOperationResult,
  SalesDocumentReviewResult,
  SalesAlternativeOfferResult,
  SalesReservationQueueItem,
  SalesReservationReview,
  SalesSignedContractResult,
  SubmittedReservation,
  ReservationDraft,
} from "@rahal/contracts";
import type { Request, Response } from "express";
import { createHmac } from "node:crypto";
import { readAuthCookie } from "../auth/auth-cookie";
import { loadApiConfig } from "../config";
import {
  CustomerAlternativeOfferDecisionDto,
  CustomerInformationResponseDto,
  SaveReservationConsentsDto,
  SubmitReservationDto,
  SaveReservationCustomerDetailsDto,
  SaveReservationDraftDto,
  SalesReservationDecisionDto,
  SalesAlternativeOfferDto,
  SalesBranchChecklistDto,
  SalesBookingOperationDto,
  SalesDocumentAccessDto,
  SalesDocumentReviewDto,
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
    @Body() input: SubmitReservationDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<SubmittedReservation>> {
    return {
      data: await this.reservations.submitReservation(
        readAuthCookie(request),
        id,
        input.nonEgyptianAcknowledged,
      ),
    };
  }

  @Get("sales/queue")
  async salesQueue(
    @Query("locale") locale: string | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesReservationQueueItem[]>> {
    return { data: await this.reservations.getSalesQueue(readAuthCookie(request), locale) };
  }

  @Get("sales/:id")
  async salesReview(
    @Param("id") id: string,
    @Query("locale") locale: string | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesReservationReview>> {
    return { data: await this.reservations.getSalesReview(readAuthCookie(request), id, locale) };
  }

  @Post("sales/:id/claim")
  async claimForSalesReview(
    @Param("id") id: string,
    @Query("locale") locale: string | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesReservationReview>> {
    return { data: await this.reservations.claimSalesReview(readAuthCookie(request), id, locale) };
  }

  @Post("sales/:id/documents/:documentId/access")
  async accessSalesDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @Body() input: SalesDocumentAccessDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const document = await this.reservations.accessSalesDocument(
      readAuthCookie(request),
      id,
      documentId,
      input,
      hashRequestIp(request),
    );
    response.set({
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "inline; filename=rahal-protected-document",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    });
    return new StreamableFile(document.bytes, { type: document.mimeType });
  }

  @Post("sales/:id/documents/:documentId/review")
  async reviewSalesDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @Body() input: SalesDocumentReviewDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesDocumentReviewResult>> {
    return {
      data: await this.reservations.reviewSalesDocument(
        readAuthCookie(request),
        id,
        documentId,
        input,
        hashRequestIp(request),
      ),
    };
  }

  @Post("sales/:id/signed-contract/access")
  async accessSignedContract(
    @Param("id") id: string,
    @Body() input: SalesDocumentAccessDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const contract = await this.reservations.accessSignedContract(
      readAuthCookie(request),
      id,
      input,
      hashRequestIp(request),
    );
    response.set({
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "inline; filename=rahal-signed-contract.pdf",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    });
    return new StreamableFile(contract.bytes, { type: "application/pdf" });
  }

  @Post("sales/:id/decision")
  async decideSalesReview(
    @Param("id") id: string,
    @Body() input: SalesReservationDecisionDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesReservationDecisionResult>> {
    return {
      data: await this.reservations.decideSalesReview(readAuthCookie(request), id, input),
    };
  }

  @Post("sales/:id/alternative-offers")
  async createAlternativeOffer(
    @Param("id") id: string,
    @Body() input: SalesAlternativeOfferDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesAlternativeOfferResult>> {
    return {
      data: await this.reservations.createAlternativeOffer(readAuthCookie(request), id, input),
    };
  }

  @Post("sales/:id/branch-checklist")
  async recordBranchChecklist(
    @Param("id") id: string,
    @Body() input: SalesBranchChecklistDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesBranchChecklistResult>> {
    return {
      data: await this.reservations.recordBranchChecklist(readAuthCookie(request), id, input),
    };
  }

  @Post("sales/:id/signed-contract")
  @UseInterceptors(FileInterceptor("file", { limits: { files: 1, fileSize: 10 * 1024 * 1024 } }))
  async uploadSignedContract(
    @Param("id") id: string,
    @UploadedFile()
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesSignedContractResult>> {
    return {
      data: await this.reservations.uploadSignedContract(readAuthCookie(request), id, file),
    };
  }

  @Post("sales/:id/confirm")
  async confirmBooking(
    @Param("id") id: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesBookingConfirmationResult>> {
    return {
      data: await this.reservations.confirmBooking(readAuthCookie(request), id),
    };
  }

  @Post("sales/:id/operations")
  async recordBookingOperation(
    @Param("id") id: string,
    @Body() input: SalesBookingOperationDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<SalesBookingOperationResult>> {
    return {
      data: await this.reservations.recordBookingOperation(readAuthCookie(request), id, input),
    };
  }

  @Get("customer/requests")
  async customerRequests(
    @Query("locale") locale: string | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<CustomerReservationSummary[]>> {
    return { data: await this.reservations.getCustomerRequests(readAuthCookie(request), locale) };
  }

  @Get("customer/drafts")
  async customerDrafts(
    @Query("locale") locale: string | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<CustomerReservationDraftSummary[]>> {
    return { data: await this.reservations.getCustomerDrafts(readAuthCookie(request), locale) };
  }

  @Get("customer/drafts/:id")
  async customerDraft(
    @Param("id") id: string,
    @Query("locale") locale: string | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<CustomerReservationDraftDetail>> {
    return { data: await this.reservations.getCustomerDraft(readAuthCookie(request), id, locale) };
  }

  @Delete("customer/drafts/:id")
  async abandonCustomerDraft(
    @Param("id") id: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<CustomerReservationDraftAbandonResult>> {
    return { data: await this.reservations.abandonCustomerDraft(readAuthCookie(request), id) };
  }

  @Get("customer/requests/:id")
  async customerRequest(
    @Param("id") id: string,
    @Query("locale") locale: string | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<CustomerReservationDetail>> {
    return {
      data: await this.reservations.getCustomerRequest(readAuthCookie(request), id, locale),
    };
  }

  @Post("customer/requests/:id/respond")
  async respondToInformationRequest(
    @Param("id") id: string,
    @Body() input: CustomerInformationResponseDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<CustomerInformationResponse>> {
    return {
      data: await this.reservations.respondToInformationRequest(readAuthCookie(request), id, input),
    };
  }

  @Post("customer/requests/:id/alternative-offer")
  async respondToAlternativeOffer(
    @Param("id") id: string,
    @Body() input: CustomerAlternativeOfferDecisionDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<CustomerAlternativeOfferResponse>> {
    return {
      data: await this.reservations.respondToAlternativeOffer(readAuthCookie(request), id, input),
    };
  }
}

function hashRequestIp(request: Request) {
  const address = request.ip || request.socket.remoteAddress || "unknown";
  return createHmac("sha256", loadApiConfig().authSecret).update(address).digest("hex");
}
