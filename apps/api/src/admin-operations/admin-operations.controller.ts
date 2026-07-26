import { Controller, Get, Query, Req } from "@nestjs/common";
import type { AdminAuditPage, AdminOperationsOverview, ApiSuccess } from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { AdminOperationsService } from "./admin-operations.service";

@Controller("admin-operations")
export class AdminOperationsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get("overview")
  async overview(
    @Req() request: Request,
    @Query("locale") locale?: string,
  ): Promise<ApiSuccess<AdminOperationsOverview>> {
    return {
      data: await this.operations.overview(readAuthCookie(request), locale === "ar" ? "ar" : "en"),
    };
  }

  @Get("audit")
  async audit(
    @Req() request: Request,
    @Query() query: Record<string, string | undefined>,
  ): Promise<ApiSuccess<AdminAuditPage>> {
    return {
      data: await this.operations.audit(
        readAuthCookie(request),
        query.locale === "ar" ? "ar" : "en",
        query,
      ),
    };
  }
}
