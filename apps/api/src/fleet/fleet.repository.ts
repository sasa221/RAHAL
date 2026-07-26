import { Injectable } from "@nestjs/common";
import type { VehicleBlockType } from "@rahal/database";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class FleetRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCalendar(from: Date, toExclusive: Date) {
    return this.prisma.client.vehicle.findMany({
      where: { active: true, archivedAt: null },
      orderBy: [{ branch: { nameEn: "asc" } }, { nameEn: "asc" }],
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        registrationNumber: true,
        status: true,
        branch: { select: { id: true, nameAr: true, nameEn: true } },
        reservations: {
          where: {
            status: {
              in: [
                "PENDING_REVIEW",
                "UNDER_REVIEW",
                "MORE_INFORMATION_REQUIRED",
                "PRE_APPROVED",
                "ALTERNATIVE_OFFERED",
              ],
            },
            pickupAt: { lt: toExclusive },
            returnAt: { gt: from },
          },
          select: {
            id: true,
            reference: true,
            pickupAt: true,
            returnAt: true,
          },
        },
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "ACTIVE"] },
            pickupAt: { lt: toExclusive },
            returnAt: { gt: from },
          },
          select: {
            id: true,
            reference: true,
            status: true,
            pickupAt: true,
            returnAt: true,
          },
        },
        blocks: {
          where: { startsAt: { lt: toExclusive }, endsAt: { gt: from } },
          select: {
            id: true,
            type: true,
            startsAt: true,
            endsAt: true,
            reason: true,
          },
        },
      },
    });
  }

  findVehicle(id: string) {
    return this.prisma.client.vehicle.findFirst({
      where: { id, active: true, archivedAt: null },
      select: { id: true },
    });
  }

  findBlockingConflict(vehicleId: string, startsAt: Date, endsAt: Date) {
    return this.prisma.client.vehicle.findFirst({
      where: {
        id: vehicleId,
        OR: [
          {
            blocks: {
              some: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
            },
          },
          {
            bookings: {
              some: {
                status: { in: ["CONFIRMED", "ACTIVE"] },
                pickupAt: { lt: endsAt },
                returnAt: { gt: startsAt },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
  }

  createBlock(input: {
    vehicleId: string;
    type: VehicleBlockType;
    startsAt: Date;
    endsAt: Date;
    reason: string;
    actorId: string;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const block = await transaction.vehicleBlock.create({
        data: {
          vehicleId: input.vehicleId,
          type: input.type,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          reason: input.reason,
          createdBy: input.actorId,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "FLEET_BLOCK_CREATED",
          entityType: "VehicleBlock",
          entityId: block.id,
          newData: {
            vehicleId: input.vehicleId,
            type: input.type,
            startsAt: input.startsAt.toISOString(),
            endsAt: input.endsAt.toISOString(),
          },
          reason: input.reason,
        },
      });
      return block;
    });
  }

  findBlock(id: string) {
    return this.prisma.client.vehicleBlock.findUnique({ where: { id } });
  }

  removeBlock(id: string, actorId: string) {
    return this.prisma.client.$transaction(async (transaction) => {
      const block = await transaction.vehicleBlock.delete({ where: { id } });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "FLEET_BLOCK_REMOVED",
          entityType: "VehicleBlock",
          entityId: block.id,
          previousData: {
            vehicleId: block.vehicleId,
            type: block.type,
            startsAt: block.startsAt.toISOString(),
            endsAt: block.endsAt.toISOString(),
          },
          reason: block.reason,
        },
      });
      return block;
    });
  }
}
