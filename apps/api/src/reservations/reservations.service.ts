import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  CustomerAlternativeOfferResponse,
  CustomerInformationResponse,
  CustomerReservationDetail,
  CustomerReservationStatus,
  CustomerReservationSummary,
  ReservationConsentBundle,
  ReservationConsents,
  ReservationCustomerDetails,
  ReservationDocumentChecklist,
  ReservationDocumentType,
  ReservationDraft,
  ReservationReview,
  ReservationAlternativeOffer,
  ReservationSubmissionBlocker,
  SalesAlternativeOfferResult,
  SalesBranchChecklistResult,
  SalesBookingConfirmationResult,
  SalesBookingOperationResult,
  SalesDocumentReviewResult,
  SalesReservationQueueItem,
  SalesReservationDecisionResult,
  SalesReservationReview,
  SubmittedReservation,
} from "@rahal/contracts";
import { basename } from "node:path";
import { AuthService } from "../auth/auth.service";
import { StaffAccessService } from "../staff/staff-access.service";
import { PrivateDocumentStorage } from "./private-document-storage";
import type {
  CustomerAlternativeOfferDecisionDto,
  CustomerInformationResponseDto,
  SaveReservationCustomerDetailsDto,
  SaveReservationConsentsDto,
  SaveReservationDraftDto,
  SalesAlternativeOfferDto,
  SalesBranchChecklistDto,
  SalesBookingOperationDto,
  SalesDocumentAccessDto,
  SalesDocumentReviewDto,
  SalesReservationDecisionDto,
} from "./reservations.dto";
import { ReservationsRepository } from "./reservations.repository";

