import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ManagedVehicle, VehicleAdminCatalog } from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import type { SaveManagedVehicleDto } from "./vehicle-admin.dto";
import { VehiclesRepository } from "./vehicles.repository";

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehicles: VehiclesRepository,
    private readonly auth: AuthService,
  ) {}

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

  async adminCatalog(token: string | undefined): Promise<VehicleAdminCatalog> {
    await this.requireAdmin(token);
    return this.vehicles.adminCatalog();
  }

  async createManagedVehicle(
    token: string | undefined,
    input: SaveManagedVehicleDto,
  ): Promise<ManagedVehicle> {
    const session = await this.requireAdmin(token);
    if (!(await this.vehicles.findBranch(input.branchId))) {
      throw new NotFoundException("The selected active branch was not found.");
    }
    try {
      return await this.vehicles.createManagedVehicle(toWriteInput(input), session.user.id);
    } catch (error) {
      throwVehicleConflict(error);
    }
  }

  async updateManagedVehicle(
    token: string | undefined,
    id: string,
    input: SaveManagedVehicleDto,
  ): Promise<ManagedVehicle> {
    const session = await this.requireAdmin(token);
    const existing = await this.vehicles.findManagedVehicle(id);
    if (!existing) throw new NotFoundException("The managed vehicle was not found.");
    if (!(await this.vehicles.findBranch(input.branchId))) {
      throw new NotFoundException("The selected active branch was not found.");
    }
    if (!input.active && !["AVAILABLE", "INACTIVE"].includes(existing.status)) {
      throw new ConflictException(
        "A vehicle with an active operational state cannot be deactivated.",
      );
    }
    try {
      return await this.vehicles.updateManagedVehicle(
        id,
        toWriteInput(input, existing.slug),
        session.user.id,
      );
    } catch (error) {
      throwVehicleConflict(error);
    }
  }

  private async requireAdmin(token: string | undefined) {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("Only administrators can manage vehicles.");
    }
    return session;
  }
}

function toWriteInput(input: SaveManagedVehicleDto, currentSlug?: string) {
  const driverCharge =
    input.driverPolicy === "UNAVAILABLE" ? null : (input.driverChargeEgp ?? null);
  return {
    branchId: input.branchId,
    slug: currentSlug ?? createSlug(input.nameEn, input.registrationNumber),
    nameAr: input.nameAr.trim(),
    nameEn: input.nameEn.trim(),
    make: input.make.trim(),
    model: input.model.trim(),
    year: input.year,
    registrationNumber: input.registrationNumber.trim().toUpperCase(),
    category: input.category,
    transmission: input.transmission,
    fuelType: input.fuelType.trim(),
    seats: input.seats,
    luggage: input.luggage ?? null,
    doors: input.doors ?? null,
    dailyRate: input.dailyRateEgp,
    weeklyRate: input.weeklyRateEgp ?? null,
    minimumRentalDays: input.minimumRentalDays,
    driverPolicy: input.driverPolicy,
    driverChargeType: driverCharge === null ? null : ("PER_DAY" as const),
    driverCharge,
    mileageAllowancePerDay: input.mileageAllowancePerDay ?? null,
    depositAmount: input.depositAmountEgp ?? null,
    active: input.active,
    featured: input.featured,
    images: input.images.map((image) => ({
      url: image.url.trim(),
      altAr: image.altAr?.trim() || null,
      altEn: image.altEn?.trim() || null,
    })),
  };
}

function createSlug(name: string, registrationNumber: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const suffix = registrationNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(-8);
  return `${base || "vehicle"}-${suffix || Date.now().toString(36)}`;
}

function throwVehicleConflict(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  ) {
    throw new ConflictException("The registration number or generated vehicle URL already exists.");
  }
  throw error;
}
