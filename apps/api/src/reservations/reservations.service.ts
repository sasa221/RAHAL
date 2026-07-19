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
  ReservationDraft,
} from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
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
      address: input.address.trim(),
      emergencyContactName: input.emergencyContactName.trim(),
      emergencyContactPhone: input.emergencyContactPhone,
    });
    if (!saved) throw new NotFoundException("The reservation draft was not found.");
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
}

function parseDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException("Dates must use a valid YYYY-MM-DD value.");
  }
  return date;
}
