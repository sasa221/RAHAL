import { Injectable } from "@nestjs/common";
import type { ManagedVehicle, PublicVehicle, VehicleAdminCatalog } from "@rahal/contracts";
import type { DriverPolicy, VehicleStatus } from "@rahal/database";
import { PrismaService } from "../database/prisma.service";

type LocalizedText = PublicVehicle["name"];

const categories: Record<string, { label: LocalizedText; key: PublicVehicle["categoryKey"] }> = {
  economy: { key: "economy", label: { ar: "اقتصادية", en: "Economy" } },
  sedan: { key: "sedan", label: { ar: "سيدان", en: "Sedan" } },
  suv: { key: "suv", label: { ar: "دفع رباعي", en: "SUV" } },
};

const driverPolicies: Record<
  DriverPolicy,
  { key: PublicVehicle["driverPolicyKey"]; label: LocalizedText }
> = {
  OPTIONAL: { key: "optional", label: { ar: "السائق اختياري", en: "Optional driver" } },
  MANDATORY: { key: "required", label: { ar: "السائق مطلوب", en: "Driver required" } },
  UNAVAILABLE: { key: "self-drive", label: { ar: "بدون سائق", en: "Self-drive only" } },
};

export type VehicleRecord = {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  weeklyRate: { toNumber(): number } | null;
  dailyRate: { toNumber(): number };
  minimumRentalDays: number;
  seats: number;
  luggage: number | null;
  year: number;
  transmission: string;
  driverPolicy: DriverPolicy;
  fuelPolicyAr: string | null;
  fuelPolicyEn: string | null;
  mileageAllowancePerDay: number | null;
  status: VehicleStatus;
  images: Array<{
    url: string;
    altAr: string | null;
    altEn: string | null;
  }>;
};

export function toPublicVehicle(vehicle: VehicleRecord): PublicVehicle {
  const category = categories[vehicle.category.toLowerCase()] ?? categories.sedan;
  const driverPolicy = driverPolicies[vehicle.driverPolicy];
  const image = vehicle.images[0];
  const mileage = vehicle.mileageAllowancePerDay;

  return {
    id: vehicle.id,
    name: { ar: vehicle.nameAr, en: vehicle.nameEn },
    category: category.label,
    categoryKey: category.key,
    image: image?.url ?? "/images/white-sedan.jpg",
    imageAlt: {
      ar: image?.altAr ?? vehicle.nameAr,
      en: image?.altEn ?? vehicle.nameEn,
    },
    dailyRateEgp: vehicle.dailyRate.toNumber(),
    weeklyRateEgp: vehicle.weeklyRate?.toNumber() ?? vehicle.dailyRate.toNumber() * 7,
    minimumDays: vehicle.minimumRentalDays,
    seats: vehicle.seats,
    bags: vehicle.luggage ?? 0,
    year: vehicle.year,
    transmission:
      vehicle.transmission === "AUTOMATIC"
        ? { ar: "أوتوماتيك", en: "Automatic" }
        : { ar: "يدوي", en: "Manual" },
    driverPolicy: driverPolicy.label,
    driverPolicyKey: driverPolicy.key,
    fuelPolicy: {
      ar: vehicle.fuelPolicyAr ?? "تُعاد السيارة بنفس مستوى الوقود.",
      en: vehicle.fuelPolicyEn ?? "Return the vehicle at the same fuel level.",
    },
    mileagePolicy: mileage
      ? { ar: `${mileage} كم يوميًا`, en: `${mileage} km per day` }
      : { ar: "تُراجع في الفرع", en: "Confirmed at the branch" },
    status: vehicle.status === "AVAILABLE" ? "available" : "review",
  };
}

