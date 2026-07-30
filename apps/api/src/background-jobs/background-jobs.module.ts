import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { NotificationsModule } from "../notifications/notifications.module";
import { ReservationsModule } from "../reservations/reservations.module";
import { BackgroundJobsController } from "./background-jobs.controller";
import { BackgroundJobsInterceptor } from "./background-jobs.interceptor";
import { BackgroundJobsService } from "./background-jobs.service";

@Module({
  imports: [NotificationsModule, ReservationsModule],
  controllers: [BackgroundJobsController],
  providers: [
    BackgroundJobsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: BackgroundJobsInterceptor,
    },
  ],
  exports: [BackgroundJobsService],
})
export class BackgroundJobsModule {}
