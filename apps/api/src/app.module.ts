import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { BranchesModule } from "./branches/branches.module";
import { DatabaseModule } from "./database/database.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [DatabaseModule, VehiclesModule, BranchesModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
