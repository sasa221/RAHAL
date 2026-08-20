import { Body, Controller, Get, Param, Patch, Post, Put, Req } from "@nestjs/common";
import type { ApiSuccess, StaffAdminOverview, StaffMember } from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import {
  CreateStaffDto,
  ResetStaffAccessDto,
  UpdateRolePermissionsDto,
  UpdateStaffDto,
  UpdateStaffPermissionsDto,
} from "./staff.dto";
import { StaffService } from "./staff.service";

@Controller("staff")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  async overview(@Req() request: Request): Promise<ApiSuccess<StaffAdminOverview>> {
    return { data: await this.staff.overview(readAuthCookie(request)) };
  }

  @Post()
  async create(
    @Req() request: Request,
    @Body() input: CreateStaffDto,
  ): Promise<ApiSuccess<StaffMember>> {
    return { data: await this.staff.create(readAuthCookie(request), input) };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Req() request: Request,
    @Body() input: UpdateStaffDto,
  ): Promise<ApiSuccess<StaffMember>> {
    return { data: await this.staff.update(readAuthCookie(request), id, input) };
  }

  @Put(":id/permissions")
  async replaceOverrides(
    @Param("id") id: string,
    @Req() request: Request,
    @Body() input: UpdateStaffPermissionsDto,
  ): Promise<ApiSuccess<StaffMember>> {
    return { data: await this.staff.replaceOverrides(readAuthCookie(request), id, input) };
  }

  @Post(":id/reset-access")
  async resetAccess(
    @Param("id") id: string,
    @Req() request: Request,
    @Body() input: ResetStaffAccessDto,
  ): Promise<ApiSuccess<StaffMember>> {
    return { data: await this.staff.resetAccess(readAuthCookie(request), id, input) };
  }

  @Put("roles/:id/permissions")
  async replaceRolePermissions(
    @Param("id") id: string,
    @Req() request: Request,
    @Body() input: UpdateRolePermissionsDto,
  ): Promise<ApiSuccess<StaffAdminOverview>> {
    return {
      data: await this.staff.replaceRolePermissions(readAuthCookie(request), id, input),
    };
  }
}
