import { Controller, Get, Param } from "@nestjs/common";
import type { ApiSuccess, DemoVehicle } from "@rahal/contracts";
import { VehiclesService } from "./vehicles.service";

@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  async list(): Promise<ApiSuccess<DemoVehicle[]>> {
    const data = await this.vehicles.list();
    return { data, meta: { source: "database", total: data.length } };
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<ApiSuccess<DemoVehicle>> {
    return { data: await this.vehicles.get(id), meta: { source: "database" } };
  }
}
