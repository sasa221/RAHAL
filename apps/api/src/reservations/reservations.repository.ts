import { Injectable } from "@nestjs/common";
import type { ReservationDraft } from "@rahal/contracts";
import type { DriverPolicy } from "@rahal/database";
import { randomInt } from "node:crypto";
import { PrismaService } from "../database/prisma.service";

export type DraftVehicleRecord = {
  id: string;
  branchId: string;
  minimumRentalDays: number;
  driverPolicy: DriverPolicy;
  dailyRate: { toNumber(): number };
  driverCharge: { toNumber(): number } | null;
};

type CreateDraftInput = {
  customerId: string;
  vehicle: DraftVehicleRecord;
  pickupAt: Date;
  returnAt: Date;
  driverRequested: boolean;
  rentalDays: number;
};

@Injectable()
export class ReservationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findVehicle(id: string): Promise<DraftVehicleRecord | null> {
    return this.prisma.client.vehicle.findFirst({
      where: { OR: [{ id }, { slug: id }], active: true, archivedAt: null },
      select: {
        id: true,
        branchId: true,
        minimumRentalDays: true,
        driverPolicy: true,
        dailyRate: true,
        driverCharge: true,
      },
    });
  }

  async saveDraft(input: CreateDraftInput): Promise<ReservationDraft> {
    const existing = await this.prisma.client.reservation.findFirst({
      where: {
        customerId: input.customerId,
        vehicleId: input.vehicle.id,
        pickupAt: input.pickupAt,
        returnAt: input.returnAt,
        driverRequested: input.driverRequested,
        status: "DRAFT",
      },
      select: draftSelect,
    });
    if (existing) return toReservationDraft(existing);

    const dailyRate = input.vehicle.dailyRate.toNumber();
    const driverRate = input.driverRequested ? (input.vehicle.driverCharge?.toNumber() ?? 0) : 0;
    const estimatedTotal = (dailyRate + driverRate) * input.rentalDays;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const reference = `RHL-${new Date().getUTCFullYear()}-${randomInt(100000, 1000000)}`;
      try {
        const created = await this.prisma.client.$transaction(async (transaction) => {
          const reservation = await transaction.reservation.create({
            data: {
              reference,
              customerId: input.customerId,
              vehicleId: input.vehicle.id,
              branchId: input.vehicle.branchId,
              status: "DRAFT",
              pickupAt: input.pickupAt,
              returnAt: input.returnAt,
              driverRequested: input.driverRequested,
              vehicleRateSnapshot: dailyRate,
              driverRateSnapshot: input.driverRequested ? driverRate : null,
              estimatedTotal,
            },
            select: draftSelect,
          });
          await transaction.reservationEvent.create({
            data: {
              reservationId: reservation.id,
              toStatus: "DRAFT",
              actorId: input.customerId,
              note: "Customer saved the first reservation step.",
            },
          });
          return reservation;
        });
        return toReservationDraft(created);
      } catch (error) {
        if (!isUniqueReferenceError(error) || attempt === 2) throw error;
      }
    }

    throw new Error("Unable to generate a reservation reference.");
  }
}

const draftSelect = {
  id: true,
  reference: true,
  status: true,
  vehicleId: true,
  pickupAt: true,
  returnAt: true,
  driverRequested: true,
  estimatedTotal: true,
} as const;

function toReservationDraft(record: {
  id: string;
  reference: string;
  status: string;
  vehicleId: string;
  pickupAt: Date;
  returnAt: Date;
  driverRequested: boolean;
  estimatedTotal: { toNumber(): number };
}): ReservationDraft {
  return {
    id: record.id,
    reference: record.reference,
    status: "DRAFT",
    vehicleId: record.vehicleId,
    pickupAt: record.pickupAt.toISOString(),
    returnAt: record.returnAt.toISOString(),
    driverRequested: record.driverRequested,
    estimatedTotalEgp: record.estimatedTotal.toNumber(),
  };
}

function isUniqueReferenceError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}