const dayMs = 24 * 60 * 60 * 1000;
const requiredPolicyKeys = [
  "RENTAL_TERMS",
  "PRIVACY",
  "DOCUMENT_PROCESSING",
  "RESERVATION_PROCESS",
] as const;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly auth: AuthService,
    private readonly reservations: ReservationsRepository,
    private readonly documentStorage: PrivateDocumentStorage = new PrivateDocumentStorage(),
    @Optional() private readonly staffAccess?: StaffAccessService,
  ) {}

  async saveDraft(
    token: string | undefined,
    input: SaveReservationDraftDto,
  ): Promise<ReservationDraft> {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("Only customer accounts can create reservation drafts.");
    }

    const pickupAt = parseDate(input.pickupDate);
    const returnAt = parseDate(input.returnDate);
    const today = parseDate(new Date().toISOString().slice(0, 10));
    if (pickupAt.getTime() <= today.getTime()) {
      throw new BadRequestException("Pickup date must be in the future.");
    }

    const rentalDays = Math.round((returnAt.getTime() - pickupAt.getTime()) / dayMs);
    if (rentalDays <= 0) throw new BadRequestException("Return date must be after pickup date.");

    const vehicle = await this.reservations.findVehicle(input.vehicleId);
    if (!vehicle) throw new NotFoundException("The selected vehicle is unavailable.");
    if (rentalDays < vehicle.minimumRentalDays) {
      throw new BadRequestException(
        `This vehicle requires at least ${vehicle.minimumRentalDays} days.`,
      );
    }
    if (input.driverRequested && vehicle.driverPolicy === "UNAVAILABLE") {
      throw new BadRequestException("A driver is not available for this vehicle.");
    }
    if (!input.driverRequested && vehicle.driverPolicy === "MANDATORY") {
      throw new BadRequestException("This vehicle requires a driver.");
    }

    return this.reservations.saveDraft({
      customerId: session.user.id,
      vehicle,
      pickupAt,
      returnAt,
      driverRequested: input.driverRequested,
      rentalDays,
    });
  }

  async saveCustomerDetails(
    token: string | undefined,
    draftId: string,
    input: SaveReservationCustomerDetailsDto,
  ): Promise<ReservationCustomerDetails> {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("Only customer accounts can update reservation drafts.");
    }

    const draft = await this.reservations.findOwnedDraft(draftId, session.user.id);
    if (!draft) throw new NotFoundException("The reservation draft was not found.");

    const saved = await this.reservations.saveCustomerDetails({
      draftId,
      reference: draft.reference,
      customerId: session.user.id,
      fullName: session.user.fullName,
      email: session.user.email,
      phone: session.user.phone,
      nationality: input.nationality.trim(),
      customerCategory: input.customerCategory,
      address: input.address.trim(),
      emergencyContactName: input.emergencyContactName.trim(),
      emergencyContactPhone: input.emergencyContactPhone,
    });
    if (!saved) throw new NotFoundException("The reservation draft was not found.");
    if (
      draft.customerCategorySnapshot &&
      draft.customerCategorySnapshot !== input.customerCategory
    ) {
      const removedKeys = await this.reservations.deleteAllDraftDocuments(draftId, session.user.id);
      await Promise.allSettled(removedKeys.map((key) => this.documentStorage.remove(key)));
    }
    return saved;
  }

  async getConsentBundle(locale: string): Promise<ReservationConsentBundle> {
    if (locale !== "ar" && locale !== "en") {
      throw new BadRequestException("Locale must be ar or en.");
    }
    const records = await this.reservations.findConsentPolicies(locale);
    const policies = requiredPolicyKeys.map((key) =>
      records.find((record) => record.policyKey === key),
    );
    if (policies.some((policy) => !policy)) {
      throw new ServiceUnavailableException("The required policy bundle is not configured.");
    }
    const versions = new Set(policies.map((policy) => policy?.version));
    if (versions.size !== 1) {
      throw new ServiceUnavailableException("The active policy bundle versions do not match.");
    }
    const version = policies[0]?.version ?? "";
    return {
      version,
      developmentOnly: version.startsWith("DEV-"),
      policies: policies.map((policy, index) => ({
        key: requiredPolicyKeys[index],
        title: policy?.title ?? "",
        body: policy?.body ?? "",
      })),
    };
  }

  async saveConsents(
    token: string | undefined,
    draftId: string,
    input: SaveReservationConsentsDto,
  ): Promise<ReservationConsents> {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("Only customer accounts can update reservation drafts.");
    }
    const draft = await this.reservations.findOwnedDraft(draftId, session.user.id);
    if (!draft) throw new NotFoundException("The reservation draft was not found.");
    if (!draft.customerDetailsCompletedAt) {
      throw new ConflictException("Customer details must be completed before consent.");
    }

    const bundle = await this.getConsentBundle(session.user.preferredLocale);
    if (input.policyVersion !== bundle.version) {
      throw new ConflictException("The policy version changed. Review the current policies again.");
    }

    const saved = await this.reservations.saveConsents({
      draftId,
      reference: draft.reference,
      customerId: session.user.id,
      policyVersion: bundle.version,
      marketingAccepted: input.marketingAccepted,
    });
    if (!saved) throw new ConflictException("Complete customer details before consent.");
    return saved;
  }

  async getDocumentChecklist(
    token: string | undefined,
    draftId: string,
  ): Promise<ReservationDocumentChecklist> {
    const { session, draft } = await this.getDocumentContext(token, draftId);
    const rules = await this.reservations.findDocumentRequirementRules(
      draft.customerCategorySnapshot,
    );
    const applicableRules = rules.filter(
      (rule) => !rule.requiresSelfDrive || !draft.driverRequested,
    );
    if (!applicableRules.length) {
      throw new ServiceUnavailableException("Document requirement rules are not configured.");
    }
    const documents = await this.reservations.findActiveDocuments(draftId);
    const requirements = applicableRules.map((rule) => {
      const document = documents.find((item) => item.type === rule.documentType);
      const uploaded = Boolean(
        document && ["UPLOADED", "UNDER_REVIEW", "VERIFIED"].includes(document.status),
      );
      return {
        key: rule.key,
        type: rule.documentType as ReservationDocumentType,
        label: session.user.preferredLocale === "ar" ? rule.labelAr : rule.labelEn,
        allowedMimeTypes: rule.allowedMimeTypes,
        maxSizeBytes: rule.maxSizeBytes,
        uploaded,
        ...(document
          ? {
              document: {
                id: document.id,
                type: document.type as ReservationDocumentType,
                originalName: document.originalName,
                mimeType: document.mimeType,
                sizeBytes: document.sizeBytes,
                status: document.status as "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED",
                uploadedAt: document.createdAt.toISOString(),
              },
            }
          : {}),
      };
    });
    return {
      draftId,
      reference: draft.reference,
      developmentRules: true,
      requirements,
      complete: requirements.every((requirement) => requirement.uploaded),
    };
  }

  async uploadDocument(
    token: string | undefined,
    draftId: string,
    type: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
  ) {
    const { session, draft } = await this.getDocumentContext(token, draftId);
    if (!file?.buffer?.length) throw new BadRequestException("A document file is required.");
    const rules = await this.reservations.findDocumentRequirementRules(
      draft.customerCategorySnapshot,
    );
    const rule = rules.find(
      (item) => item.documentType === type && (!item.requiresSelfDrive || !draft.driverRequested),
    );
    if (!rule) throw new BadRequestException("This document type is not required for the draft.");
    if (!rule.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("Only approved JPEG, PNG, or PDF documents are allowed.");
    }
    if (file.size < 1 || file.size > rule.maxSizeBytes) {
      throw new BadRequestException("The document exceeds the allowed file size.");
    }
    if (!matchesFileSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException("The document content does not match its file type.");
    }

    const documentType = rule.documentType as ReservationDocumentType;
    if (draft.status === "MORE_INFORMATION_REQUIRED") {
      const existing = await this.reservations.findActiveDocuments(draftId);
      if (
        !existing.some(
          (document) => document.type === documentType && document.status === "REJECTED",
        )
      ) {
        throw new ForbiddenException("Only a rejected document can be replaced after submission.");
      }
    }
    const storageKey = await this.documentStorage.put(draftId, file.mimetype, file.buffer);
    let saved;
    try {
      saved = await this.reservations.replaceDocument({
        draftId,
        customerId: session.user.id,
        type: documentType,
        storageKey,
        originalName: safeOriginalName(file.originalname),
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
    } catch (error) {
      await this.documentStorage.remove(storageKey);
      throw error;
    }
    if (!saved) {
      await this.documentStorage.remove(storageKey);
      throw new NotFoundException("The reservation draft was not found.");
    }
    await Promise.allSettled(
      saved.replacedStorageKeys.map((key) => this.documentStorage.remove(key)),
    );
    return this.getDocumentChecklist(token, draftId);
  }

  async deleteDocument(token: string | undefined, draftId: string, documentId: string) {
    const { session } = await this.getDocumentContext(token, draftId);
    const deleted = await this.reservations.deleteOwnedDocument(
      draftId,
      documentId,
      session.user.id,
    );
    if (!deleted) throw new NotFoundException("The private document was not found.");
    await this.documentStorage.remove(deleted.storageKey);
    return this.getDocumentChecklist(token, draftId);
  }

  async getReview(token: string | undefined, draftId: string): Promise<ReservationReview> {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("Only customer accounts can review reservation drafts.");
    }
    const draft = await this.reservations.findOwnedDraftReview(draftId, session.user.id);
    if (!draft) throw new NotFoundException("The reservation draft was not found.");

    const rules = draft.customerCategorySnapshot
      ? await this.reservations.findDocumentRequirementRules(draft.customerCategorySnapshot)
      : [];
    const applicableRules = rules.filter(
      (rule) => !rule.requiresSelfDrive || !draft.driverRequested,
    );
    const storedDocuments = await this.reservations.findActiveDocuments(draftId);
    const documents = applicableRules.map((rule) => {
      const document = storedDocuments.find((item) => item.type === rule.documentType);
      const reviewableStatus =
        document && ["UPLOADED", "UNDER_REVIEW", "VERIFIED", "REJECTED"].includes(document.status)
          ? (document.status as "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED")
          : null;
      return {
        type: rule.documentType as ReservationDocumentType,
        label: session.user.preferredLocale === "ar" ? rule.labelAr : rule.labelEn,
        status: reviewableStatus ?? ("MISSING" as const),
      };
    });
    const documentsComplete =
      documents.length > 0 &&
      documents.every((document) =>
        ["UPLOADED", "UNDER_REVIEW", "VERIFIED"].includes(document.status),
      );
    const requiredAccepted = Boolean(
      draft.termsVersion &&
      draft.termsAcceptedAt &&
      draft.privacyConsentAt &&
      draft.documentConsentAt &&
      draft.operationalConsentAt,
    );
    let approvedPolicy: boolean;
    try {
      const bundle = await this.getConsentBundle(session.user.preferredLocale);
      approvedPolicy = Boolean(
        requiredAccepted && !bundle.developmentOnly && draft.termsVersion === bundle.version,
      );
    } catch {
      approvedPolicy = false;
    }
    const vehicleConflict = await this.reservations.hasSubmissionConflict(
      draft.vehicle.id,
      draft.pickupAt,
      draft.returnAt,
    );
    const vehicleAvailable = Boolean(
      draft.vehicle.active &&
      !draft.vehicle.archivedAt &&
      ["AVAILABLE", "PENDING_REQUEST"].includes(draft.vehicle.status) &&
      draft.pickupAt > new Date() &&
      !vehicleConflict,
    );
    const blockers: ReservationSubmissionBlocker[] = [];
    if (!session.user.emailVerified) blockers.push("EMAIL_VERIFICATION_REQUIRED");
    if (!session.user.phoneVerified) blockers.push("PHONE_VERIFICATION_REQUIRED");
    if (!draft.customerDetailsCompletedAt) blockers.push("CUSTOMER_DETAILS_REQUIRED");
    if (!requiredAccepted) blockers.push("REQUIRED_CONSENTS_REQUIRED");
    if (!approvedPolicy) blockers.push("APPROVED_POLICY_REQUIRED");
    if (!documentsComplete) blockers.push("REQUIRED_DOCUMENTS_REQUIRED");
    if (!vehicleAvailable) blockers.push("VEHICLE_UNAVAILABLE");

    const locale = session.user.preferredLocale;
    return {
      draftId: draft.id,
      reference: draft.reference,
      status: "DRAFT",
      vehicle: {
        id: draft.vehicle.id,
        name: locale === "ar" ? draft.vehicle.nameAr : draft.vehicle.nameEn,
      },
      branch: {
        id: draft.branch.id,
        name: locale === "ar" ? draft.branch.nameAr : draft.branch.nameEn,
      },
      pickupAt: draft.pickupAt.toISOString(),
      returnAt: draft.returnAt.toISOString(),
      driverRequested: draft.driverRequested,
      estimate: {
        currency: "EGP",
        total: draft.estimatedTotal.toNumber(),
        finalAmountConfirmedAtBranch: true,
      },
      customer: {
        fullName: draft.customerNameSnapshot ?? session.user.fullName,
        emailMasked: maskEmail(draft.customerEmailSnapshot ?? session.user.email),
        phoneMasked: maskPhone(draft.customerPhoneSnapshot ?? session.user.phone),
        nationality: draft.nationalitySnapshot,
        customerCategory: draft.customerCategorySnapshot,
        addressMasked: maskText(draft.addressSnapshot),
        emergencyContactNameMasked: maskName(draft.emergencyContactNameSnapshot),
        emergencyContactPhoneMasked: draft.emergencyContactPhoneSnapshot
          ? maskPhone(draft.emergencyContactPhoneSnapshot)
          : null,
      },
      verification: {
        email: session.user.emailVerified,
        phone: session.user.phoneVerified,
      },
      documents,
      consents: {
        policyVersion: draft.termsVersion,
        requiredAccepted,
        marketingAccepted: Boolean(draft.marketingConsentAt),
      },
      blockers,
      canSubmit: blockers.length === 0,
    };
  }

  async submitReservation(
    token: string | undefined,
    draftId: string,
  ): Promise<SubmittedReservation> {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("Only customer accounts can submit reservation requests.");
    }
    const result = await this.reservations.submitDraft({
      draftId,
      customerId: session.user.id,
      locale: session.user.preferredLocale,
    });
    if (result.kind === "SUBMITTED") return result.data;
    if (result.kind === "NOT_FOUND") {
      throw new NotFoundException("The reservation draft was not found.");
    }
    if (result.kind === "POLICY_NOT_APPROVED") {
      throw new ConflictException("Approved production policies are required before submission.");
    }
    if (result.kind === "DOCUMENTS_INCOMPLETE") {
      throw new ConflictException("Every required document must be uploaded before submission.");
    }
    if (result.kind === "VEHICLE_UNAVAILABLE") {
      throw new ConflictException("The selected vehicle is no longer available for these dates.");
    }
    if (result.kind === "INVALID_STATUS") {
      throw new ConflictException("The reservation is no longer an editable draft.");
    }
    throw new ConflictException("Complete verification and every required step before submission.");
  }

  async getSalesQueue(token: string | undefined): Promise<SalesReservationQueueItem[]> {
    const session = await this.requireStaffPermission(token, "reservations.view");
    const canSeeAll = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
    const records = await this.reservations.findSalesQueue(session.user.id, canSeeAll);
    return records.map((record) =>
      toSalesQueueItem(record, session.user.id, session.user.preferredLocale),
    );
  }

  async getSalesReview(
    token: string | undefined,
    reservationId: string,
  ): Promise<SalesReservationReview> {
    const session = await this.requireStaffPermission(token, "reservations.view");
    const record = await this.reservations.findSalesReview(reservationId);
    if (!record) throw new NotFoundException("The reservation request was not found.");
    if (
      session.user.role === "SALES" &&
      record.assignedSalesId &&
      record.assignedSalesId !== session.user.id
    ) {
      throw new ForbiddenException("This request is assigned to another sales employee.");
    }
    const requiredAccepted = Boolean(
      record.termsVersion &&
      record.termsAcceptedAt &&
      record.privacyConsentAt &&
      record.documentConsentAt &&
      record.operationalConsentAt,
    );
    return {
      ...toSalesQueueItem(record, session.user.id, session.user.preferredLocale),
      canReviewDocuments:
        session.user.role !== "SALES" || record.assignedSalesId === session.user.id,
      customer: {
        name: record.customerNameSnapshot ?? "Customer",
        emailMasked: maskEmail(record.customerEmailSnapshot ?? record.customer.email),
        phoneMasked: maskPhone(record.customerPhoneSnapshot ?? record.customer.phone),
        nationality: record.nationalitySnapshot,
        customerCategory: record.customerCategorySnapshot,
        addressMasked: maskText(record.addressSnapshot),
        emergencyContactNameMasked: maskName(record.emergencyContactNameSnapshot),
        emergencyContactPhoneMasked: record.emergencyContactPhoneSnapshot
          ? maskPhone(record.emergencyContactPhoneSnapshot)
          : null,
      },
      verification: {
        email: Boolean(record.customer.emailVerifiedAt),
        phone: Boolean(record.customer.phoneVerifiedAt),
      },
      consents: { policyVersion: record.termsVersion, requiredAccepted },
      documents: record.documents.map((document) => ({
        id: document.id,
        type: document.type as ReservationDocumentType,
        status: document.status as
          "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED",
        uploadedAt: document.createdAt.toISOString(),
        rejectionReason: document.rejectionReason,
      })),
      timeline: record.events.map((event) => ({
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        note: event.note,
        createdAt: event.createdAt.toISOString(),
      })),
      alternativeOffer: toAlternativeOffer(
        record.alternativeOffers[0] ?? null,
        session.user.preferredLocale,
      ),
      branchProgress: {
        expectedDepositEgp: record.vehicle.depositAmount?.toNumber?.() ?? null,
        attendedAt: record.branchAttendedAt?.toISOString() ?? null,
        deposit: record.deposit
          ? {
              amountEgp: record.deposit.amount.toNumber(),
              receiptNumber: record.deposit.receiptNumber,
              recordedAt: record.deposit.recordedAt.toISOString(),
            }
          : null,
        contract: record.contracts?.[0]
          ? {
              status: record.contracts[0].status,
              signedAt: record.contracts[0].signedAt?.toISOString() ?? null,
            }
          : null,
        booking: record.booking
          ? {
              reference: record.booking.reference,
              status: record.booking.status,
              confirmedAt: record.booking.confirmedAt.toISOString(),
            }
          : null,
        operations:
          record.booking?.operations?.map((operation) => ({
            type: operation.type,
            odometerKm: operation.odometerKm,
            fuelLevelPercent: operation.fuelLevelPercent,
            conditionNote: operation.conditionNote,
            recordedAt: operation.recordedAt.toISOString(),
          })) ?? [],
      },
    };
  }

  async claimSalesReview(
    token: string | undefined,
    reservationId: string,
  ): Promise<SalesReservationReview> {
    const session = await this.requireStaffPermission(token, "reservations.review");
    const result = await this.reservations.claimSalesReview({
      reservationId,
      actorId: session.user.id,
      locale: session.user.preferredLocale,
    });
    if (result.kind === "NOT_FOUND") {
      throw new NotFoundException("The pending reservation request was not found.");
    }
    if (result.kind === "ALREADY_ASSIGNED") {
      throw new ConflictException("Another sales employee already claimed this request.");
    }
    return this.getSalesReview(token, reservationId);
  }

  async accessSalesDocument(
    token: string | undefined,
    reservationId: string,
    documentId: string,
    input: SalesDocumentAccessDto,
    ipHash?: string,
  ) {
    const session = await this.requireStaffPermission(token, "documents.view");
    const document = await this.reservations.findSalesDocument(reservationId, documentId);
    if (!document) throw new NotFoundException("The protected document was not found.");
    const allowed =
      session.user.role !== "SALES" ||
      (document.reservation.assignedSalesId !== null &&
        document.reservation.assignedSalesId === session.user.id);
    if (!allowed) {
      await this.reservations.recordDocumentAccess({
        documentId,
        actorId: session.user.id,
        action: "VIEW_INLINE",
        reason: input.reason.trim(),
        ipHash,
        succeeded: false,
      });
      throw new ForbiddenException("Only the assigned reviewer can view this document.");
    }

    try {
      const bytes = await this.documentStorage.read(document.storageKey);
      await this.reservations.recordDocumentAccess({
        documentId,
        actorId: session.user.id,
        action: "VIEW_INLINE",
        reason: input.reason.trim(),
        ipHash,
        succeeded: true,
      });
      return { bytes, mimeType: document.mimeType };
    } catch (error) {
      await this.reservations.recordDocumentAccess({
        documentId,
        actorId: session.user.id,
        action: "VIEW_INLINE",
        reason: input.reason.trim(),
        ipHash,
        succeeded: false,
      });
      throw error;
    }
  }

  async reviewSalesDocument(
    token: string | undefined,
    reservationId: string,
    documentId: string,
    input: SalesDocumentReviewDto,
    ipHash?: string,
  ): Promise<SalesDocumentReviewResult> {
    const session = await this.requireStaffPermission(token, "documents.review");
    const document = await this.reservations.findSalesDocument(reservationId, documentId);
    if (!document) throw new NotFoundException("The protected document was not found.");
    if (session.user.role === "SALES" && document.reservation.assignedSalesId !== session.user.id) {
      throw new ForbiddenException("Only the assigned reviewer can review this document.");
    }
    const reviewed = await this.reservations.reviewSalesDocument({
      reservationId,
      documentId,
      actorId: session.user.id,
      action: input.action,
      reason: input.reason.trim(),
      ipHash,
    });
    if (!reviewed) {
      throw new ConflictException("The document is no longer in a reviewable state.");
    }
    return {
      ...reviewed,
      reviewedAt: reviewed.reviewedAt.toISOString(),
    };
  }

  async decideSalesReview(
    token: string | undefined,
    reservationId: string,
    input: SalesReservationDecisionDto,
  ): Promise<SalesReservationDecisionResult> {
    const session = await this.requireStaffPermission(token, "reservations.review");
    const result = await this.reservations.decideSalesReview({
      reservationId,
      actorId: session.user.id,
      canOverrideAssignment: ["ADMIN", "SUPER_ADMIN"].includes(session.user.role),
      locale: session.user.preferredLocale,
      action: input.action,
      note: input.note.trim(),
    });
    if (result.kind === "NOT_FOUND") {
      throw new NotFoundException("An under-review reservation request was not found.");
    }
    if (result.kind === "NOT_ASSIGNED") {
      throw new ForbiddenException("Only the assigned sales employee can decide this request.");
    }
    return result.data;
  }

  async createAlternativeOffer(
    token: string | undefined,
    reservationId: string,
    input: SalesAlternativeOfferDto,
  ): Promise<SalesAlternativeOfferResult> {
    const session = await this.requireStaffPermission(token, "reservations.review");
    const pickupAt = parseDate(input.pickupDate);
    const returnAt = parseDate(input.returnDate);
    if (pickupAt.getTime() <= Date.now() || returnAt <= pickupAt) {
      throw new BadRequestException("Alternative dates must be a valid future range.");
    }
    const result = await this.reservations.createAlternativeOffer({
      reservationId,
      actorId: session.user.id,
      canOverrideAssignment: ["ADMIN", "SUPER_ADMIN"].includes(session.user.role),
      locale: session.user.preferredLocale,
      vehicleId: input.vehicleId,
      pickupAt,
      returnAt,
      note: input.note.trim(),
    });
    if (result.kind === "NOT_FOUND") {
      throw new NotFoundException("An under-review reservation request was not found.");
    }
    if (result.kind === "NOT_ASSIGNED") {
      throw new ForbiddenException("Only the assigned sales employee can offer an alternative.");
    }
    if (result.kind === "VEHICLE_UNAVAILABLE") {
      throw new ConflictException("The alternative vehicle is unavailable for these dates.");
    }
    if (result.kind === "DRIVER_UNAVAILABLE") {
      throw new ConflictException("The alternative vehicle does not support the requested driver.");
    }
    if (result.kind === "INVALID_DATES") {
      throw new BadRequestException("The alternative does not meet the minimum rental duration.");
    }
    return result.data;
  }

  async recordBranchChecklist(
    token: string | undefined,
    reservationId: string,
    input: SalesBranchChecklistDto,
  ): Promise<SalesBranchChecklistResult> {
    const session = await this.requireStaffPermission(token, "deposits.record");
    const result = await this.reservations.recordBranchChecklist({
      reservationId,
      actorId: session.user.id,
      canOverrideAssignment: ["ADMIN", "SUPER_ADMIN"].includes(session.user.role),
      locale: session.user.preferredLocale,
      depositAmountEgp: input.depositAmountEgp,
      receiptNumber: input.receiptNumber.trim(),
      note: input.note?.trim() || null,
    });
    if (result.kind === "NOT_FOUND") {
      throw new NotFoundException("A valid pre-approved request was not found.");
    }
    if (result.kind === "NOT_ASSIGNED") {
      throw new ForbiddenException("Only the assigned sales employee can record branch steps.");
    }
    if (result.kind === "PRE_APPROVAL_EXPIRED") {
      throw new ConflictException("The pre-approval expired before branch completion.");
    }
    if (result.kind === "DEPOSIT_NOT_CONFIGURED") {
      throw new ConflictException("The vehicle deposit must be configured before recording it.");
    }
    if (result.kind === "DEPOSIT_MISMATCH") {
      throw new ConflictException(
        `The recorded deposit must equal the configured EGP ${result.expectedDeposit}.`,
      );
    }
    if (result.kind === "ALREADY_RECORDED") {
      throw new ConflictException(
        "Branch requirements were already recorded with another receipt.",
      );
    }
    if (result.kind === "RECEIPT_IN_USE") {
      throw new ConflictException("This branch receipt number is already in use.");
    }
    return result.data;
  }

  async confirmBooking(
    token: string | undefined,
    reservationId: string,
  ): Promise<SalesBookingConfirmationResult> {
    const session = await this.requireStaffPermission(token, "bookings.confirm");
    const result = await this.reservations.confirmBooking({
      reservationId,
      actorId: session.user.id,
      canOverrideAssignment: ["ADMIN", "SUPER_ADMIN"].includes(session.user.role),
      locale: session.user.preferredLocale,
    });
    if (result.kind === "NOT_FOUND") {
      throw new NotFoundException("A pre-approved reservation request was not found.");
    }
    if (result.kind === "NOT_ASSIGNED") {
      throw new ForbiddenException("Only the assigned sales employee can confirm this booking.");
    }
    if (result.kind === "PRE_APPROVAL_EXPIRED") {
      throw new ConflictException("The pre-approval expired before booking confirmation.");
    }
    if (result.kind === "BRANCH_REQUIREMENTS_INCOMPLETE") {
      throw new ConflictException(
        "Branch attendance, deposit, and a signed contract are required before confirmation.",
      );
    }
    if (result.kind === "VEHICLE_UNAVAILABLE") {
      throw new ConflictException("The vehicle is no longer available for the requested period.");
    }
    return result.data;
  }

  async recordBookingOperation(
    token: string | undefined,
    reservationId: string,
    input: SalesBookingOperationDto,
  ): Promise<SalesBookingOperationResult> {
    const session = await this.requireStaffPermission(token, "bookings.operate");
    const result = await this.reservations.recordBookingOperation({
      reservationId,
      actorId: session.user.id,
      canOverrideAssignment: ["ADMIN", "SUPER_ADMIN"].includes(session.user.role),
      locale: session.user.preferredLocale,
      action: input.action,
      odometerKm: input.odometerKm ?? null,
      fuelLevelPercent: input.fuelLevelPercent ?? null,
      note: input.note.trim(),
    });
    if (result.kind === "NOT_FOUND") {
      throw new NotFoundException("A confirmed or active booking was not found.");
    }
    if (result.kind === "NOT_ASSIGNED") {
      throw new ForbiddenException("Only the assigned sales employee can operate this booking.");
    }
    if (result.kind === "TOO_EARLY") {
      throw new ConflictException("No-show cannot be recorded before the scheduled pickup time.");
    }
    if (result.kind === "INVALID_ODOMETER") {
      throw new ConflictException("Return odometer cannot be lower than the delivery reading.");
    }
    if (result.kind === "VEHICLE_UNAVAILABLE") {
      throw new ConflictException(
        "The vehicle cannot be delivered in its current operational state.",
      );
    }
    if (result.kind === "INVALID_TRANSITION") {
      throw new ConflictException("This booking operation is not allowed in the current state.");
    }
    return result.data;
  }

  async getCustomerRequests(token: string | undefined): Promise<CustomerReservationSummary[]> {
    const session = await this.auth.getSession(token);
    assertCustomerAccess(session.user.role);
    const records = await this.reservations.findCustomerRequests(session.user.id);
    return records.map((record) => toCustomerRequestSummary(record, session.user.preferredLocale));
  }

  async getCustomerRequest(
    token: string | undefined,
    reservationId: string,
  ): Promise<CustomerReservationDetail> {
    const session = await this.auth.getSession(token);
    assertCustomerAccess(session.user.role);
    const record = await this.reservations.findCustomerRequest(reservationId, session.user.id);
    if (!record) throw new NotFoundException("The reservation request was not found.");
    return {
      ...toCustomerRequestSummary(record, session.user.preferredLocale),
      documents: record.documents.map((document) => ({
        id: document.id,
        type: document.type as ReservationDocumentType,
        status: document.status as
          "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED",
        rejectionReason: document.rejectionReason,
      })),
      messages: record.customerMessages.map((message) => ({
        id: message.id,
        sender: message.sender.systemRole === "CUSTOMER" ? "CUSTOMER" : "RAHAL",
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
      alternativeOffer: toAlternativeOffer(
        record.alternativeOffers[0] ?? null,
        session.user.preferredLocale,
      ),
      branchProgress: {
        attended: Boolean(record.branchAttendedAt),
        depositRecorded: Boolean(record.deposit),
        contractSigned: Boolean(record.contracts?.length),
        bookingReference: record.booking?.reference ?? null,
        confirmedAt: record.booking?.confirmedAt.toISOString() ?? null,
      },
      rentalProgress: {
        deliveredAt: record.deliveredAt?.toISOString() ?? null,
        returnedAt: record.returnedAt?.toISOString() ?? null,
        completedAt: record.completedAt?.toISOString() ?? null,
      },
    };
  }

  async respondToInformationRequest(
    token: string | undefined,
    reservationId: string,
    input: CustomerInformationResponseDto,
  ): Promise<CustomerInformationResponse> {
    const session = await this.auth.getSession(token);
    assertCustomerAccess(session.user.role);
    const result = await this.reservations.respondToInformationRequest({
      reservationId,
      customerId: session.user.id,
      locale: session.user.preferredLocale,
      message: input.message.trim(),
    });
    if (result.kind === "NOT_FOUND") {
      throw new NotFoundException("An information request awaiting your response was not found.");
    }
    if (result.kind === "INVALID_STATUS") {
      throw new ConflictException("The reservation request no longer accepts this response.");
    }
    if (result.kind === "DOCUMENT_REPLACEMENT_REQUIRED") {
      throw new ConflictException("Replace every rejected document before sending your response.");
    }
    return result.data;
  }

  async respondToAlternativeOffer(
    token: string | undefined,
    reservationId: string,
    input: CustomerAlternativeOfferDecisionDto,
  ): Promise<CustomerAlternativeOfferResponse> {
    const session = await this.auth.getSession(token);
    assertCustomerAccess(session.user.role);
    const result = await this.reservations.respondToAlternativeOffer({
      reservationId,
      customerId: session.user.id,
      locale: session.user.preferredLocale,
      action: input.action,
    });
    if (result.kind === "NOT_FOUND") {
      throw new NotFoundException("A pending alternative offer was not found.");
    }
    if (result.kind === "EXPIRED") {
      throw new ConflictException("The alternative offer has expired and returned to review.");
    }
    if (result.kind === "VEHICLE_UNAVAILABLE") {
      throw new ConflictException("The alternative is no longer available. Sales will review it.");
    }
    if (result.kind === "INVALID_STATUS") {
      throw new ConflictException("The alternative offer no longer accepts a response.");
    }
    return result.data;
  }

  private async getDocumentContext(token: string | undefined, draftId: string) {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("Only customer accounts can manage reservation documents.");
    }
    const draft = await this.reservations.findOwnedDocumentContext(draftId, session.user.id);
    if (!draft) throw new NotFoundException("The reservation draft was not found.");
    const customerCategory = draft.customerCategorySnapshot;
    if (!draft.customerDetailsCompletedAt || !customerCategory) {
      throw new ConflictException("Customer details must be completed before documents.");
    }
    if (!draft.documentConsentAt) {
      throw new ConflictException("Document processing consent is required before upload.");
    }
    return { session, draft: { ...draft, customerCategorySnapshot: customerCategory } };
  }

  private async requireStaffPermission(
    token: string | undefined,
    permission: import("@rahal/contracts").StaffPermissionKey,
  ) {
    const session = await this.auth.getSession(token);
    assertSalesAccess(session.user.role);
    if (session.user.role === "SALES" && !this.staffAccess) {
      throw new ForbiddenException("Staff permission verification is unavailable.");
    }
    if (this.staffAccess) await this.staffAccess.require(session, permission);
    return session;
  }
}

function parseDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException("Dates must use a valid YYYY-MM-DD value.");
  }
  return date;
}

