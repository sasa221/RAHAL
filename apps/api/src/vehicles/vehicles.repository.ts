import { Injectable } from "@nestjs/common";
import type { DemoVehicle } from "@rahal/contracts";
import type { VehicleStatus } from "@rahal/database";
import { PrismaService } from "../database/prisma.service";

const publicStatuses = new Set<DemoVehicle["status"]>([
  "AVAILABLE",
  "PENDING_REQUEST",
  "CONFIRMED_BOOKING",
  "RENTED",
  "MAINTENANCE",
  "MANUALLY_BLOCKED",
  "OVERDUE",
  "INACTIVE",
  "ARCHIVED",
]);

export type VehicleRecord = {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  dailyRate: { toNumber(): number };
  status: VehicleStatus;
};

export function toDemoVehicle(vehicle: VehicleRecord): DemoVehicle {
  const status = publicStatuses.has(vehicle.status as DemoVehicle["status"])
    ? (vehicle.status as DemoVehicle["status"])
    : "INACTIVE";

  return {
    id: vehicle.id,
    nameAr: vehicle.nameAr,
    nameEn: vehicle.nameEn,
    categoryAr: vehicle.category,
    categoryEn: vehicle.category,
    dailyRateEgp: vehicle.dailyRate.toNumber(),
    status,
  };
}

@Injectable()
export class VehiclesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<DemoVehicle[]> {
    const vehicles = await this.prisma.client.vehicle.findMany({
      where: { active: true, archivedAt: null },
      orderBy: [{ featured: "desc" }, { dailyRate: "asc" }],
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        category: true,
        dailyRate: true,
        status: true,
      },
    });

    return vehicles.map(toDemoVehicle);
  }

  async findById(id: string): Promise<DemoVehicle | null> {
    const vehicle = await this.prisma.client.vehicle.findFirst({
      where: { OR: [{ id }, { slug: id }], active: true, archivedAt: null },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        category: true,
        dailyRate: true,
        status: true,
      },
    });

    return vehicle ? toDemoVehicle(vehicle) : null;
  }
}
