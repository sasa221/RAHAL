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
import { AdminOperationsModule } from "./admin-operations/admin-operations.module";
import { DocumentRequirementsModule } from "./document-requirements/document-requirements.module";
import { PoliciesModule } from "./policies/policies.module";

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
    AdminOperationsModule,
    DocumentRequirementsModule,
    PoliciesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
