import { Injectable } from "@nestjs/common";
import type { PublicVehicle } from "@rahal/contracts";
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
}
