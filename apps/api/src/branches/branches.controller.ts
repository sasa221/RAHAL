import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  BranchManagementOverview,
  BranchSummary,
  ManagedBranch,
} from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { BranchActionDto, SaveBranchDto } from "./branches.dto";
import { BranchesService } from "./branches.service";

@Controller("branches")
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  async list(): Promise<ApiSuccess<BranchSummary[]>> {
    const data = await this.branches.list();
    return { data, meta: { source: "database", total: data.length } };
  }

  @Get("admin")
  async adminList(@Req() request: Request): Promise<ApiSuccess<BranchManagementOverview>> {
    return { data: await this.branches.adminList(readAuthCookie(request)) };
  }

  @Post("admin")
  async create(
    @Body() input: SaveBranchDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ManagedBranch>> {
    return { data: await this.branches.create(readAuthCookie(request), input) };
  }

  @Put("admin/:id")
  async update(
    @Param("id") id: string,
    @Body() input: SaveBranchDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ManagedBranch>> {
    return { data: await this.branches.update(readAuthCookie(request), id, input) };
  }

  @Patch("admin/:id/disable")
  async disable(
    @Param("id") id: string,
    @Body() input: BranchActionDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ManagedBranch>> {
    return { data: await this.branches.disable(readAuthCookie(request), id, input) };
  }

  @Delete("admin/:id")
  async delete(
    @Param("id") id: string,
    @Body() input: BranchActionDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<{ deleted: true }>> {
    return { data: await this.branches.delete(readAuthCookie(request), id, input) };
  }
}
