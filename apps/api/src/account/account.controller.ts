import { Body, Controller, Get, Patch, Put, Req } from "@nestjs/common";
import type { ApiSuccess, CustomerAccountOverview } from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { UpdateCustomerProfileDto, UpdateNotificationPreferencesDto } from "./account.dto";
import { AccountService } from "./account.service";

@Controller("account")
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get()
  async overview(@Req() request: Request): Promise<ApiSuccess<CustomerAccountOverview>> {
    return { data: await this.account.overview(readAuthCookie(request)) };
  }

  @Patch("profile")
  async updateProfile(
    @Req() request: Request,
    @Body() input: UpdateCustomerProfileDto,
  ): Promise<ApiSuccess<CustomerAccountOverview>> {
    return { data: await this.account.updateProfile(readAuthCookie(request), input) };
  }

  @Put("notifications")
  async updateNotifications(
    @Req() request: Request,
    @Body() input: UpdateNotificationPreferencesDto,
  ): Promise<ApiSuccess<CustomerAccountOverview>> {
    return { data: await this.account.updateNotifications(readAuthCookie(request), input) };
  }
}
