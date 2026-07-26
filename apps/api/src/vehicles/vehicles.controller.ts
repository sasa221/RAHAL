import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import type {
  ApiSuccess,
  ManagedVehicle,
  PublicVehicle,
  VehicleAdminCatalog,
} from "@rahal/contracts";
import type { Request } from "express";
import { readAuthCookie } from "../auth/auth-cookie";
import { SaveManagedVehicleDto } from "./vehicle-admin.dto";
import { VehiclesService } from "./vehicles.service";

@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  async list(): Promise<ApiSuccess<PublicVehicle[]>> {
    const data = await this.vehicles.list();
    return { data, meta: { source: "database", total: data.length } };
  }

  @Get("admin/catalog")
  async adminCatalog(@Req() request: Request): Promise<ApiSuccess<VehicleAdminCatalog>> {
    return { data: await this.vehicles.adminCatalog(readAuthCookie(request)) };
  }

  @Post("admin")
  async createManagedVehicle(
    @Body() input: SaveManagedVehicleDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ManagedVehicle>> {
    return {
      data: await this.vehicles.createManagedVehicle(readAuthCookie(request), input),
    };
  }

  @Patch("admin/:id")
  async updateManagedVehicle(
    @Param("id") id: string,
    @Body() input: SaveManagedVehicleDto,
    @Req() request: Request,
  ): Promise<ApiSuccess<ManagedVehicle>> {
    return {
      data: await this.vehicles.updateManagedVehicle(readAuthCookie(request), id, input),
    };
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<ApiSuccess<PublicVehicle>> {
    return { data: await this.vehicles.get(id), meta: { source: "database" } };
  }
}
