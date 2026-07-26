import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { BranchesModule } from "./branches/branches.module";
import { DatabaseModule } from "./database/database.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { AuthModule } from "./auth/auth.module";
import { ReservationsModule } from "./reservations/reservations.module";
import { FleetModule } from "./fleet/fleet.module";

@Module({
  imports: [
    DatabaseModule,
    VehiclesModule,
    BranchesModule,
    AuthModule,
    ReservationsModule,
    FleetModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
