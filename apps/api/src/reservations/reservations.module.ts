import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ReservationsController } from "./reservations.controller";
import { PrivateDocumentStorage } from "./private-document-storage";
import { ReservationsRepository } from "./reservations.repository";
import { ReservationsService } from "./reservations.service";
import { ReservationExpiryService } from "./reservation-expiry.service";
import { StaffModule } from "../staff/staff.module";
import { DocumentScanService } from "./document-scan.service";

@Module({
  imports: [AuthModule, StaffModule],
  controllers: [ReservationsController],
  providers: [
    PrivateDocumentStorage,
    DocumentScanService,
    ReservationsRepository,
    ReservationsService,
    ReservationExpiryService,
  ],
  exports: [PrivateDocumentStorage],
})
export class ReservationsModule {}
