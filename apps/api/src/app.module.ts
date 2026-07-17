import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { VehiclesController } from "./vehicles.controller";

@Module({ controllers: [HealthController, VehiclesController] })
export class AppModule {}
