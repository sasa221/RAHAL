import { Body, Controller, Delete, Get, Param, Post, Query, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  NotificationInbox,
  NotificationCampaignCreateResult,
  NotificationCampaignPage,
  NotificationReadResult,
  PushSubscriptionResult,
} from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { NotificationsService } from "./notifications.service";
import {
  CreateNotificationCampaignDto,
  RemovePushSubscriptionDto,
  SavePushSubscriptionDto,
} from "./notifications.dto";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async inbox(
    @Query("locale") locale: string | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<NotificationInbox>> {
    return { data: await this.notifications.inbox(readAuthCookie(request), locale) };
  }

  @Post("read-all")
  async markAllRead(@Req() request: Request): Promise<ApiSuccess<{ readAt: string }>> {
    return { data: await this.notifications.markAllRead(readAuthCookie(request)) };
  }

  @Get("campaigns")
  async campaigns(
    @Query("locale") locale: string | undefined,
    @Req() request: Request,
  ): Promise<ApiSuccess<NotificationCampaignPage>> {
    return { data: await this.notifications.campaigns(readAuthCookie(request), locale) };
  }

  @Post("campaigns")
  async createCampaign(
    @Body() input: CreateNotificationCampaignDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<NotificationCampaignCreateResult>> {
    return {
      data: await this.notifications.createCampaign(readAuthCookie(request), input),
    };
  }

  @Get("push-key")
  pushKey(): ApiSuccess<{ publicKey: string | null }> {
    return { data: { publicKey: this.notifications.pushPublicKey() } };
  }

  @Post("push-subscriptions")
  async savePushSubscription(
    @Body() input: SavePushSubscriptionDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<PushSubscriptionResult>> {
    return {
      data: await this.notifications.savePushSubscription(
        readAuthCookie(request),
        input,
        request.headers["user-agent"],
      ),
    };
  }

  @Delete("push-subscriptions")
  async removePushSubscription(
    @Body() input: RemovePushSubscriptionDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<PushSubscriptionResult>> {
    return {
      data: await this.notifications.removePushSubscription(readAuthCookie(request), input),
    };
  }

  @Post(":id/read")
  async markRead(
    @Param("id") id: string,
    @Req() request: Request,
  ): Promise<ApiSuccess<NotificationReadResult>> {
    return {
      data: await this.notifications.markRead(readAuthCookie(request), id),
    };
  }
}
