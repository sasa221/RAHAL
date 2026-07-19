import { Body, Controller, Post, Req } from "@nestjs/common";
import type { ApiSuccess, ReservationDraft } from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { SaveReservationDraftDto } from "./reservations.dto";
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
}
