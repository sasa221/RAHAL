import { Body, Controller, Get, Param, Patch, Query, Req } from "@nestjs/common";
import type {
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminCustomerPage,
  ApiSuccess,
} from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { UpdateCustomerStatusDto } from "./admin-customers.dto";
import { AdminCustomersService } from "./admin-customers.service";

@Controller("admin-customers")
export class AdminCustomersController {
  constructor(private readonly customers: AdminCustomersService) {}

  @Get()
  async page(
    @Req() request: Request,
    @Query() query: Record<string, string | undefined>,
  ): Promise<ApiSuccess<AdminCustomerPage>> {
    return {
      data: await this.customers.page(readAuthCookie(request), {
        ...query,
        locale: query.locale === "ar" ? "ar" : "en",
      }),
    };
  }

  @Get(":id")
  async detail(
    @Param("id") id: string,
    @Req() request: Request,
    @Query("locale") locale?: string,
  ): Promise<ApiSuccess<AdminCustomerDetail>> {
    return {
      data: await this.customers.detail(readAuthCookie(request), id, locale === "ar" ? "ar" : "en"),
    };
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Req() request: Request,
    @Body() input: UpdateCustomerStatusDto,
    @Query("locale") locale?: string,
  ): Promise<ApiSuccess<AdminCustomerListItem>> {
    return {
      data: await this.customers.updateStatus(
        readAuthCookie(request),
        id,
        input,
        locale === "ar" ? "ar" : "en",
      ),
    };
  }
}
