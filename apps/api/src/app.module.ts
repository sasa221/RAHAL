import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { BranchesModule } from "./branches/branches.module";
import { DatabaseModule } from "./database/database.module";
import { VehiclesModule } from "./vehicles/vehicles.module";
import { AuthModule } from "./auth/auth.module";
import { ReservationsModule } from "./reservations/reservations.module";
import { FleetModule } from "./fleet/fleet.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { StaffModule } from "./staff/staff.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { AccountModule } from "./account/account.module";

@Module({
  imports: [
    DatabaseModule,
    VehiclesModule,
    BranchesModule,
    AuthModule,
    ReservationsModule,
    FleetModule,
    NotificationsModule,
    StaffModule,
    ReviewsModule,
    AccountModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
