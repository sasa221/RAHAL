import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { FleetBlockResult, FleetCalendar, FleetCalendarEvent } from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import type { CreateFleetBlockDto, FleetCalendarQueryDto } from "./fleet.dto";
import { FleetRepository } from "./fleet.repository";

const dayMs = 24 * 60 * 60 * 1000;
const staffRoles = new Set(["SALES", "ADMIN", "SUPER_ADMIN"]);
const adminRoles = new Set(["ADMIN", "SUPER_ADMIN"]);

@Injectable()
export class FleetService {
  constructor(
    private readonly auth: AuthService,
    private readonly fleet: FleetRepository,
  ) {}

  async calendar(token: string | undefined, query: FleetCalendarQueryDto): Promise<FleetCalendar> {
    const session = await this.auth.getSession(token);
    if (!staffRoles.has(session.user.role)) {
      throw new ForbiddenException("Only Rahal staff can access the fleet calendar.");
    }

    const { from, toExclusive } = parseRange(query.from, query.to);
    const locale = session.user.preferredLocale === "ar" ? "ar" : "en";
    const canManageBlocks = adminRoles.has(session.user.role);
    const vehicles = await this.fleet.findCalendar(from, toExclusive);

    return {
      from: query.from,
      to: query.to,
      canManageBlocks,
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        slug: vehicle.slug,
        name: locale === "ar" ? vehicle.nameAr : vehicle.nameEn,
        registrationNumber: vehicle.registrationNumber,
        status: vehicle.status,
        branch: {
          id: vehicle.branch.id,
          name: locale === "ar" ? vehicle.branch.nameAr : vehicle.branch.nameEn,
        },
        events: [
          ...vehicle.reservations.map((reservation): FleetCalendarEvent => ({
            id: `reservation:${reservation.id}`,
            vehicleId: vehicle.id,
            kind: "PENDING",
            reference: reservation.reference,
            startsAt: reservation.pickupAt.toISOString(),
            endsAt: reservation.returnAt.toISOString(),
            reason: null,
            blocksAvailability: false,
            removable: false,
          })),
          ...vehicle.bookings.map((booking): FleetCalendarEvent => ({
            id: `booking:${booking.id}`,
            vehicleId: vehicle.id,
            kind: booking.status === "ACTIVE" ? "ACTIVE" : "CONFIRMED",
            reference: booking.reference,
            startsAt: booking.pickupAt.toISOString(),
            endsAt: booking.returnAt.toISOString(),
            reason: null,
            blocksAvailability: true,
            removable: false,
          })),
          ...vehicle.blocks.map((block): FleetCalendarEvent => ({
            id: block.id,
            vehicleId: vehicle.id,
            kind: block.type,
            reference: null,
            startsAt: block.startsAt.toISOString(),
            endsAt: block.endsAt.toISOString(),
            reason: block.reason,
            blocksAvailability: true,
            removable: canManageBlocks,
          })),
        ].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      })),
    };
  }

  async createBlock(
    token: string | undefined,
    input: CreateFleetBlockDto,
  ): Promise<FleetBlockResult> {
    const session = await this.requireAdmin(token);
    const startsAt = parseDate(input.startDate);
    const endsAt = new Date(parseDate(input.endDate).getTime() + dayMs);
    const today = parseDate(new Date().toISOString().slice(0, 10));
    if (startsAt.getTime() < today.getTime()) {
      throw new BadRequestException("Fleet blocks cannot start in the past.");
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new BadRequestException("The end date must not be before the start date.");
    }
    if (endsAt.getTime() - startsAt.getTime() > 366 * dayMs) {
      throw new BadRequestException("Fleet blocks cannot exceed 366 days.");
    }

    const vehicle = await this.fleet.findVehicle(input.vehicleId);
    if (!vehicle) throw new NotFoundException("The selected vehicle was not found.");
    if (await this.fleet.findBlockingConflict(vehicle.id, startsAt, endsAt)) {
      throw new ConflictException(
        "This period overlaps an existing confirmed booking or fleet block.",
      );
    }

    const block = await this.fleet.createBlock({
      vehicleId: vehicle.id,
      type: input.type,
      startsAt,
      endsAt,
      reason: input.reason.trim(),
      actorId: session.user.id,
    });
    return serializeBlock(block);
  }

  async removeBlock(token: string | undefined, id: string): Promise<FleetBlockResult> {
    const session = await this.requireAdmin(token);
    const block = await this.fleet.findBlock(id);
    if (!block) throw new NotFoundException("The fleet block was not found.");
    if (block.startsAt.getTime() < Date.now()) {
      throw new ConflictException("A block that has already started cannot be removed.");
    }
    return serializeBlock(await this.fleet.removeBlock(id, session.user.id));
  }

  private async requireAdmin(token: string | undefined) {
    const session = await this.auth.getSession(token);
    if (!adminRoles.has(session.user.role)) {
      throw new ForbiddenException("Only administrators can manage fleet blocks.");
    }
    return session;
  }
}

function parseRange(fromValue: string, toValue: string) {
  const from = parseDate(fromValue);
  const to = parseDate(toValue);
  if (to.getTime() < from.getTime()) {
    throw new BadRequestException("The calendar end date must not be before the start date.");
  }
  if (to.getTime() - from.getTime() > 62 * dayMs) {
    throw new BadRequestException("The fleet calendar range cannot exceed 63 days.");
  }
  return { from, toExclusive: new Date(to.getTime() + dayMs) };
}

function parseDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException("Invalid calendar date.");
  }
  return parsed;
}

function serializeBlock(block: {
  id: string;
  vehicleId: string;
  type: "MAINTENANCE" | "MANUAL_BLOCK";
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdAt: Date;
}): FleetBlockResult {
  return {
    id: block.id,
    vehicleId: block.vehicleId,
    type: block.type,
    startsAt: block.startsAt.toISOString(),
    endsAt: block.endsAt.toISOString(),
    reason: block.reason,
    createdAt: block.createdAt.toISOString(),
  };
}
