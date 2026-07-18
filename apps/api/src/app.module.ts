import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { BranchesModule } from "./branches/branches.module";
import { DatabaseModule } from "./database/database.module";
import { VehiclesModule } from "./vehicles/vehicles.module";

@Module({
  imports: [DatabaseModule, VehiclesModule, BranchesModule],
  controllers: [HealthController],
})
export class AppModule {}
