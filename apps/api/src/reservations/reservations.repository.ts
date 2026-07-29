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

  findCustomerDrafts(customerId: string, now: Date) {
    return this.prisma.client.reservation.findMany({
      where: { customerId, status: "DRAFT", pickupAt: { gt: now } },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: customerDraftSelect,
    });
  }

  findCustomerDraft(id: string, customerId: string, now: Date) {
    return this.prisma.client.reservation.findFirst({
      where: { id, customerId, status: "DRAFT", pickupAt: { gt: now } },
      select: customerDraftSelect,
    });
  }

  async abandonCustomerDraft(id: string, customerId: string) {
    return this.prisma.client.$transaction(async (transaction) => {
      const draft = await transaction.reservation.findFirst({
        where: { id, customerId, status: "DRAFT" },
        select: {
          id: true,
          reference: true,
          documents: {
            where: { deletedAt: null, status: { not: "DELETED" } },
            select: { storageKey: true },
          },
        },
      });
      if (!draft) return null;

      const abandonedAt = new Date();
      const updated = await transaction.reservation.updateMany({
        where: { id, customerId, status: "DRAFT" },
        data: { status: "EXPIRED" },
      });
      if (!updated.count) return null;

      await transaction.reservationDocument.updateMany({
        where: { reservationId: id, deletedAt: null, status: { not: "DELETED" } },
        data: { status: "DELETED", deletedAt: abandonedAt },
      });
      await transaction.reservationEvent.create({
        data: {
          reservationId: id,
          fromStatus: "DRAFT",
          toStatus: "EXPIRED",
          actorId: customerId,
          note: "Customer abandoned the reservation draft.",
          metadata: { abandonedAt: abandonedAt.toISOString() },
        },
      });

      return {
        data: {
          id: draft.id,
          reference: draft.reference,
          status: "EXPIRED" as const,
          abandonedAt: abandonedAt.toISOString(),
        },
        storageKeys: draft.documents.map((document) => document.storageKey),
      };
    });
  }

  findOwnedDocumentContext(id: string, customerId: string) {
    return this.prisma.client.reservation.findFirst({
      where: { id, customerId, status: { in: ["DRAFT", "MORE_INFORMATION_REQUIRED"] } },
      select: {
        id: true,
        reference: true,
        status: true,
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
        status: {
          in: [
            "PENDING_REVIEW",
            "UNDER_REVIEW",
            "MORE_INFORMATION_REQUIRED",
            "PRE_APPROVED",
            "ALTERNATIVE_OFFERED",
            "CONFIRMED",
            "ACTIVE",
          ],
        },
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
        status: {
          in: [
            "PENDING_REVIEW",
            "UNDER_REVIEW",
            "MORE_INFORMATION_REQUIRED",
            "PRE_APPROVED",
            "ALTERNATIVE_OFFERED",
            "CONFIRMED",
            "ACTIVE",
          ],
        },
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
          select: {
            id: true,
            type: true,
            status: true,
            rejectionReason: true,
            createdAt: true,
          },
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
        alternativeOffers: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: alternativeOfferSelect,
        },
        branchAttendedAt: true,
        deposit: {
          select: {
            amount: true,
            receiptNumber: true,
            recordedAt: true,
          },
        },
        contracts: {
          where: { status: "SIGNED", storageKey: { not: null } },
          orderBy: { version: "desc" },
          take: 1,
          select: { status: true, signedAt: true },
        },
        deliveredAt: true,
        returnedAt: true,
        completedAt: true,
        booking: {
          select: {
            reference: true,
            status: true,
            confirmedAt: true,
            operations: {
              orderBy: { recordedAt: "asc" },
              select: {
                type: true,
                odometerKm: true,
                fuelLevelPercent: true,
                conditionNote: true,
                recordedAt: true,
              },
            },
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

  async decideSalesReview(input: {
    reservationId: string;
    actorId: string;
    canOverrideAssignment: boolean;
    locale: "ar" | "en";
    action: "REQUEST_INFORMATION" | "PRE_APPROVE" | "REJECT";
    note: string;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: { id: input.reservationId, status: "UNDER_REVIEW" },
        select: {
          id: true,
          reference: true,
          customerId: true,
          assignedSalesId: true,
        },
      });
      if (!reservation) return { kind: "NOT_FOUND" as const };
      if (!input.canOverrideAssignment && reservation.assignedSalesId !== input.actorId) {
        return { kind: "NOT_ASSIGNED" as const };
      }

      const status =
        input.action === "REQUEST_INFORMATION"
          ? ("MORE_INFORMATION_REQUIRED" as const)
          : input.action === "PRE_APPROVE"
            ? ("PRE_APPROVED" as const)
            : ("REJECTED" as const);
      const decidedAt = new Date();
      const expiresAt =
        input.action === "PRE_APPROVE" ? new Date(decidedAt.getTime() + 48 * 60 * 60 * 1000) : null;
      const updated = await transaction.reservation.updateMany({
        where: {
          id: reservation.id,
          status: "UNDER_REVIEW",
          ...(input.canOverrideAssignment ? {} : { assignedSalesId: input.actorId }),
        },
        data: {
          status,
          rejectionReason: input.action === "REJECT" ? input.note : null,
          preApprovalExpiresAt: expiresAt,
        },
      });
      if (!updated.count) return { kind: "NOT_ASSIGNED" as const };

      await transaction.reservationEvent.create({
        data: {
          reservationId: reservation.id,
          fromStatus: "UNDER_REVIEW",
          toStatus: status,
          actorId: input.actorId,
          note: `Sales recorded the ${input.action.toLowerCase()} decision.`,
          metadata: expiresAt
            ? { action: input.action, preApprovalExpiresAt: expiresAt.toISOString() }
            : { action: input.action },
        },
      });
      await transaction.customerMessage.create({
        data: {
          reservationId: reservation.id,
          senderId: input.actorId,
          body: input.note,
        },
      });

      const notificationCopy = salesDecisionNotification(input.action, reservation.reference);
      await transaction.notification.create({
        data: {
          userId: reservation.customerId,
          reservationId: reservation.id,
          eventKey: notificationCopy.eventKey,
          titleAr: notificationCopy.titleAr,
          titleEn: notificationCopy.titleEn,
          bodyAr: notificationCopy.bodyAr,
          bodyEn: notificationCopy.bodyEn,
          important: true,
        },
      });
      await transaction.notificationEvent.create({
        data: {
          eventKey: notificationCopy.eventKey,
          aggregateType: "RESERVATION",
          aggregateId: reservation.id,
          payload: {
            reservationId: reservation.id,
            reference: reservation.reference,
            customerId: reservation.customerId,
            locale: input.locale,
            status,
          },
        },
      });

      return {
        kind: "DECIDED" as const,
        data: {
          id: reservation.id,
          reference: reservation.reference,
          status,
          decidedAt: decidedAt.toISOString(),
          expiresAt: expiresAt?.toISOString() ?? null,
        },
      };
    });
  }

  async createAlternativeOffer(input: {
    reservationId: string;
    actorId: string;
    canOverrideAssignment: boolean;
    locale: "ar" | "en";
    vehicleId: string;
    pickupAt: Date;
    returnAt: Date;
    note: string;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: { id: input.reservationId, status: "UNDER_REVIEW" },
        select: {
          id: true,
          reference: true,
          customerId: true,
          branchId: true,
          assignedSalesId: true,
          driverRequested: true,
        },
      });
      if (!reservation) return { kind: "NOT_FOUND" as const };
      if (!input.canOverrideAssignment && reservation.assignedSalesId !== input.actorId) {
        return { kind: "NOT_ASSIGNED" as const };
      }

      const vehicle = await transaction.vehicle.findFirst({
        where: {
          id: input.vehicleId,
          branchId: reservation.branchId,
          active: true,
          archivedAt: null,
          status: "AVAILABLE",
        },
        select: {
          id: true,
          dailyRate: true,
          driverCharge: true,
          driverPolicy: true,
          minimumRentalDays: true,
        },
      });
      if (!vehicle) return { kind: "VEHICLE_UNAVAILABLE" as const };
      const rentalDays = Math.ceil(
        (input.returnAt.getTime() - input.pickupAt.getTime()) / 86400000,
      );
      if (rentalDays < vehicle.minimumRentalDays) return { kind: "INVALID_DATES" as const };
      if (reservation.driverRequested && vehicle.driverPolicy === "UNAVAILABLE") {
        return { kind: "DRIVER_UNAVAILABLE" as const };
      }

      const [block, booking] = await Promise.all([
        transaction.vehicleBlock.findFirst({
          where: {
            vehicleId: vehicle.id,
            startsAt: { lt: input.returnAt },
            endsAt: { gt: input.pickupAt },
          },
          select: { id: true },
        }),
        transaction.booking.findFirst({
          where: {
            vehicleId: vehicle.id,
            status: { in: ["CONFIRMED", "ACTIVE"] },
            pickupAt: { lt: input.returnAt },
            returnAt: { gt: input.pickupAt },
          },
          select: { id: true },
        }),
      ]);
      if (block || booking) return { kind: "VEHICLE_UNAVAILABLE" as const };

      const dailyRate = vehicle.dailyRate.toNumber();
      const driverRate = reservation.driverRequested ? (vehicle.driverCharge?.toNumber() ?? 0) : 0;
      const estimatedTotal = (dailyRate + driverRate) * rentalDays;
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const updated = await transaction.reservation.updateMany({
        where: {
          id: reservation.id,
          status: "UNDER_REVIEW",
          ...(input.canOverrideAssignment ? {} : { assignedSalesId: input.actorId }),
        },
        data: { status: "ALTERNATIVE_OFFERED" },
      });
      if (!updated.count) return { kind: "NOT_ASSIGNED" as const };

      await transaction.alternativeOffer.updateMany({
        where: { reservationId: reservation.id, status: "PENDING" },
        data: { status: "WITHDRAWN" },
      });
      const offer = await transaction.alternativeOffer.create({
        data: {
          reservationId: reservation.id,
          vehicleId: vehicle.id,
          createdById: input.actorId,
          proposedPickupAt: input.pickupAt,
          proposedReturnAt: input.returnAt,
          dailyRateSnapshot: dailyRate,
          driverRateSnapshot: reservation.driverRequested ? driverRate : null,
          estimatedTotal,
          note: input.note,
          expiresAt,
        },
        select: { id: true },
      });
      await transaction.customerMessage.create({
        data: { reservationId: reservation.id, senderId: input.actorId, body: input.note },
      });
      await transaction.reservationEvent.create({
        data: {
          reservationId: reservation.id,
          fromStatus: "UNDER_REVIEW",
          toStatus: "ALTERNATIVE_OFFERED",
          actorId: input.actorId,
          note: "Sales proposed an alternative vehicle or date range.",
          metadata: { offerId: offer.id, expiresAt: expiresAt.toISOString() },
        },
      });
      await transaction.notification.create({
        data: {
          userId: reservation.customerId,
          reservationId: reservation.id,
          eventKey: "RESERVATION_ALTERNATIVE_OFFERED",
          titleAr: "عرض بديل لطلبك",
          titleEn: "An alternative is available",
          bodyAr: `أرسل فريق رحال عرضًا بديلًا للطلب ${reservation.reference}. راجعه خلال 48 ساعة.`,
          bodyEn: `Rahal sent an alternative for request ${reservation.reference}. Review it within 48 hours.`,
          important: true,
        },
      });
      await transaction.notificationEvent.create({
        data: {
          eventKey: "RESERVATION_ALTERNATIVE_OFFERED",
          aggregateType: "RESERVATION",
          aggregateId: reservation.id,
          payload: {
            reservationId: reservation.id,
            offerId: offer.id,
            customerId: reservation.customerId,
            locale: input.locale,
            status: "ALTERNATIVE_OFFERED",
            expiresAt: expiresAt.toISOString(),
          },
        },
      });
      return {
        kind: "OFFERED" as const,
        data: {
          id: offer.id,
          reservationId: reservation.id,
          reservationStatus: "ALTERNATIVE_OFFERED" as const,
          expiresAt: expiresAt.toISOString(),
        },
      };
    });
  }

  async recordBranchChecklist(input: {
    reservationId: string;
    actorId: string;
    canOverrideAssignment: boolean;
    locale: "ar" | "en";
    depositAmountEgp: number;
    receiptNumber: string;
    note: string | null;
  }) {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        const reservation = await transaction.reservation.findFirst({
          where: { id: input.reservationId, status: "PRE_APPROVED" },
          select: {
            id: true,
            reference: true,
            customerId: true,
            assignedSalesId: true,
            preApprovalExpiresAt: true,
            branchAttendedAt: true,
            vehicle: { select: { depositAmount: true } },
            deposit: {
              select: { amount: true, receiptNumber: true, recordedAt: true },
            },
            contracts: {
              where: { status: "SIGNED", storageKey: { not: null } },
              orderBy: { version: "desc" },
              take: 1,
              select: { signedAt: true, storageKey: true },
            },
          },
        });
        if (!reservation) return { kind: "NOT_FOUND" as const };
        if (!input.canOverrideAssignment && reservation.assignedSalesId !== input.actorId) {
          return { kind: "NOT_ASSIGNED" as const };
        }
        if (
          !reservation.preApprovalExpiresAt ||
          reservation.preApprovalExpiresAt.getTime() <= Date.now()
        ) {
          return { kind: "PRE_APPROVAL_EXPIRED" as const };
        }
        const expectedDeposit = reservation.vehicle.depositAmount?.toNumber() ?? null;
        if (expectedDeposit === null) return { kind: "DEPOSIT_NOT_CONFIGURED" as const };
        if (expectedDeposit !== input.depositAmountEgp) {
          return { kind: "DEPOSIT_MISMATCH" as const, expectedDeposit };
        }

        const existingContract = reservation.contracts[0];
        if (!existingContract?.signedAt || !existingContract.storageKey) {
          return { kind: "SIGNED_CONTRACT_REQUIRED" as const };
        }
        if (reservation.deposit && existingContract?.signedAt && reservation.branchAttendedAt) {
          if (
            reservation.deposit.amount.toNumber() !== input.depositAmountEgp ||
            reservation.deposit.receiptNumber !== input.receiptNumber
          ) {
            return { kind: "ALREADY_RECORDED" as const };
          }
          return {
            kind: "RECORDED" as const,
            data: {
              id: reservation.id,
              reference: reservation.reference,
              status: "PRE_APPROVED" as const,
              attendedAt: reservation.branchAttendedAt.toISOString(),
              depositRecordedAt: reservation.deposit.recordedAt.toISOString(),
              contractSignedAt: existingContract.signedAt.toISOString(),
            },
          };
        }

        const recordedAt = new Date();
        const deposit = await transaction.deposit.upsert({
          where: { reservationId: reservation.id },
          create: {
            reservationId: reservation.id,
            amount: input.depositAmountEgp,
            receiptNumber: input.receiptNumber,
            recordedBy: input.actorId,
            recordedAt,
            notes: input.note,
          },
          update: {
            amount: input.depositAmountEgp,
            receiptNumber: input.receiptNumber,
            recordedBy: input.actorId,
            recordedAt,
            notes: input.note,
          },
          select: { recordedAt: true },
        });
        await transaction.reservation.update({
          where: { id: reservation.id },
          data: { branchAttendedAt: recordedAt },
        });
        await transaction.reservationEvent.create({
          data: {
            reservationId: reservation.id,
            fromStatus: "PRE_APPROVED",
            toStatus: "PRE_APPROVED",
            actorId: input.actorId,
            note: "Branch attendance and deposit receipt were recorded after contract validation.",
            metadata: {
              depositAmountEgp: input.depositAmountEgp,
              receiptNumber: input.receiptNumber,
              signedContractVerified: true,
            },
          },
        });
        await transaction.notification.create({
          data: {
            userId: reservation.customerId,
            reservationId: reservation.id,
            eventKey: "RESERVATION_DEPOSIT_RECORDED",
            titleAr: "تم تسجيل إجراءات الفرع",
            titleEn: "Branch requirements recorded",
            bodyAr: `تم تسجيل الحضور والعربون والعقد الموقع للطلب ${reservation.reference}. الحجز لم يتأكد نهائيًا بعد.`,
            bodyEn: `Attendance, deposit, and the signed contract were recorded for ${reservation.reference}. The booking is not final yet.`,
            important: true,
          },
        });
        await transaction.notificationEvent.create({
          data: {
            eventKey: "RESERVATION_DEPOSIT_RECORDED",
            aggregateType: "RESERVATION",
            aggregateId: reservation.id,
            payload: {
              reservationId: reservation.id,
              reference: reservation.reference,
              customerId: reservation.customerId,
              locale: input.locale,
              status: "PRE_APPROVED",
            },
          },
        });
        return {
          kind: "RECORDED" as const,
          data: {
            id: reservation.id,
            reference: reservation.reference,
            status: "PRE_APPROVED" as const,
            attendedAt: recordedAt.toISOString(),
            depositRecordedAt: deposit.recordedAt.toISOString(),
            contractSignedAt: existingContract.signedAt.toISOString(),
          },
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return { kind: "RECEIPT_IN_USE" as const };
      throw error;
    }
  }

  async recordSignedContract(input: {
    reservationId: string;
    actorId: string;
    canOverrideAssignment: boolean;
    storageKey: string;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: { id: input.reservationId, status: "PRE_APPROVED" },
        select: {
          id: true,
          reference: true,
          assignedSalesId: true,
          preApprovalExpiresAt: true,
          contracts: {
            where: { status: "SIGNED", storageKey: { not: null } },
            take: 1,
            select: { id: true },
          },
        },
      });
      if (!reservation) return { kind: "NOT_FOUND" as const };
      if (!input.canOverrideAssignment && reservation.assignedSalesId !== input.actorId) {
        return { kind: "NOT_ASSIGNED" as const };
      }
      if (
        !reservation.preApprovalExpiresAt ||
        reservation.preApprovalExpiresAt.getTime() <= Date.now()
      ) {
        return { kind: "PRE_APPROVAL_EXPIRED" as const };
      }
      if (reservation.contracts.length) return { kind: "ALREADY_RECORDED" as const };

      const signedAt = new Date();
      await transaction.contract.upsert({
        where: {
          reservationId_version: {
            reservationId: reservation.id,
            version: 1,
          },
        },
        create: {
          reservationId: reservation.id,
          version: 1,
          status: "SIGNED",
          storageKey: input.storageKey,
          signedAt,
          recordedById: input.actorId,
        },
        update: {
          status: "SIGNED",
          storageKey: input.storageKey,
          signedAt,
          recordedById: input.actorId,
        },
      });
      await transaction.reservationEvent.create({
        data: {
          reservationId: reservation.id,
          fromStatus: "PRE_APPROVED",
          toStatus: "PRE_APPROVED",
          actorId: input.actorId,
          note: "A signed branch contract was stored in protected document storage.",
          metadata: { contractVersion: 1 },
        },
      });
      return {
        kind: "RECORDED" as const,
        data: {
          id: reservation.id,
          reference: reservation.reference,
          status: "SIGNED" as const,
          signedAt: signedAt.toISOString(),
        },
      };
    });
  }

  async confirmBooking(input: {
    reservationId: string;
    actorId: string;
    canOverrideAssignment: boolean;
    locale: "ar" | "en";
  }) {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        const reservation = await transaction.reservation.findFirst({
          where: { id: input.reservationId, status: { in: ["PRE_APPROVED", "CONFIRMED"] } },
          select: {
            id: true,
            reference: true,
            customerId: true,
            assignedSalesId: true,
            vehicleId: true,
            branchId: true,
            pickupAt: true,
            returnAt: true,
            driverRequested: true,
            vehicleRateSnapshot: true,
            driverRateSnapshot: true,
            estimatedTotal: true,
            preApprovalExpiresAt: true,
            branchAttendedAt: true,
            status: true,
            deposit: { select: { id: true } },
            contracts: {
              where: { status: "SIGNED", signedAt: { not: null }, storageKey: { not: null } },
              orderBy: { version: "desc" },
              take: 1,
              select: { id: true },
            },
            booking: {
              select: { id: true, reference: true, status: true, confirmedAt: true },
            },
          },
        });
        if (!reservation) return { kind: "NOT_FOUND" as const };
        if (!input.canOverrideAssignment && reservation.assignedSalesId !== input.actorId) {
          return { kind: "NOT_ASSIGNED" as const };
        }
        if (reservation.booking) {
          return {
            kind: "CONFIRMED" as const,
            data: {
              id: reservation.id,
              reference: reservation.reference,
              status: "CONFIRMED" as const,
              booking: {
                id: reservation.booking.id,
                reference: reservation.booking.reference,
                status: "CONFIRMED" as const,
                confirmedAt: reservation.booking.confirmedAt.toISOString(),
              },
            },
          };
        }
        if (
          !reservation.preApprovalExpiresAt ||
          reservation.preApprovalExpiresAt.getTime() <= Date.now()
        ) {
          return { kind: "PRE_APPROVAL_EXPIRED" as const };
        }
        if (
          !reservation.branchAttendedAt ||
          !reservation.deposit ||
          !reservation.contracts.length
        ) {
          return { kind: "BRANCH_REQUIREMENTS_INCOMPLETE" as const };
        }
        const [block, bookingConflict] = await Promise.all([
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
        if (block || bookingConflict) return { kind: "VEHICLE_UNAVAILABLE" as const };

        const confirmedAt = new Date();
        const updated = await transaction.reservation.updateMany({
          where: { id: reservation.id, status: "PRE_APPROVED" },
          data: {
            status: "CONFIRMED",
            confirmedAt,
            finalTotal: reservation.estimatedTotal,
            preApprovalExpiresAt: null,
          },
        });
        if (!updated.count) return { kind: "VEHICLE_UNAVAILABLE" as const };

        const rentalDays = Math.ceil(
          (reservation.returnAt.getTime() - reservation.pickupAt.getTime()) / 86_400_000,
        );
        const vehicleSubtotal = reservation.vehicleRateSnapshot.toNumber() * rentalDays;
        const driverSubtotal = reservation.driverRequested
          ? (reservation.driverRateSnapshot?.toNumber() ?? 0) * rentalDays
          : 0;
        const booking = await transaction.booking.create({
          data: {
            reference: `BKG-${reservation.reference.replace(/^RHL-/, "")}`,
            reservationId: reservation.id,
            customerId: reservation.customerId,
            vehicleId: reservation.vehicleId,
            branchId: reservation.branchId,
            status: "CONFIRMED",
            pickupAt: reservation.pickupAt,
            returnAt: reservation.returnAt,
            confirmedAt,
            priceSnapshot: {
              create: {
                currency: "EGP",
                rentalDays,
                vehicleSubtotal,
                driverSubtotal,
                grandTotal: reservation.estimatedTotal,
                items: {
                  create: [
                    {
                      code: "VEHICLE_RENTAL",
                      description: "Vehicle rental",
                      quantity: rentalDays,
                      unitAmount: reservation.vehicleRateSnapshot,
                      totalAmount: vehicleSubtotal,
                      sortOrder: 1,
                    },
                    ...(reservation.driverRequested
                      ? [
                          {
                            code: "DRIVER",
                            description: "Driver service",
                            quantity: rentalDays,
                            unitAmount: reservation.driverRateSnapshot ?? 0,
                            totalAmount: driverSubtotal,
                            sortOrder: 2,
                          },
                        ]
                      : []),
                  ],
                },
              },
            },
          },
          select: { id: true, reference: true, confirmedAt: true },
        });
        await transaction.contract.updateMany({
          where: { reservationId: reservation.id, status: "SIGNED" },
          data: { bookingId: booking.id },
        });
        await transaction.reservationEvent.create({
          data: {
            reservationId: reservation.id,
            fromStatus: "PRE_APPROVED",
            toStatus: "CONFIRMED",
            actorId: input.actorId,
            note: "Authorized staff confirmed the booking after branch requirements.",
            metadata: { bookingId: booking.id, bookingReference: booking.reference },
          },
        });
        await transaction.notification.create({
          data: {
            userId: reservation.customerId,
            reservationId: reservation.id,
            eventKey: "RESERVATION_BOOKING_CONFIRMED",
            titleAr: "تم تأكيد حجزك",
            titleEn: "Your booking is confirmed",
            bodyAr: `تم تأكيد الحجز ${booking.reference} للطلب ${reservation.reference}. ستجد التفاصيل داخل حسابك.`,
            bodyEn: `Booking ${booking.reference} is confirmed for request ${reservation.reference}. View the details in your account.`,
            important: true,
          },
        });
        await transaction.notificationEvent.create({
          data: {
            eventKey: "RESERVATION_BOOKING_CONFIRMED",
            aggregateType: "RESERVATION",
            aggregateId: reservation.id,
            payload: {
              reservationId: reservation.id,
              bookingId: booking.id,
              reference: reservation.reference,
              bookingReference: booking.reference,
              customerId: reservation.customerId,
              locale: input.locale,
              status: "CONFIRMED",
            },
          },
        });
        return {
          kind: "CONFIRMED" as const,
          data: {
            id: reservation.id,
            reference: reservation.reference,
            status: "CONFIRMED" as const,
            booking: {
              id: booking.id,
              reference: booking.reference,
              status: "CONFIRMED" as const,
              confirmedAt: booking.confirmedAt.toISOString(),
            },
          },
        };
      });
    } catch (error) {
      if (isBookingConflictError(error)) return { kind: "VEHICLE_UNAVAILABLE" as const };
      throw error;
    }
  }

  async recordBookingOperation(input: {
    reservationId: string;
    actorId: string;
    canOverrideAssignment: boolean;
    locale: "ar" | "en";
    action: "DELIVER" | "RETURN" | "COMPLETE" | "CANCEL" | "NO_SHOW";
    odometerKm: number | null;
    fuelLevelPercent: number | null;
    note: string;
  }) {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        const reservation = await transaction.reservation.findFirst({
          where: {
            id: input.reservationId,
            status: { in: ["CONFIRMED", "ACTIVE"] },
          },
          select: {
            id: true,
            reference: true,
            customerId: true,
            vehicleId: true,
            assignedSalesId: true,
            status: true,
            pickupAt: true,
            returnedAt: true,
            booking: {
              select: {
                id: true,
                reference: true,
                status: true,
                operations: {
                  orderBy: { recordedAt: "asc" },
                  select: {
                    type: true,
                    odometerKm: true,
                    fuelLevelPercent: true,
                    recordedAt: true,
                  },
                },
              },
            },
          },
        });
        if (!reservation?.booking) return { kind: "NOT_FOUND" as const };
        if (!input.canOverrideAssignment && reservation.assignedSalesId !== input.actorId) {
          return { kind: "NOT_ASSIGNED" as const };
        }

        const delivery = reservation.booking.operations.find(
          (operation) => operation.type === "DELIVERY",
        );
        const vehicleReturn = reservation.booking.operations.find(
          (operation) => operation.type === "RETURN",
        );
        const recordedAt = new Date();
        let nextStatus: "ACTIVE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
        let expectedReservationStatus: "CONFIRMED" | "ACTIVE";
        let expectedBookingStatus: "CONFIRMED" | "ACTIVE";

        if (input.action === "DELIVER") {
          if (
            reservation.status !== "CONFIRMED" ||
            reservation.booking.status !== "CONFIRMED" ||
            delivery ||
            input.odometerKm === null ||
            input.fuelLevelPercent === null
          ) {
            return { kind: "INVALID_TRANSITION" as const };
          }
          nextStatus = "ACTIVE";
          expectedReservationStatus = "CONFIRMED";
          expectedBookingStatus = "CONFIRMED";
        } else if (input.action === "RETURN") {
          if (
            reservation.status !== "ACTIVE" ||
            reservation.booking.status !== "ACTIVE" ||
            !delivery ||
            vehicleReturn ||
            input.odometerKm === null ||
            input.fuelLevelPercent === null
          ) {
            return { kind: "INVALID_TRANSITION" as const };
          }
          if (input.odometerKm < delivery.odometerKm) {
            return { kind: "INVALID_ODOMETER" as const };
          }
          nextStatus = "ACTIVE";
          expectedReservationStatus = "ACTIVE";
          expectedBookingStatus = "ACTIVE";
        } else if (input.action === "COMPLETE") {
          if (
            reservation.status !== "ACTIVE" ||
            reservation.booking.status !== "ACTIVE" ||
            !vehicleReturn ||
            !reservation.returnedAt
          ) {
            return { kind: "INVALID_TRANSITION" as const };
          }
          nextStatus = "COMPLETED";
          expectedReservationStatus = "ACTIVE";
          expectedBookingStatus = "ACTIVE";
        } else if (input.action === "CANCEL") {
          if (reservation.status !== "CONFIRMED" || reservation.booking.status !== "CONFIRMED") {
            return { kind: "INVALID_TRANSITION" as const };
          }
          nextStatus = "CANCELLED";
          expectedReservationStatus = "CONFIRMED";
          expectedBookingStatus = "CONFIRMED";
        } else {
          if (reservation.status !== "CONFIRMED" || reservation.booking.status !== "CONFIRMED") {
            return { kind: "INVALID_TRANSITION" as const };
          }
          if (recordedAt < reservation.pickupAt) return { kind: "TOO_EARLY" as const };
          nextStatus = "NO_SHOW";
          expectedReservationStatus = "CONFIRMED";
          expectedBookingStatus = "CONFIRMED";
        }

        const reservationUpdate = await transaction.reservation.updateMany({
          where: { id: reservation.id, status: expectedReservationStatus },
          data: {
            status: nextStatus,
            ...(input.action === "DELIVER" ? { deliveredAt: recordedAt } : {}),
            ...(input.action === "RETURN" ? { returnedAt: recordedAt } : {}),
            ...(input.action === "COMPLETE" ? { completedAt: recordedAt } : {}),
            ...(["CANCEL", "NO_SHOW"].includes(input.action)
              ? { cancellationReason: input.note }
              : {}),
          },
        });
        const bookingUpdate = await transaction.booking.updateMany({
          where: { id: reservation.booking.id, status: expectedBookingStatus },
          data: {
            status: nextStatus,
            ...(input.action === "DELIVER" ? { activatedAt: recordedAt } : {}),
            ...(input.action === "COMPLETE" ? { completedAt: recordedAt } : {}),
            ...(["CANCEL", "NO_SHOW"].includes(input.action) ? { cancelledAt: recordedAt } : {}),
          },
        });
        if (!reservationUpdate.count || !bookingUpdate.count) {
          throw new BookingOperationRaceError();
        }

        if (input.action === "DELIVER" || input.action === "RETURN") {
          await transaction.bookingOperation.create({
            data: {
              bookingId: reservation.booking.id,
              type: input.action === "DELIVER" ? "DELIVERY" : "RETURN",
              odometerKm: input.odometerKm!,
              fuelLevelPercent: input.fuelLevelPercent!,
              conditionNote: input.note,
              actorId: input.actorId,
              recordedAt,
            },
          });
        }
        if (input.action === "DELIVER") {
          const vehicleUpdated = await transaction.vehicle.updateMany({
            where: {
              id: reservation.vehicleId,
              status: { in: ["AVAILABLE", "CONFIRMED_BOOKING"] },
            },
            data: { status: "RENTED" },
          });
          if (!vehicleUpdated.count) throw new VehicleOperationUnavailableError();
        }
        if (input.action === "COMPLETE") {
          await transaction.vehicle.updateMany({
            where: { id: reservation.vehicleId, status: "RENTED" },
            data: { status: "AVAILABLE" },
          });
        }

        await transaction.reservationEvent.create({
          data: {
            reservationId: reservation.id,
            fromStatus: expectedReservationStatus,
            toStatus: nextStatus,
            actorId: input.actorId,
            note: `Sales recorded the ${input.action.toLowerCase()} operation.`,
            metadata: {
              action: input.action,
              bookingId: reservation.booking.id,
              ...(input.odometerKm === null ? {} : { odometerKm: input.odometerKm }),
              ...(input.fuelLevelPercent === null
                ? {}
                : { fuelLevelPercent: input.fuelLevelPercent }),
            },
          },
        });
        const notificationCopy = bookingOperationNotification(
          input.action,
          reservation.reference,
          reservation.booking.reference,
        );
        await transaction.notification.create({
          data: {
            userId: reservation.customerId,
            reservationId: reservation.id,
            eventKey: notificationCopy.eventKey,
            titleAr: notificationCopy.titleAr,
            titleEn: notificationCopy.titleEn,
            bodyAr: notificationCopy.bodyAr,
            bodyEn: notificationCopy.bodyEn,
            important: true,
          },
        });
        await transaction.notificationEvent.create({
          data: {
            eventKey: notificationCopy.eventKey,
            aggregateType: "BOOKING",
            aggregateId: reservation.booking.id,
            payload: {
              reservationId: reservation.id,
              bookingId: reservation.booking.id,
              customerId: reservation.customerId,
              locale: input.locale,
              action: input.action,
              status: nextStatus,
            },
          },
        });
        return {
          kind: "RECORDED" as const,
          data: {
            id: reservation.id,
            reference: reservation.reference,
            status: nextStatus,
            action: input.action,
            recordedAt: recordedAt.toISOString(),
          },
        };
      });
    } catch (error) {
      if (error instanceof VehicleOperationUnavailableError) {
        return { kind: "VEHICLE_UNAVAILABLE" as const };
      }
      if (error instanceof BookingOperationRaceError || isUniqueConstraintError(error)) {
        return { kind: "INVALID_TRANSITION" as const };
      }
      throw error;
    }
  }

  findCustomerRequests(customerId: string) {
    return this.prisma.client.reservation.findMany({
      where: { customerId, submittedAt: { not: null }, status: { not: "DRAFT" } },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: customerRequestSummarySelect,
    });
  }

  findCustomerRequest(id: string, customerId: string) {
    return this.prisma.client.reservation.findFirst({
      where: { id, customerId, submittedAt: { not: null }, status: { not: "DRAFT" } },
      select: {
        ...customerRequestSummarySelect,
        documents: {
          where: { deletedAt: null, status: { notIn: ["UPLOADING", "DELETED"] } },
          orderBy: { createdAt: "asc" },
          select: { id: true, type: true, status: true, rejectionReason: true },
        },
        customerMessages: {
          orderBy: { createdAt: "asc" },
          take: 100,
          select: {
            id: true,
            body: true,
            createdAt: true,
            sender: { select: { systemRole: true } },
          },
        },
        alternativeOffers: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: alternativeOfferSelect,
        },
        branchAttendedAt: true,
        deposit: { select: { id: true } },
        contracts: {
          where: { status: "SIGNED", signedAt: { not: null }, storageKey: { not: null } },
          take: 1,
          select: { id: true },
        },
        booking: {
          select: { reference: true, confirmedAt: true },
        },
        deliveredAt: true,
        returnedAt: true,
        completedAt: true,
      },
    });
  }

  async respondToInformationRequest(input: {
    reservationId: string;
    customerId: string;
    locale: "ar" | "en";
    message: string;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const reservation = await transaction.reservation.findFirst({
        where: {
          id: input.reservationId,
          customerId: input.customerId,
          status: "MORE_INFORMATION_REQUIRED",
        },
        select: {
          id: true,
          reference: true,
          assignedSalesId: true,
        },
      });
      if (!reservation) return { kind: "NOT_FOUND" as const };

      const rejectedDocuments = await transaction.reservationDocument.count({
        where: {
          reservationId: input.reservationId,
          status: "REJECTED",
          deletedAt: null,
        },
      });
      if (rejectedDocuments > 0) {
        return { kind: "DOCUMENT_REPLACEMENT_REQUIRED" as const };
      }

      const respondedAt = new Date();
      const updated = await transaction.reservation.updateMany({
        where: {
          id: reservation.id,
          customerId: input.customerId,
          status: "MORE_INFORMATION_REQUIRED",
        },
        data: { status: "UNDER_REVIEW" },
      });
      if (!updated.count) return { kind: "INVALID_STATUS" as const };

      await transaction.customerMessage.create({
        data: {
          reservationId: reservation.id,
          senderId: input.customerId,
          body: input.message,
        },
      });
      await transaction.reservationEvent.create({
        data: {
          reservationId: reservation.id,
          fromStatus: "MORE_INFORMATION_REQUIRED",
          toStatus: "UNDER_REVIEW",
          actorId: input.customerId,
          note: "Customer supplied the requested additional information.",
        },
      });

      if (reservation.assignedSalesId) {
        await transaction.notification.create({
          data: {
            userId: reservation.assignedSalesId,
            reservationId: reservation.id,
            eventKey: "RESERVATION_CUSTOMER_RESPONDED",
            titleAr: "رد العميل على طلب المعلومات",
            titleEn: "Customer responded to the information request",
            bodyAr: `أرسل العميل ردًا جديدًا على طلب ${reservation.reference}.`,
            bodyEn: `The customer sent a new response for request ${reservation.reference}.`,
            important: true,
          },
        });
      }
      await transaction.notificationEvent.create({
        data: {
          eventKey: "RESERVATION_CUSTOMER_RESPONDED",
          aggregateType: "RESERVATION",
          aggregateId: reservation.id,
          payload: {
            reservationId: reservation.id,
            reference: reservation.reference,
            userId: reservation.assignedSalesId,
            assignedSalesId: reservation.assignedSalesId,
            locale: input.locale,
            status: "UNDER_REVIEW",
          },
        },
      });

      return {
        kind: "RESPONDED" as const,
        data: {
          id: reservation.id,
          reference: reservation.reference,
          status: "UNDER_REVIEW" as const,
          respondedAt: respondedAt.toISOString(),
        },
      };
    });
  }

  async respondToAlternativeOffer(input: {
    reservationId: string;
    customerId: string;
    locale: "ar" | "en";
    action: "ACCEPT" | "DECLINE";
  }) {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        const reservation = await transaction.reservation.findFirst({
          where: {
            id: input.reservationId,
            customerId: input.customerId,
            status: "ALTERNATIVE_OFFERED",
          },
          select: {
            id: true,
            reference: true,
            assignedSalesId: true,
            driverRequested: true,
            alternativeOffers: {
              where: { status: "PENDING" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                vehicleId: true,
                proposedPickupAt: true,
                proposedReturnAt: true,
                dailyRateSnapshot: true,
                driverRateSnapshot: true,
                estimatedTotal: true,
                expiresAt: true,
              },
            },
          },
        });
        const offer = reservation?.alternativeOffers[0];
        if (!reservation || !offer) return { kind: "NOT_FOUND" as const };
        const respondedAt = new Date();
        if (offer.expiresAt <= respondedAt) {
          await transaction.alternativeOffer.updateMany({
            where: { id: offer.id, status: "PENDING" },
            data: { status: "EXPIRED" },
          });
          await transaction.reservation.updateMany({
            where: { id: reservation.id, status: "ALTERNATIVE_OFFERED" },
            data: { status: "UNDER_REVIEW" },
          });
          return { kind: "EXPIRED" as const };
        }

        if (input.action === "ACCEPT") {
          const [block, booking] = await Promise.all([
            transaction.vehicleBlock.findFirst({
              where: {
                vehicleId: offer.vehicleId,
                startsAt: { lt: offer.proposedReturnAt },
                endsAt: { gt: offer.proposedPickupAt },
              },
              select: { id: true },
            }),
            transaction.booking.findFirst({
              where: {
                vehicleId: offer.vehicleId,
                status: { in: ["CONFIRMED", "ACTIVE"] },
                pickupAt: { lt: offer.proposedReturnAt },
                returnAt: { gt: offer.proposedPickupAt },
              },
              select: { id: true },
            }),
          ]);
          if (block || booking) return { kind: "VEHICLE_UNAVAILABLE" as const };
        }

        const offerStatus =
          input.action === "ACCEPT" ? ("ACCEPTED" as const) : ("DECLINED" as const);
        const offerUpdated = await transaction.alternativeOffer.updateMany({
          where: { id: offer.id, status: "PENDING", expiresAt: { gt: respondedAt } },
          data: { status: offerStatus, respondedAt },
        });
        if (!offerUpdated.count) throw new AlternativeOfferRaceError();
        const reservationUpdated = await transaction.reservation.updateMany({
          where: {
            id: reservation.id,
            customerId: input.customerId,
            status: "ALTERNATIVE_OFFERED",
          },
          data:
            input.action === "ACCEPT"
              ? {
                  status: "UNDER_REVIEW",
                  vehicleId: offer.vehicleId,
                  pickupAt: offer.proposedPickupAt,
                  returnAt: offer.proposedReturnAt,
                  vehicleRateSnapshot: offer.dailyRateSnapshot,
                  driverRateSnapshot: offer.driverRateSnapshot,
                  estimatedTotal: offer.estimatedTotal,
                }
              : { status: "UNDER_REVIEW" },
        });
        if (!reservationUpdated.count) throw new AlternativeOfferRaceError();
        await transaction.reservationEvent.create({
          data: {
            reservationId: reservation.id,
            fromStatus: "ALTERNATIVE_OFFERED",
            toStatus: "UNDER_REVIEW",
            actorId: input.customerId,
            note: `Customer ${offerStatus.toLowerCase()} the alternative offer.`,
            metadata: { offerId: offer.id, response: offerStatus },
          },
        });
        if (reservation.assignedSalesId) {
          await transaction.notification.create({
            data: {
              userId: reservation.assignedSalesId,
              reservationId: reservation.id,
              eventKey: "RESERVATION_ALTERNATIVE_RESPONDED",
              titleAr: "رد العميل على العرض البديل",
              titleEn: "Customer responded to the alternative",
              bodyAr: `رد العميل على العرض البديل للطلب ${reservation.reference}.`,
              bodyEn: `The customer responded to the alternative for request ${reservation.reference}.`,
              important: true,
            },
          });
        }
        await transaction.notificationEvent.create({
          data: {
            eventKey: "RESERVATION_ALTERNATIVE_RESPONDED",
            aggregateType: "RESERVATION",
            aggregateId: reservation.id,
            payload: {
              reservationId: reservation.id,
              offerId: offer.id,
              userId: reservation.assignedSalesId,
              assignedSalesId: reservation.assignedSalesId,
              locale: input.locale,
              response: offerStatus,
              status: "UNDER_REVIEW",
            },
          },
        });
        return {
          kind: "RESPONDED" as const,
          data: {
            id: offer.id,
            reservationId: reservation.id,
            offerStatus,
            reservationStatus: "UNDER_REVIEW" as const,
            respondedAt: respondedAt.toISOString(),
          },
        };
      });
    } catch (error) {
      if (error instanceof AlternativeOfferRaceError) {
        return { kind: "INVALID_STATUS" as const };
      }
      throw error;
    }
  }

  async expireStaleReviewWindows(now: Date) {
    return this.prisma.client.$transaction(async (transaction) => {
      const dueDrafts = await transaction.reservation.findMany({
        where: { status: "DRAFT", pickupAt: { lte: now } },
        orderBy: { pickupAt: "asc" },
        take: 100,
        select: {
          id: true,
          documents: {
            where: { deletedAt: null, status: { not: "DELETED" } },
            select: { storageKey: true },
          },
        },
      });
      let expiredDrafts = 0;
      const removedDraftStorageKeys: string[] = [];
      for (const draft of dueDrafts) {
        const updated = await transaction.reservation.updateMany({
          where: { id: draft.id, status: "DRAFT", pickupAt: { lte: now } },
          data: { status: "EXPIRED" },
        });
        if (!updated.count) continue;
        expiredDrafts += 1;
        removedDraftStorageKeys.push(...draft.documents.map((document) => document.storageKey));
        await transaction.reservationDocument.updateMany({
          where: {
            reservationId: draft.id,
            deletedAt: null,
            status: { not: "DELETED" },
          },
          data: { status: "DELETED", deletedAt: now },
        });
        await transaction.reservationEvent.create({
          data: {
            reservationId: draft.id,
            fromStatus: "DRAFT",
            toStatus: "EXPIRED",
            note: "The unsubmitted draft expired when its pickup time passed.",
            metadata: { expiredAt: now.toISOString() },
          },
        });
      }

      const dueOffers = await transaction.alternativeOffer.findMany({
        where: { status: "PENDING", expiresAt: { lte: now } },
        orderBy: { expiresAt: "asc" },
        take: 100,
        select: {
          id: true,
          reservation: {
            select: {
              id: true,
              reference: true,
              customerId: true,
              assignedSalesId: true,
              customer: { select: { preferredLocale: true } },
            },
          },
        },
      });
      let expiredOffers = 0;
      for (const offer of dueOffers) {
        const offerUpdated = await transaction.alternativeOffer.updateMany({
          where: { id: offer.id, status: "PENDING", expiresAt: { lte: now } },
          data: { status: "EXPIRED" },
        });
        if (!offerUpdated.count) continue;
        const reservationUpdated = await transaction.reservation.updateMany({
          where: { id: offer.reservation.id, status: "ALTERNATIVE_OFFERED" },
          data: { status: "UNDER_REVIEW" },
        });
        if (!reservationUpdated.count) continue;
        expiredOffers += 1;
        await transaction.reservationEvent.create({
          data: {
            reservationId: offer.reservation.id,
            fromStatus: "ALTERNATIVE_OFFERED",
            toStatus: "UNDER_REVIEW",
            note: "The alternative offer expired and returned to sales review.",
            metadata: { offerId: offer.id, expiredAt: now.toISOString() },
          },
        });
        await transaction.notification.create({
          data: {
            userId: offer.reservation.customerId,
            reservationId: offer.reservation.id,
            eventKey: "RESERVATION_ALTERNATIVE_EXPIRED",
            titleAr: "انتهت صلاحية العرض البديل",
            titleEn: "Alternative offer expired",
            bodyAr: `انتهت صلاحية العرض البديل للطلب ${offer.reservation.reference} وعاد الطلب للمراجعة.`,
            bodyEn: `The alternative for request ${offer.reservation.reference} expired and returned to review.`,
            important: true,
          },
        });
        if (offer.reservation.assignedSalesId) {
          await transaction.notification.create({
            data: {
              userId: offer.reservation.assignedSalesId,
              reservationId: offer.reservation.id,
              eventKey: "RESERVATION_ALTERNATIVE_EXPIRED_STAFF",
              titleAr: "انتهت صلاحية عرض بديل",
              titleEn: "An alternative offer expired",
              bodyAr: `عاد الطلب ${offer.reservation.reference} إلى قائمة المراجعة.`,
              bodyEn: `Request ${offer.reservation.reference} returned to the review queue.`,
              important: true,
            },
          });
        }
        await transaction.notificationEvent.create({
          data: {
            eventKey: "RESERVATION_ALTERNATIVE_EXPIRED",
            aggregateType: "RESERVATION",
            aggregateId: offer.reservation.id,
            payload: {
              reservationId: offer.reservation.id,
              offerId: offer.id,
              customerId: offer.reservation.customerId,
              assignedSalesId: offer.reservation.assignedSalesId,
              locale: offer.reservation.customer.preferredLocale,
              status: "UNDER_REVIEW",
            },
          },
        });
        if (offer.reservation.assignedSalesId) {
          await transaction.notificationEvent.create({
            data: {
              eventKey: "RESERVATION_ALTERNATIVE_EXPIRED_STAFF",
              aggregateType: "RESERVATION",
              aggregateId: offer.reservation.id,
              payload: {
                reservationId: offer.reservation.id,
                offerId: offer.id,
                userId: offer.reservation.assignedSalesId,
                assignedSalesId: offer.reservation.assignedSalesId,
                locale: offer.reservation.customer.preferredLocale,
                status: "UNDER_REVIEW",
              },
            },
          });
        }
      }

      const duePreApprovals = await transaction.reservation.findMany({
        where: { status: "PRE_APPROVED", preApprovalExpiresAt: { lte: now } },
        orderBy: { preApprovalExpiresAt: "asc" },
        take: 100,
        select: {
          id: true,
          reference: true,
          customerId: true,
          preApprovalExpiresAt: true,
          customer: { select: { preferredLocale: true } },
        },
      });
      let expiredPreApprovals = 0;
      for (const reservation of duePreApprovals) {
        const updated = await transaction.reservation.updateMany({
          where: {
            id: reservation.id,
            status: "PRE_APPROVED",
            preApprovalExpiresAt: { lte: now },
          },
          data: { status: "EXPIRED" },
        });
        if (!updated.count) continue;
        expiredPreApprovals += 1;
        await transaction.reservationEvent.create({
          data: {
            reservationId: reservation.id,
            fromStatus: "PRE_APPROVED",
            toStatus: "EXPIRED",
            note: "The 48-hour pre-approval window expired.",
            metadata: { expiredAt: now.toISOString() },
          },
        });
        await transaction.notification.create({
          data: {
            userId: reservation.customerId,
            reservationId: reservation.id,
            eventKey: "RESERVATION_PRE_APPROVAL_EXPIRED",
            titleAr: "انتهت مدة الموافقة المبدئية",
            titleEn: "Pre-approval expired",
            bodyAr: `انتهت مدة الموافقة المبدئية للطلب ${reservation.reference} دون تأكيد نهائي في الفرع.`,
            bodyEn: `The pre-approval for request ${reservation.reference} expired without final branch confirmation.`,
            important: true,
          },
        });
        await transaction.notificationEvent.create({
          data: {
            eventKey: "RESERVATION_PRE_APPROVAL_EXPIRED",
            aggregateType: "RESERVATION",
            aggregateId: reservation.id,
            payload: {
              reservationId: reservation.id,
              customerId: reservation.customerId,
              locale: reservation.customer.preferredLocale,
              status: "EXPIRED",
            },
          },
        });
      }

      return {
        expiredDrafts,
        expiredOffers,
        expiredPreApprovals,
        removedDraftStorageKeys,
      };
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
        where: {
          id: input.draftId,
          customerId: input.customerId,
          status: { in: ["DRAFT", "MORE_INFORMATION_REQUIRED"] },
        },
        select: { id: true, status: true },
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
          fromStatus: owned.status,
          toStatus: owned.status,
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

  findSalesDocument(reservationId: string, documentId: string) {
    return this.prisma.client.reservationDocument.findFirst({
      where: {
        id: documentId,
        reservationId,
        deletedAt: null,
        status: { in: ["UPLOADED", "UNDER_REVIEW", "VERIFIED", "REJECTED"] },
        reservation: {
          status: {
            in: [
              "PENDING_REVIEW",
              "UNDER_REVIEW",
              "MORE_INFORMATION_REQUIRED",
              "PRE_APPROVED",
              "ALTERNATIVE_OFFERED",
              "CONFIRMED",
              "ACTIVE",
            ],
          },
        },
      },
      select: {
        id: true,
        reservationId: true,
        type: true,
        status: true,
        storageKey: true,
        mimeType: true,
        reservation: {
          select: {
            assignedSalesId: true,
            status: true,
          },
        },
      },
    });
  }

  async recordDocumentAccess(input: {
    documentId: string;
    actorId: string;
    action: string;
    reason: string;
    ipHash?: string;
    succeeded: boolean;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.documentAccessLog.create({ data: input });
      if (input.succeeded) {
        await transaction.reservationDocument.updateMany({
          where: { id: input.documentId, status: "UPLOADED" },
          data: { status: "UNDER_REVIEW" },
        });
      }
    });
  }

  findSignedContract(reservationId: string) {
    return this.prisma.client.contract.findFirst({
      where: {
        reservationId,
        status: "SIGNED",
        storageKey: { not: null },
        reservation: {
          status: { in: ["PRE_APPROVED", "CONFIRMED", "ACTIVE", "COMPLETED"] },
        },
      },
      orderBy: { version: "desc" },
      select: {
        id: true,
        storageKey: true,
        reservation: { select: { assignedSalesId: true } },
      },
    });
  }

  recordContractAccess(input: {
    contractId: string;
    actorId: string;
    action: string;
    reason: string;
    ipHash?: string;
    succeeded: boolean;
  }) {
    return this.prisma.client.contractAccessLog.create({ data: input });
  }

  async reviewSalesDocument(input: {
    reservationId: string;
    documentId: string;
    actorId: string;
    action: "VERIFY" | "REJECT";
    reason: string;
    ipHash?: string;
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const document = await transaction.reservationDocument.findFirst({
        where: {
          id: input.documentId,
          reservationId: input.reservationId,
          deletedAt: null,
          status:
            input.action === "VERIFY"
              ? { in: ["UPLOADED", "UNDER_REVIEW", "REJECTED"] }
              : { in: ["UPLOADED", "UNDER_REVIEW"] },
        },
        select: { id: true, type: true, status: true },
      });
      if (!document) return null;

      const reviewedAt = new Date();
      const recentPreview = await transaction.documentAccessLog.findFirst({
        where: {
          documentId: document.id,
          actorId: input.actorId,
          action: "VIEW_INLINE",
          succeeded: true,
          createdAt: { gte: new Date(reviewedAt.getTime() - 15 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (!recentPreview) {
        return { kind: "PREVIEW_REQUIRED" as const };
      }
      const status = input.action === "VERIFY" ? ("VERIFIED" as const) : ("REJECTED" as const);
      await transaction.reservationDocument.update({
        where: { id: document.id },
        data: {
          status,
          verifiedBy: input.actorId,
          verifiedAt: reviewedAt,
          rejectionReason: input.action === "REJECT" ? input.reason : null,
        },
      });
      await transaction.documentAccessLog.create({
        data: {
          documentId: document.id,
          actorId: input.actorId,
          action: input.action === "VERIFY" ? "REVIEW_VERIFY" : "REVIEW_REJECT",
          reason: input.reason,
          ipHash: input.ipHash,
          succeeded: true,
        },
      });
      const reservation = await transaction.reservation.findUniqueOrThrow({
        where: { id: input.reservationId },
        select: {
          reference: true,
          customerId: true,
          status: true,
          customer: { select: { preferredLocale: true } },
        },
      });
      await transaction.reservationEvent.create({
        data: {
          reservationId: input.reservationId,
          fromStatus: reservation.status,
          toStatus:
            input.action === "REJECT" &&
            ["PENDING_REVIEW", "UNDER_REVIEW"].includes(reservation.status)
              ? "MORE_INFORMATION_REQUIRED"
              : reservation.status,
          actorId: input.actorId,
          note:
            input.action === "VERIFY"
              ? "Sales verified a protected customer document."
              : "Sales rejected a protected customer document and requested a replacement.",
          metadata: { documentType: document.type, reviewAction: input.action },
        },
      });

      if (input.action === "REJECT") {
        await transaction.reservation.updateMany({
          where: {
            id: input.reservationId,
            status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] },
          },
          data: { status: "MORE_INFORMATION_REQUIRED" },
        });
        await transaction.customerMessage.create({
          data: {
            reservationId: input.reservationId,
            senderId: input.actorId,
            body: input.reason,
          },
        });
        await transaction.notification.create({
          data: {
            userId: reservation.customerId,
            reservationId: input.reservationId,
            eventKey: "RESERVATION_DOCUMENT_REPLACEMENT_REQUIRED",
            titleAr: "مطلوب استبدال مستند",
            titleEn: "Document replacement required",
            bodyAr: `راجع طلب ${reservation.reference} وارفع بديلاً للمستند المرفوض.`,
            bodyEn: `Review request ${reservation.reference} and upload a replacement for the rejected document.`,
            important: true,
          },
        });
        await transaction.notificationEvent.create({
          data: {
            eventKey: "RESERVATION_DOCUMENT_REPLACEMENT_REQUIRED",
            aggregateType: "RESERVATION",
            aggregateId: input.reservationId,
            payload: {
              reservationId: input.reservationId,
              customerId: reservation.customerId,
              locale: reservation.customer.preferredLocale,
              documentType: document.type,
              status: "MORE_INFORMATION_REQUIRED",
            },
          },
        });
      }

      return {
        kind: "REVIEWED" as const,
        data: {
          documentId: document.id,
          reservationId: input.reservationId,
          status,
          reviewedAt,
        },
      };
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

const customerDraftSelect = {
  id: true,
  reference: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  pickupAt: true,
  returnAt: true,
  driverRequested: true,
  estimatedTotal: true,
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
  vehicle: { select: { id: true, nameAr: true, nameEn: true } },
  branch: { select: { id: true, nameAr: true, nameEn: true } },
  documents: {
    where: { deletedAt: null, status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    select: { type: true, status: true },
  },
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
  vehicle: { select: { id: true, nameAr: true, nameEn: true, depositAmount: true } },
  branch: { select: { id: true, nameAr: true, nameEn: true } },
} as const;

const customerRequestSummarySelect = {
  id: true,
  reference: true,
  status: true,
  submittedAt: true,
  createdAt: true,
  pickupAt: true,
  returnAt: true,
  driverRequested: true,
  estimatedTotal: true,
  preApprovalExpiresAt: true,
  vehicle: { select: { id: true, nameAr: true, nameEn: true } },
  branch: { select: { id: true, nameAr: true, nameEn: true } },
} as const;

const alternativeOfferSelect = {
  id: true,
  status: true,
  proposedPickupAt: true,
  proposedReturnAt: true,
  dailyRateSnapshot: true,
  driverRateSnapshot: true,
  estimatedTotal: true,
  note: true,
  expiresAt: true,
  respondedAt: true,
  vehicle: { select: { id: true, nameAr: true, nameEn: true } },
} as const;

class AlternativeOfferRaceError extends Error {}
class BookingOperationRaceError extends Error {}
class VehicleOperationUnavailableError extends Error {}

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

function isBookingConflictError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && ["P2002", "P2034", "23P01"].includes(String(error.code))) return true;
  const message = "message" in error ? String(error.message) : "";
  return message.includes("Booking_vehicle_period_no_overlap");
}

function bookingOperationNotification(
  action: "DELIVER" | "RETURN" | "COMPLETE" | "CANCEL" | "NO_SHOW",
  requestReference: string,
  bookingReference: string,
) {
  if (action === "DELIVER") {
    return {
      eventKey: "BOOKING_DELIVERED",
      titleAr: "بدأت رحلتك مع رحال",
      titleEn: "Your Rahal rental is active",
      bodyAr: `تم تسجيل تسليم السيارة للحجز ${bookingReference}. نتمنى لك رحلة آمنة.`,
      bodyEn: `Vehicle delivery was recorded for ${bookingReference}. Have a safe journey.`,
    };
  }
  if (action === "RETURN") {
    return {
      eventKey: "BOOKING_RETURN_RECORDED",
      titleAr: "تم تسجيل إرجاع السيارة",
      titleEn: "Vehicle return recorded",
      bodyAr: `تم تسجيل إرجاع السيارة للحجز ${bookingReference} وجارٍ إكمال إجراءات الفرع.`,
      bodyEn: `The vehicle return was recorded for ${bookingReference}. Branch completion is in progress.`,
    };
  }
  if (action === "COMPLETE") {
    return {
      eventKey: "BOOKING_COMPLETED",
      titleAr: "اكتملت رحلتك مع رحال",
      titleEn: "Your Rahal rental is complete",
      bodyAr: `تم إكمال الحجز ${bookingReference}. شكرًا لاختيارك رحال.`,
      bodyEn: `Booking ${bookingReference} is complete. Thank you for choosing Rahal.`,
    };
  }
  if (action === "CANCEL") {
    return {
      eventKey: "BOOKING_CANCELLED",
      titleAr: "تم إلغاء الحجز",
      titleEn: "Booking cancelled",
      bodyAr: `تم إلغاء الحجز ${bookingReference}. راجع تفاصيل الطلب ${requestReference} داخل حسابك.`,
      bodyEn: `Booking ${bookingReference} was cancelled. Review request ${requestReference} in your account.`,
    };
  }
  return {
    eventKey: "BOOKING_NO_SHOW",
    titleAr: "تم إغلاق الحجز لعدم الحضور",
    titleEn: "Booking closed as no-show",
    bodyAr: `تم إغلاق الحجز ${bookingReference} لعدم الحضور إلى الفرع في الموعد.`,
    bodyEn: `Booking ${bookingReference} was closed because branch attendance was not recorded at pickup.`,
  };
}

function salesDecisionNotification(
  action: "REQUEST_INFORMATION" | "PRE_APPROVE" | "REJECT",
  reference: string,
) {
  if (action === "REQUEST_INFORMATION") {
    return {
      eventKey: "RESERVATION_INFORMATION_REQUIRED",
      titleAr: "معلومات إضافية مطلوبة",
      titleEn: "More information is required",
      bodyAr: `يحتاج فريق المبيعات معلومات إضافية لمتابعة طلب ${reference}. هذا ليس حجزًا مؤكدًا.`,
      bodyEn: `Sales needs more information to continue request ${reference}. This is not a confirmed booking.`,
    };
  }
  if (action === "PRE_APPROVE") {
    return {
      eventKey: "RESERVATION_PRE_APPROVED",
      titleAr: "موافقة مبدئية على الطلب",
      titleEn: "Request pre-approved",
      bodyAr: `حصل طلب ${reference} على موافقة مبدئية مؤقتة. التأكيد النهائي يتم في فرع رحال.`,
      bodyEn: `Request ${reference} is temporarily pre-approved. Final confirmation happens at the Rahal branch.`,
    };
  }
  return {
    eventKey: "RESERVATION_REJECTED",
    titleAr: "تحديث على طلبك",
    titleEn: "An update on your request",
    bodyAr: `تعذر متابعة طلب ${reference}. راجع رسالة فريق المبيعات داخل حسابك.`,
    bodyEn: `Request ${reference} cannot proceed. Review the sales message in your account.`,
  };
}

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