@Injectable()
export class VehiclesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PublicVehicle[]> {
    const vehicles = await this.prisma.client.vehicle.findMany({
      where: { active: true, archivedAt: null },
      orderBy: [{ featured: "desc" }, { dailyRate: "asc" }],
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        category: true,
        dailyRate: true,
        weeklyRate: true,
        minimumRentalDays: true,
        seats: true,
        luggage: true,
        year: true,
        transmission: true,
        driverPolicy: true,
        fuelPolicyAr: true,
        fuelPolicyEn: true,
        mileageAllowancePerDay: true,
        status: true,
        images: {
          where: { isPrimary: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true, altAr: true, altEn: true },
        },
      },
    });

    return vehicles.map(toPublicVehicle);
  }

  async findById(id: string): Promise<PublicVehicle | null> {
    const vehicle = await this.prisma.client.vehicle.findFirst({
      where: { OR: [{ id }, { slug: id }], active: true, archivedAt: null },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        category: true,
        dailyRate: true,
        weeklyRate: true,
        minimumRentalDays: true,
        seats: true,
        luggage: true,
        year: true,
        transmission: true,
        driverPolicy: true,
        fuelPolicyAr: true,
        fuelPolicyEn: true,
        mileageAllowancePerDay: true,
        status: true,
        images: {
          where: { isPrimary: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true, altAr: true, altEn: true },
        },
      },
    });

    return vehicle ? toPublicVehicle(vehicle) : null;
  }

  async adminCatalog(): Promise<VehicleAdminCatalog> {
    const [vehicles, branches] = await Promise.all([
      this.prisma.client.vehicle.findMany({
        where: { archivedAt: null },
        orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
        select: managedVehicleSelect,
      }),
      this.prisma.client.branch.findMany({
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, nameAr: true, nameEn: true },
      }),
    ]);
    return { vehicles: vehicles.map(toManagedVehicle), branches };
  }

  findManagedVehicle(id: string) {
    return this.prisma.client.vehicle.findFirst({
      where: { id, archivedAt: null },
      select: managedVehicleSelect,
    });
  }

  findBranch(id: string) {
    return this.prisma.client.branch.findFirst({
      where: { id, active: true },
      select: { id: true },
    });
  }

  createManagedVehicle(input: ManagedVehicleWrite, actorId: string): Promise<ManagedVehicle> {
    return this.prisma.client.$transaction(async (transaction) => {
      const vehicle = await transaction.vehicle.create({
        data: {
          ...input,
          status: input.active ? "AVAILABLE" : "INACTIVE",
        },
        select: managedVehicleSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "VEHICLE_CREATED",
          entityType: "Vehicle",
          entityId: vehicle.id,
          newData: auditVehicle(vehicle),
        },
      });
      return toManagedVehicle(vehicle);
    });
  }

  updateManagedVehicle(
    id: string,
    input: ManagedVehicleWrite,
    actorId: string,
  ): Promise<ManagedVehicle> {
    return this.prisma.client.$transaction(async (transaction) => {
      const previous = await transaction.vehicle.findUniqueOrThrow({
        where: { id },
        select: managedVehicleSelect,
      });
      const status =
        previous.status === "AVAILABLE" || previous.status === "INACTIVE"
          ? input.active
            ? "AVAILABLE"
            : "INACTIVE"
          : previous.status;
      const vehicle = await transaction.vehicle.update({
        where: { id },
        data: { ...input, status },
        select: managedVehicleSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "VEHICLE_UPDATED",
          entityType: "Vehicle",
          entityId: vehicle.id,
          previousData: auditVehicle(previous),
          newData: auditVehicle(vehicle),
        },
      });
      return toManagedVehicle(vehicle);
    });
  }
}

const managedVehicleSelect = {
  id: true,
  branchId: true,
  slug: true,
  nameAr: true,
  nameEn: true,
  make: true,
  model: true,
  year: true,
  registrationNumber: true,
  category: true,
  transmission: true,
  fuelType: true,
  seats: true,
  luggage: true,
  doors: true,
  status: true,
  dailyRate: true,
  weeklyRate: true,
  minimumRentalDays: true,
  driverPolicy: true,
  driverCharge: true,
  mileageAllowancePerDay: true,
  depositAmount: true,
  active: true,
  featured: true,
  updatedAt: true,
} as const;

type ManagedVehicleRecord = {
  id: string;
  branchId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  luggage: number | null;
  doors: number | null;
  status: VehicleStatus;
  dailyRate: { toNumber(): number };
  weeklyRate: { toNumber(): number } | null;
  minimumRentalDays: number;
  driverPolicy: DriverPolicy;
  driverCharge: { toNumber(): number } | null;
  mileageAllowancePerDay: number | null;
  depositAmount: { toNumber(): number } | null;
  active: boolean;
  featured: boolean;
  updatedAt: Date;
};

type ManagedVehicleWrite = {
  branchId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  luggage: number | null;
  doors: number | null;
  dailyRate: number;
  weeklyRate: number | null;
  minimumRentalDays: number;
  driverPolicy: DriverPolicy;
  driverChargeType: "PER_DAY" | null;
  driverCharge: number | null;
  mileageAllowancePerDay: number | null;
  depositAmount: number | null;
  active: boolean;
  featured: boolean;
};

function toManagedVehicle(vehicle: ManagedVehicleRecord): ManagedVehicle {
  return {
    id: vehicle.id,
    branchId: vehicle.branchId,
    slug: vehicle.slug,
    nameAr: vehicle.nameAr,
    nameEn: vehicle.nameEn,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    registrationNumber: vehicle.registrationNumber,
    category: vehicle.category,
    transmission: vehicle.transmission === "MANUAL" ? "MANUAL" : "AUTOMATIC",
    fuelType: vehicle.fuelType,
    seats: vehicle.seats,
    luggage: vehicle.luggage,
    doors: vehicle.doors,
    status: vehicle.status,
    dailyRateEgp: vehicle.dailyRate.toNumber(),
    weeklyRateEgp: vehicle.weeklyRate?.toNumber() ?? null,
    minimumRentalDays: vehicle.minimumRentalDays,
    driverPolicy: vehicle.driverPolicy,
    driverChargeEgp: vehicle.driverCharge?.toNumber() ?? null,
    mileageAllowancePerDay: vehicle.mileageAllowancePerDay,
    depositAmountEgp: vehicle.depositAmount?.toNumber() ?? null,
    active: vehicle.active,
    featured: vehicle.featured,
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

function auditVehicle(vehicle: ManagedVehicleRecord) {
  return {
    branchId: vehicle.branchId,
    registrationNumber: vehicle.registrationNumber,
    status: vehicle.status,
    dailyRateEgp: vehicle.dailyRate.toNumber(),
    minimumRentalDays: vehicle.minimumRentalDays,
    driverPolicy: vehicle.driverPolicy,
    active: vehicle.active,
    featured: vehicle.featured,
  };
}
