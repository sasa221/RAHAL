import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StaffModule } from "../staff/staff.module";
import { AdminOperationsController } from "./admin-operations.controller";
import { AdminOperationsRepository } from "./admin-operations.repository";
import { AdminOperationsService } from "./admin-operations.service";
import { BackgroundJobsModule } from "../background-jobs/background-jobs.module";

@Module({
  imports: [AuthModule, StaffModule, BackgroundJobsModule],
  controllers: [AdminOperationsController],
  providers: [AdminOperationsRepository, AdminOperationsService],
})
export class AdminOperationsModule {}
