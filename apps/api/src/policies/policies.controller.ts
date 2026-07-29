import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { ApiSuccess, PolicyManagementOverview } from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { PublishPolicyBundleDto } from "./policies.dto";
import { PoliciesService } from "./policies.service";

@Controller("policies")
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Get("admin")
  async overview(@Req() request: Request): Promise<ApiSuccess<PolicyManagementOverview>> {
    return { data: await this.policies.overview(readAuthCookie(request)) };
  }

  @Post("admin/publish")
  async publish(
    @Body() input: PublishPolicyBundleDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<PolicyManagementOverview>> {
    return { data: await this.policies.publish(readAuthCookie(request), input) };
  }
}
