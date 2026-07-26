import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StaffModule } from "../staff/staff.module";
import { FleetController } from "./fleet.controller";
import { FleetRepository } from "./fleet.repository";
import { FleetService } from "./fleet.service";

@Module({
  imports: [AuthModule, StaffModule],
  controllers: [FleetController],
  providers: [FleetRepository, FleetService],
})
export class FleetModule {}
