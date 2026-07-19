import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { BranchesModule } from "./branches/branches.module";
import { DatabaseModule } from "./database/database.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { AuthModule } from "./auth/auth.module";
import { ReservationsModule } from "./reservations/reservations.module";

@Module({
  imports: [DatabaseModule, VehiclesModule, BranchesModule, AuthModule, ReservationsModule],
  controllers: [HealthController],
})
export class AppModule {}
