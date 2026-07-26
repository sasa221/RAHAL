import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesRepository } from "./vehicles.repository";
import { VehiclesService } from "./vehicles.service";

@Module({
  imports: [AuthModule],
  controllers: [VehiclesController],
  providers: [VehiclesRepository, VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
