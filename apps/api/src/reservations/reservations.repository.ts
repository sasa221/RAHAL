import { Injectable } from "@nestjs/common";
import type {
  ReservationConsents,
  ReservationCustomerDetails,
  ReservationDraft,
} from "@rahal/contracts";
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

type SaveCustomerDetailsInput = {
  draftId: string;
  reference: string;
  customerId: string;
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type SaveConsentsInput = {
  draftId: string;
  reference: string;
  customerId: string;
  policyVersion: string;
  marketingAccepted: boolean;
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

  findOwnedDraft(id: string, customerId: string) {
    return this.prisma.client.reservation.findFirst({
      where: { id, customerId, status: "DRAFT" },
      select: { id: true, reference: true, customerDetailsCompletedAt: true },
    });
  }

  findConsentPolicies(locale: "ar" | "en") {
    const now = new Date();
    return this.prisma.client.policyVersion.findMany({
      where: {
        locale,
        policyKey: {
          in: ["RENTAL_TERMS", "PRIVACY", "DOCUMENT_PROCESSING", "RESERVATION_PROCESS"],
        },
        effectiveAt: { lte: now },
        OR: [{ retiredAt: null }, { retiredAt: { gt: now } }],
      },
      orderBy: { effectiveAt: "desc" },
      select: { policyKey: true, version: true, title: true, body: true },
    });
  }

  async saveCustomerDetails(
    input: SaveCustomerDetailsInput,
  ): Promise<ReservationCustomerDetails | null> {
    const completedAt = new Date();
    const saved = await this.prisma.client.$transaction(async (transaction) => {
      const updated = await transaction.reservation.updateMany({
        where: { id: input.draftId, customerId: input.customerId, status: "DRAFT" },
        data: {
          customerNameSnapshot: input.fullName,
          customerEmailSnapshot: input.email,
          customerPhoneSnapshot: input.phone,
          nationalitySnapshot: input.nationality,
          addressSnapshot: input.address,
          emergencyContactNameSnapshot: input.emergencyContactName,
          emergencyContactPhoneSnapshot: input.emergencyContactPhone,
          customerDetailsCompletedAt: completedAt,
        },
      });
      if (!updated.count) return null;

      await transaction.user.update({
        where: { id: input.customerId },
        data: {
          nationality: input.nationality,
          address: input.address,
          emergencyContactName: input.emergencyContactName,
          emergencyContactPhone: input.emergencyContactPhone,
        },
      });
      await transaction.reservationEvent.create({
        data: {
          reservationId: input.draftId,
          fromStatus: "DRAFT",
          toStatus: "DRAFT",
          actorId: input.customerId,
          note: "Customer completed the contact-details step.",
        },
      });
      return true;
    });
    if (!saved) return null;

    return {
      draftId: input.draftId,
      reference: input.reference,
      fullName: input.fullName,
      emailMasked: maskEmail(input.email),
      phoneMasked: maskPhone(input.phone),
      nationality: input.nationality,
      address: input.address,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhoneMasked: maskPhone(input.emergencyContactPhone),
      completedAt: completedAt.toISOString(),
    };
  }

  async saveConsents(input: SaveConsentsInput): Promise<ReservationConsents | null> {
    const acceptedAt = new Date();
    const saved = await this.prisma.client.$transaction(async (transaction) => {
      const updated = await transaction.reservation.updateMany({
        where: {
          id: input.draftId,
          customerId: input.customerId,
          status: "DRAFT",
          customerDetailsCompletedAt: { not: null },
        },
        data: {
          termsVersion: input.policyVersion,
          termsAcceptedAt: acceptedAt,
          privacyConsentAt: acceptedAt,
          documentConsentAt: acceptedAt,
          operationalConsentAt: acceptedAt,
          marketingConsentAt: input.marketingAccepted ? acceptedAt : null,
        },
      });
      if (!updated.count) return false;

      await transaction.reservationEvent.create({
        data: {
          reservationId: input.draftId,
          fromStatus: "DRAFT",
          toStatus: "DRAFT",
          actorId: input.customerId,
          note: "Customer accepted the required policy bundle.",
          metadata: {
            policyVersion: input.policyVersion,
            marketingAccepted: input.marketingAccepted,
          },
        },
      });
      return true;
    });
    if (!saved) return null;

    return {
      draftId: input.draftId,
      reference: input.reference,
      policyVersion: input.policyVersion,
      requiredAcceptedAt: acceptedAt.toISOString(),
      marketingAccepted: input.marketingAccepted,
    };
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

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  return `${name?.slice(0, 2) || "**"}***@${domain ?? "***"}`;
}

function maskPhone(value: string) {
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}
