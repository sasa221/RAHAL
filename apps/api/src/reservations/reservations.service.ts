import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  ReservationConsentBundle,
  ReservationConsents,
  ReservationCustomerDetails,
  ReservationDocumentChecklist,
  ReservationDocumentType,
  ReservationDraft,
  ReservationReview,
  ReservationSubmissionBlocker,
  SalesReservationQueueItem,
  SalesReservationReview,
  SubmittedReservation,
} from "@rahal/contracts";
import { basename } from "node:path";
import { AuthService } from "../auth/auth.service";
import { PrivateDocumentStorage } from "./private-document-storage";
import type {
  SaveReservationCustomerDetailsDto,
  SaveReservationConsentsDto,
  SaveReservationDraftDto,
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
    const session = await this.auth.getSession(token);
    assertSalesAccess(session.user.role);
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
    const session = await this.auth.getSession(token);
    assertSalesAccess(session.user.role);
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
        type: document.type as ReservationDocumentType,
        status: document.status as
          "UPLOADED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED",
        uploadedAt: document.createdAt.toISOString(),
      })),
      timeline: record.events.map((event) => ({
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        note: event.note,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async claimSalesReview(
    token: string | undefined,
    reservationId: string,
  ): Promise<SalesReservationReview> {
    const session = await this.auth.getSession(token);
    assertSalesAccess(session.user.role);
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

  private async getDocumentContext(token: string | undefined, draftId: string) {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "CUSTOMER") {
      throw new ForbiddenException("Only customer accounts can manage reservation documents.");
    }
    const draft = await this.reservations.findOwnedDraft(draftId, session.user.id);
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
    vehicle: { id: string; nameAr: string; nameEn: string };
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
