import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ReservationsController } from "./reservations.controller";
import { ReservationsRepository } from "./reservations.repository";
import { ReservationsService } from "./reservations.service";

@Module({
  imports: [AuthModule],
  controllers: [ReservationsController],
  providers: [ReservationsRepository, ReservationsService],
})
export class ReservationsModule {}
