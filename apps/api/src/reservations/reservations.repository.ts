import { Injectable } from "@nestjs/common";
import type {
  ReservationConsents,
  ReservationCustomerDetails,
  ReservationDocumentType,
  ReservationDraft,
  SubmittedReservation,
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
  customerCategory: "EGYPTIAN" | "FOREIGN";
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
      select: {
        id: true,
        reference: true,
        driverRequested: true,
        customerCategorySnapshot: true,
        customerDetailsCompletedAt: true,
        documentConsentAt: true,
      },
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
          customerCategorySnapshot: input.customerCategory,
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
      customerCategory: input.customerCategory,
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

  findDocumentRequirementRules(customerCategory: "EGYPTIAN" | "FOREIGN") {
    return this.prisma.client.documentRequirementRule.findMany({
      where: { customerCategory, active: true },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      select: {
        key: true,
        documentType: true,
        requiresSelfDrive: true,
        labelAr: true,
        labelEn: true,
        allowedMimeTypes: true,
        maxSizeBytes: true,
      },
    });
  }

  findActiveDocuments(draftId: string) {
    return this.prisma.client.reservationDocument.findMany({
      where: { reservationId: draftId, status: { not: "DELETED" }, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        storageKey: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });
  }

  findOwnedDraftReview(draftId: string, customerId: string) {
    return this.prisma.client.reservation.findFirst({
      where: { id: draftId, customerId, status: "DRAFT" },
      select: {
        id: true,
        reference: true,
        pickupAt: true,
        returnAt: true,
        driverRequested: true,
        estimatedTotal: true,
        customerNameSnapshot: true,
        customerEmailSnapshot: true,
        customerPhoneSnapshot: true,
        nationalitySnapshot: true,
        customerCategorySnapshot: true,
        addressSnapshot: true,
        emergencyContactNameSnapshot: true,
        emergencyContactPhoneSnapshot: true,
        customerDetailsCompletedAt: true,
        termsVersion: true,
        termsAcceptedAt: true,
        privacyConsentAt: true,
        documentConsentAt: true,
        operationalConsentAt: true,
        marketingConsentAt: true,
        vehicle: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            active: true,
            archivedAt: true,
            status: true,
          },
        },
        branch: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });
  }

  async hasSubmissionConflict(vehicleId: string, pickupAt: Date, returnAt: Date) {
    const [block, booking] = await Promise.all([
      this.prisma.client.vehicleBlock.findFirst({
        where: { vehicleId, startsAt: { lt: returnAt }, endsAt: { gt: pickupAt } },
        select: { id: true },
      }),
      this.prisma.client.booking.findFirst({
        where: {
          vehicleId,
          status: { in: ["CONFIRMED", "ACTIVE"] },
          pickupAt: { lt: returnAt },
          returnAt: { gt: pickupAt },
        },
        select: { id: true },
      }),
    ]);
    return Boolean(block || booking);
  }

  async submitDraft(input: { draftId: string; customerId: string; locale: "ar" | "en" }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: { id: input.draftId, customerId: input.customerId },
        select: {
          id: true,
          reference: true,
          status: true,
          submittedAt: true,
          vehicleId: true,
          pickupAt: true,
          returnAt: true,
          driverRequested: true,
          customerDetailsCompletedAt: true,
          customerCategorySnapshot: true,
          termsVersion: true,
          termsAcceptedAt: true,
          privacyConsentAt: true,
          documentConsentAt: true,
          operationalConsentAt: true,
          customer: { select: { emailVerifiedAt: true, phoneVerifiedAt: true } },
          vehicle: { select: { active: true, archivedAt: true, status: true } },
        },
      });
      if (!reservation) return { kind: "NOT_FOUND" as const };
      if (reservation.status === "PENDING_REVIEW" && reservation.submittedAt) {
        return {
          kind: "SUBMITTED" as const,
          data: toSubmittedReservation(
            reservation.id,
            reservation.reference,
            reservation.submittedAt,
          ),
        };
      }
      if (reservation.status !== "DRAFT") return { kind: "INVALID_STATUS" as const };

      const requiredConsents = Boolean(
        reservation.termsVersion &&
        reservation.termsAcceptedAt &&
        reservation.privacyConsentAt &&
        reservation.documentConsentAt &&
        reservation.operationalConsentAt,
      );
      if (
        !reservation.customer.emailVerifiedAt ||
        !reservation.customer.phoneVerifiedAt ||
        !reservation.customerDetailsCompletedAt ||
        !reservation.customerCategorySnapshot ||
        !requiredConsents
      ) {
        return { kind: "NOT_READY" as const };
      }

      const policyCount = await transaction.policyVersion.count({
        where: {
          locale: input.locale,
          version: reservation.termsVersion!,
          policyKey: {
            in: ["RENTAL_TERMS", "PRIVACY", "DOCUMENT_PROCESSING", "RESERVATION_PROCESS"],
          },
          effectiveAt: { lte: new Date() },
          OR: [{ retiredAt: null }, { retiredAt: { gt: new Date() } }],
        },
      });
      if (reservation.termsVersion!.startsWith("DEV-") || policyCount !== 4) {
        return { kind: "POLICY_NOT_APPROVED" as const };
      }

      const rules = await transaction.documentRequirementRule.findMany({
        where: { customerCategory: reservation.customerCategorySnapshot, active: true },
        select: { documentType: true, requiresSelfDrive: true },
      });
      const requiredTypes = rules
        .filter((rule) => !rule.requiresSelfDrive || !reservation.driverRequested)
        .map((rule) => rule.documentType);
      const uploadedDocuments = await transaction.reservationDocument.findMany({
        where: {
          reservationId: reservation.id,
          type: { in: requiredTypes },
          status: { in: ["UPLOADED", "UNDER_REVIEW", "VERIFIED"] },
          deletedAt: null,
        },
        select: { type: true },
      });
      const uploadedTypes = new Set(uploadedDocuments.map((document) => document.type));
      if (!requiredTypes.length || requiredTypes.some((type) => !uploadedTypes.has(type))) {
        return { kind: "DOCUMENTS_INCOMPLETE" as const };
      }

      const [block, booking] = await Promise.all([
        transaction.vehicleBlock.findFirst({
          where: {
            vehicleId: reservation.vehicleId,
            startsAt: { lt: reservation.returnAt },
            endsAt: { gt: reservation.pickupAt },
          },
          select: { id: true },
        }),
        transaction.booking.findFirst({
          where: {
            vehicleId: reservation.vehicleId,
            status: { in: ["CONFIRMED", "ACTIVE"] },
            pickupAt: { lt: reservation.returnAt },
            returnAt: { gt: reservation.pickupAt },
          },
          select: { id: true },
        }),
      ]);
      if (
        !reservation.vehicle.active ||
        reservation.vehicle.archivedAt ||
        !["AVAILABLE", "PENDING_REQUEST"].includes(reservation.vehicle.status) ||
        reservation.pickupAt <= new Date() ||
        block ||
        booking
      ) {
        return { kind: "VEHICLE_UNAVAILABLE" as const };
      }

      const submittedAt = new Date();
      const updated = await transaction.reservation.updateMany({
        where: { id: reservation.id, customerId: input.customerId, status: "DRAFT" },
        data: { status: "PENDING_REVIEW", submittedAt },
      });
      if (!updated.count) return { kind: "INVALID_STATUS" as const };
      await transaction.reservationEvent.create({
        data: {
          reservationId: reservation.id,
          fromStatus: "DRAFT",
          toStatus: "PENDING_REVIEW",
          actorId: input.customerId,
          note: "Customer submitted the reservation request for sales review.",
        },
      });
      await transaction.notification.create({
        data: {
          userId: input.customerId,
          reservationId: reservation.id,
          eventKey: "RESERVATION_REQUEST_SUBMITTED",
          titleAr: "تم إرسال طلبك للمراجعة",
          titleEn: "Your request was submitted for review",
          bodyAr: `طلب ${reservation.reference} قيد مراجعة فريق المبيعات. هذا ليس حجزًا مؤكدًا.`,
          bodyEn: `Request ${reservation.reference} is awaiting sales review. This is not a confirmed booking.`,
          important: true,
        },
      });
      await transaction.notificationEvent.create({
        data: {
          eventKey: "RESERVATION_REQUEST_SUBMITTED",
          aggregateType: "RESERVATION",
          aggregateId: reservation.id,
          payload: {
            reservationId: reservation.id,
            reference: reservation.reference,
            customerId: input.customerId,
            locale: input.locale,
            status: "PENDING_REVIEW",
          },
        },
      });
      return {
        kind: "SUBMITTED" as const,
        data: toSubmittedReservation(reservation.id, reservation.reference, submittedAt),
      };
    });
  }

  findSalesQueue(actorId: string, canSeeAll: boolean) {
    return this.prisma.client.reservation.findMany({
      where: {
        status: { in: ["PENDING_REVIEW", "UNDER_REVIEW", "MORE_INFORMATION_REQUIRED"] },
        ...(canSeeAll
          ? {}
          : {
              OR: [
                { status: "PENDING_REVIEW", assignedSalesId: null },
                { assignedSalesId: actorId },
              ],
            }),
      },
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
      take: 100,
      select: salesQueueSelect,
    });
  }

  findSalesReview(id: string) {
    return this.prisma.client.reservation.findFirst({
      where: {
        id,
        status: { in: ["PENDING_REVIEW", "UNDER_REVIEW", "MORE_INFORMATION_REQUIRED"] },
      },
      select: {
        ...salesQueueSelect,
        nationalitySnapshot: true,
        customerCategorySnapshot: true,
        addressSnapshot: true,
        emergencyContactNameSnapshot: true,
        emergencyContactPhoneSnapshot: true,
        termsVersion: true,
        termsAcceptedAt: true,
        privacyConsentAt: true,
        documentConsentAt: true,
        operationalConsentAt: true,
        customer: {
          select: {
            email: true,
            phone: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
          },
        },
        documents: {
          where: { deletedAt: null, status: { notIn: ["UPLOADING", "DELETED"] } },
          orderBy: { createdAt: "desc" },
          select: { type: true, status: true, createdAt: true },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async claimSalesReview(input: { reservationId: string; actorId: string; locale: "ar" | "en" }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: {
          id: input.reservationId,
          status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
        },
        select: {
          id: true,
          reference: true,
          customerId: true,
          status: true,
          assignedSalesId: true,
        },
      });
      if (!reservation) return { kind: "NOT_FOUND" as const };
      if (reservation.status === "UNDER_REVIEW" && reservation.assignedSalesId === input.actorId) {
        return { kind: "CLAIMED" as const };
      }
      if (reservation.status !== "PENDING_REVIEW" || reservation.assignedSalesId) {
        return { kind: "ALREADY_ASSIGNED" as const };
      }

      const updated = await transaction.reservation.updateMany({
        where: {
          id: reservation.id,
          status: "PENDING_REVIEW",
          assignedSalesId: null,
        },
        data: { status: "UNDER_REVIEW", assignedSalesId: input.actorId },
      });
      if (!updated.count) return { kind: "ALREADY_ASSIGNED" as const };

      await transaction.reservationEvent.create({
        data: {
          reservationId: reservation.id,
          fromStatus: "PENDING_REVIEW",
          toStatus: "UNDER_REVIEW",
          actorId: input.actorId,
          note: "Sales employee claimed the request for review.",
        },
      });
      await transaction.notification.create({
        data: {
          userId: reservation.customerId,
          reservationId: reservation.id,
          eventKey: "RESERVATION_UNDER_REVIEW",
          titleAr: "بدأت مراجعة طلبك",
          titleEn: "Your request is under review",
          bodyAr: `بدأ فريق المبيعات مراجعة طلب ${reservation.reference}. هذا ليس حجزًا مؤكدًا بعد.`,
          bodyEn: `Sales started reviewing request ${reservation.reference}. This is not a confirmed booking yet.`,
          important: true,
        },
      });
      await transaction.notificationEvent.create({
        data: {
          eventKey: "RESERVATION_UNDER_REVIEW",
          aggregateType: "RESERVATION",
          aggregateId: reservation.id,
          payload: {
            reservationId: reservation.id,
            reference: reservation.reference,
            customerId: reservation.customerId,
            locale: input.locale,
            status: "UNDER_REVIEW",
          },
        },
      });
      return { kind: "CLAIMED" as const };
    });
  }

  async replaceDocument(input: {
    draftId: string;
    customerId: string;
    type: ReservationDocumentType;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const owned = await transaction.reservation.findFirst({
        where: { id: input.draftId, customerId: input.customerId, status: "DRAFT" },
        select: { id: true },
      });
      if (!owned) return null;

      const replaced = await transaction.reservationDocument.findMany({
        where: { reservationId: input.draftId, type: input.type, deletedAt: null },
        select: { storageKey: true },
      });
      await transaction.reservationDocument.updateMany({
        where: { reservationId: input.draftId, type: input.type, deletedAt: null },
        data: { status: "DELETED", deletedAt: new Date() },
      });
      const document = await transaction.reservationDocument.create({
        data: {
          reservationId: input.draftId,
          type: input.type,
          status: "UPLOADED",
          storageKey: input.storageKey,
          originalName: input.originalName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
        },
        select: { id: true },
      });
      await transaction.reservationEvent.create({
        data: {
          reservationId: input.draftId,
          fromStatus: "DRAFT",
          toStatus: "DRAFT",
          actorId: input.customerId,
          note: "Customer uploaded a required private document.",
          metadata: { documentType: input.type, replacement: replaced.length > 0 },
        },
      });
      return {
        documentId: document.id,
        replacedStorageKeys: replaced.map((item) => item.storageKey),
      };
    });
  }

  async deleteOwnedDocument(draftId: string, documentId: string, customerId: string) {
    return this.prisma.client.$transaction(async (transaction) => {
      const document = await transaction.reservationDocument.findFirst({
        where: {
          id: documentId,
          reservationId: draftId,
          deletedAt: null,
          reservation: { customerId, status: "DRAFT" },
        },
        select: { storageKey: true, type: true },
      });
      if (!document) return null;
      await transaction.reservationDocument.update({
        where: { id: documentId },
        data: { status: "DELETED", deletedAt: new Date() },
      });
      await transaction.reservationEvent.create({
        data: {
          reservationId: draftId,
          fromStatus: "DRAFT",
          toStatus: "DRAFT",
          actorId: customerId,
          note: "Customer removed a private document from the draft.",
          metadata: { documentType: document.type },
        },
      });
      return document;
    });
  }

  async deleteAllDraftDocuments(draftId: string, customerId: string) {
    return this.prisma.client.$transaction(async (transaction) => {
      const documents = await transaction.reservationDocument.findMany({
        where: {
          reservationId: draftId,
          deletedAt: null,
          reservation: { customerId, status: "DRAFT" },
        },
        select: { storageKey: true },
      });
      if (!documents.length) return [];
      await transaction.reservationDocument.updateMany({
        where: { reservationId: draftId, deletedAt: null },
        data: { status: "DELETED", deletedAt: new Date() },
      });
      await transaction.reservationEvent.create({
        data: {
          reservationId: draftId,
          fromStatus: "DRAFT",
          toStatus: "DRAFT",
          actorId: customerId,
          note: "Private documents were cleared after the customer category changed.",
        },
      });
      return documents.map((document) => document.storageKey);
    });
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

const salesQueueSelect = {
  id: true,
  reference: true,
  status: true,
  submittedAt: true,
  createdAt: true,
  pickupAt: true,
  returnAt: true,
  driverRequested: true,
  estimatedTotal: true,
  assignedSalesId: true,
  customerNameSnapshot: true,
  customerEmailSnapshot: true,
  customerPhoneSnapshot: true,
  vehicle: { select: { id: true, nameAr: true, nameEn: true } },
  branch: { select: { id: true, nameAr: true, nameEn: true } },
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

function toSubmittedReservation(
  id: string,
  reference: string,
  submittedAt: Date,
): SubmittedReservation {
  return { id, reference, status: "PENDING_REVIEW", submittedAt: submittedAt.toISOString() };
}
