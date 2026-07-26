import { Body, Controller, Delete, Get, Param, Post, Query, Req } from "@nestjs/common";
import type { ApiSuccess, FleetBlockResult, FleetCalendar } from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { CreateFleetBlockDto, FleetCalendarQueryDto } from "./fleet.dto";
import { FleetService } from "./fleet.service";

@Controller("fleet")
export class FleetController {
  constructor(private readonly fleet: FleetService) {}

  @Get("calendar")
  async calendar(
    @Query() query: FleetCalendarQueryDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<FleetCalendar>> {
    return { data: await this.fleet.calendar(readAuthCookie(request), query) };
  }

  @Post("blocks")
  async createBlock(
    @Body() input: CreateFleetBlockDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<FleetBlockResult>> {
    return { data: await this.fleet.createBlock(readAuthCookie(request), input) };
  }

  @Delete("blocks/:id")
  async removeBlock(
    @Param("id") id: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<FleetBlockResult>> {
    return { data: await this.fleet.removeBlock(readAuthCookie(request), id) };
  }
}
