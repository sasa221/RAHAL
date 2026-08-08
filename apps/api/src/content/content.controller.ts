import { Body, Controller, Get, Param, Post, Put, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  ManagedSiteContent,
  PublishedSiteContent,
  SiteContentAdminOverview,
} from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { PublishSiteContentDto, SaveSiteContentDto } from "./content.dto";
import { ContentService } from "./content.service";

@Controller("content")
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get("public")
  async published(): Promise<ApiSuccess<PublishedSiteContent>> {
    return { data: await this.content.published() };
  }

  @Get("admin")
  async overview(@Req() request: Request): Promise<ApiSuccess<SiteContentAdminOverview>> {
    return { data: await this.content.overview(readAuthCookie(request)) };
  }

  @Put("admin/:key")
  async saveDraft(
    @Param("key") key: string,
    @Body() input: SaveSiteContentDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ManagedSiteContent>> {
    return { data: await this.content.saveDraft(readAuthCookie(request), key, input) };
  }

  @Post("admin/:key/publish")
  async publish(
    @Param("key") key: string,
    @Body() input: PublishSiteContentDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ManagedSiteContent>> {
    return { data: await this.content.publish(readAuthCookie(request), key, input) };
  }
}
