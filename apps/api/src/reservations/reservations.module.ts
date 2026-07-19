import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ReservationsController } from "./reservations.controller";
import { PrivateDocumentStorage } from "./private-document-storage";
import { ReservationsRepository } from "./reservations.repository";
import { ReservationsService } from "./reservations.service";
import { ReservationExpiryService } from "./reservation-expiry.service";

@Module({
  imports: [AuthModule],
  controllers: [ReservationsController],
  providers: [
    PrivateDocumentStorage,
    ReservationsRepository,
    ReservationsService,
    ReservationExpiryService,
  ],
})
export class ReservationsModule {}
