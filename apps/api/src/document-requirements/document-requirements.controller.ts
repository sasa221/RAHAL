import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type {
  AdminDocumentRequirementOverview,
  AdminDocumentRequirementRule,
  ApiSuccess,
} from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import {
  CreateDocumentRequirementDto,
  UpdateDocumentRequirementDto,
} from "./document-requirements.dto";
import { DocumentRequirementsService } from "./document-requirements.service";

@Controller("admin-document-requirements")
export class DocumentRequirementsController {
  constructor(private readonly requirements: DocumentRequirementsService) {}

  @Get()
  async overview(@Req() request: Request): Promise<ApiSuccess<AdminDocumentRequirementOverview>> {
    return { data: await this.requirements.overview(readAuthCookie(request)) };
  }

  @Post()
  async create(
    @Body() input: CreateDocumentRequirementDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<AdminDocumentRequirementRule>> {
    return { data: await this.requirements.create(readAuthCookie(request), input) };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() input: UpdateDocumentRequirementDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<AdminDocumentRequirementRule>> {
    return { data: await this.requirements.update(readAuthCookie(request), id, input) };
  }
}
