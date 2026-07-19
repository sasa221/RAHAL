import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  ReservationConsentBundle,
  ReservationConsents,
  ReservationCustomerDetails,
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
}
