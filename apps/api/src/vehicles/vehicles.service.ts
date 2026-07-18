import { Injectable, NotFoundException } from "@nestjs/common";
import { VehiclesRepository } from "./vehicles.repository";

@Injectable()
export class VehiclesService {
  constructor(private readonly vehicles: VehiclesRepository) {}

  list() {
    return this.vehicles.list();
  }

  async get(id: string) {
    const vehicle = await this.vehicles.findById(id);
    if (!vehicle) {
      throw new NotFoundException(`Vehicle '${id}' was not found.`);
    }
    return vehicle;
  }
}
