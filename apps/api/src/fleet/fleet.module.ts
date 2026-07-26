import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FleetController } from "./fleet.controller";
import { FleetRepository } from "./fleet.repository";
import { FleetService } from "./fleet.service";

@Module({
  imports: [AuthModule],
  controllers: [FleetController],
  providers: [FleetRepository, FleetService],
})
export class FleetModule {}
