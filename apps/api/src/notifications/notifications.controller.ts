import { Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { ApiSuccess, NotificationInbox, NotificationReadResult } from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async inbox(@Req() request: Request): Promise<ApiSuccess<NotificationInbox>> {
    return { data: await this.notifications.inbox(readAuthCookie(request)) };
  }

  @Post("read-all")
  async markAllRead(@Req() request: Request): Promise<ApiSuccess<{ readAt: string }>> {
    return { data: await this.notifications.markAllRead(readAuthCookie(request)) };
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
