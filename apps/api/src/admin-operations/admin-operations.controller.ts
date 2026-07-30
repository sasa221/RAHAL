import { Controller, Get, Post, Query, Req } from "@nestjs/common";
import type {
  AdminAuditPage,
  AdminCommunicationRunResult,
  AdminCommunicationsOverview,
  AdminDocumentAccessPage,
  AdminOperationsOverview,
  ApiSuccess,
} from "@rahal/contracts";
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

  @Get("document-access")
  async documentAccess(
    @Req() request: Request,
    @Query() query: Record<string, string | undefined>,
  ): Promise<ApiSuccess<AdminDocumentAccessPage>> {
    return {
      data: await this.operations.documentAccess(
        readAuthCookie(request),
        query.locale === "ar" ? "ar" : "en",
        query,
      ),
    };
  }

  @Get("communications")
  async communications(@Req() request: Request): Promise<ApiSuccess<AdminCommunicationsOverview>> {
    return { data: await this.operations.communications(readAuthCookie(request)) };
  }

  @Post("communications/run")
  async runCommunications(
    @Req() request: Request,
  ): Promise<ApiSuccess<AdminCommunicationRunResult>> {
    return { data: await this.operations.runCommunicationQueue(readAuthCookie(request)) };
  }
}