function matchesFileSignature(mimeType: string, bytes: Buffer) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  return false;
}

function safeOriginalName(value: string) {
  return basename(value)
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .slice(0, 120);
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  return `${name?.slice(0, 2) || "**"}***@${domain ?? "***"}`;
}

function maskPhone(value: string) {
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

function maskText(value: string | null) {
  if (!value) return null;
  return `${Array.from(value).slice(0, 5).join("")}••••`;
}

function maskName(value: string | null) {
  if (!value) return null;
  return `${Array.from(value)[0] ?? "•"}•••`;
}

function assertSalesAccess(role: string) {
  if (!["SALES", "ADMIN", "SUPER_ADMIN"].includes(role)) {
    throw new ForbiddenException("A sales or administrator account is required.");
  }
}

function assertCustomerAccess(role: string) {
  if (role !== "CUSTOMER") {
    throw new ForbiddenException("A customer account is required.");
  }
}

function toSalesQueueItem(
  record: {
    id: string;
    reference: string;
    status: string;
    submittedAt: Date | null;
    createdAt: Date;
    pickupAt: Date;
    returnAt: Date;
    driverRequested: boolean;
    estimatedTotal: { toNumber(): number };
    assignedSalesId: string | null;
    customerNameSnapshot: string | null;
    customerEmailSnapshot: string | null;
    customerPhoneSnapshot: string | null;
    vehicle: {
      id: string;
      nameAr: string;
      nameEn: string;
      depositAmount: { toNumber(): number } | null;
    };
    branch: { id: string; nameAr: string; nameEn: string };
  },
  actorId: string,
  locale: "ar" | "en",
): SalesReservationQueueItem {
  return {
    id: record.id,
    reference: record.reference,
    status: record.status as SalesReservationQueueItem["status"],
    submittedAt: (record.submittedAt ?? record.createdAt).toISOString(),
    pickupAt: record.pickupAt.toISOString(),
    returnAt: record.returnAt.toISOString(),
    driverRequested: record.driverRequested,
    estimate: { currency: "EGP", total: record.estimatedTotal.toNumber() },
    vehicle: {
      id: record.vehicle.id,
      name: locale === "ar" ? record.vehicle.nameAr : record.vehicle.nameEn,
    },
    branch: {
      id: record.branch.id,
      name: locale === "ar" ? record.branch.nameAr : record.branch.nameEn,
    },
    customer: {
      name: record.customerNameSnapshot ?? "Customer",
      emailMasked: maskEmail(record.customerEmailSnapshot ?? "hidden@rahal.local"),
      phoneMasked: maskPhone(record.customerPhoneSnapshot ?? "+20000000000"),
    },
    assignedToCurrentUser: record.assignedSalesId === actorId,
  };
}

function toCustomerRequestSummary(
  record: {
    id: string;
    reference: string;
    status: string;
    submittedAt: Date | null;
    createdAt: Date;
    pickupAt: Date;
    returnAt: Date;
    driverRequested: boolean;
    estimatedTotal: { toNumber(): number };
    preApprovalExpiresAt: Date | null;
    vehicle: { id: string; nameAr: string; nameEn: string };
    branch: { id: string; nameAr: string; nameEn: string };
  },
  locale: "ar" | "en",
): CustomerReservationSummary {
  return {
    id: record.id,
    reference: record.reference,
    status: record.status as CustomerReservationStatus,
    submittedAt: (record.submittedAt ?? record.createdAt).toISOString(),
    pickupAt: record.pickupAt.toISOString(),
    returnAt: record.returnAt.toISOString(),
    driverRequested: record.driverRequested,
    estimate: { currency: "EGP", total: record.estimatedTotal.toNumber() },
    vehicle: {
      id: record.vehicle.id,
      name: locale === "ar" ? record.vehicle.nameAr : record.vehicle.nameEn,
    },
    branch: {
      id: record.branch.id,
      name: locale === "ar" ? record.branch.nameAr : record.branch.nameEn,
    },
    needsResponse: ["MORE_INFORMATION_REQUIRED", "ALTERNATIVE_OFFERED"].includes(record.status),
    preApprovalExpiresAt: record.preApprovalExpiresAt?.toISOString() ?? null,
  };
}

function toAlternativeOffer(
  offer: {
    id: string;
    status: string;
    proposedPickupAt: Date;
    proposedReturnAt: Date;
    dailyRateSnapshot: { toNumber(): number };
    estimatedTotal: { toNumber(): number };
    note: string | null;
    expiresAt: Date;
    respondedAt: Date | null;
    vehicle: { id: string; nameAr: string; nameEn: string };
  } | null,
  locale: "ar" | "en",
): ReservationAlternativeOffer | null {
  if (!offer) return null;
  return {
    id: offer.id,
    status: offer.status as ReservationAlternativeOffer["status"],
    proposedPickupAt: offer.proposedPickupAt.toISOString(),
    proposedReturnAt: offer.proposedReturnAt.toISOString(),
    estimate: {
      currency: "EGP",
      dailyRate: offer.dailyRateSnapshot.toNumber(),
      total: offer.estimatedTotal.toNumber(),
    },
    vehicle: {
      id: offer.vehicle.id,
      name: locale === "ar" ? offer.vehicle.nameAr : offer.vehicle.nameEn,
    },
    note: offer.note,
    expiresAt: offer.expiresAt.toISOString(),
    respondedAt: offer.respondedAt?.toISOString() ?? null,
  };
}
