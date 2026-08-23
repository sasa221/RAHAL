import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminCustomerPage,
  AdminCustomerStatus,
  AuthSession,
} from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import type { CustomerContactAccessDto, UpdateCustomerStatusDto } from "./admin-customers.dto";
import { AdminCustomersRepository } from "./admin-customers.repository";

type Locale = "ar" | "en";

@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly auth: AuthService,
    private readonly customers: AdminCustomersRepository,
  ) {}

  async page(
    token: string | undefined,
    input: {
      cursor?: string;
      query?: string;
      status?: string;
      verification?: string;
      locale: Locale;
    },
  ): Promise<AdminCustomerPage> {
    await this.adminSession(token);
    if (input.cursor && !/^[a-z0-9]{20,40}$/i.test(input.cursor)) {
      throw new BadRequestException("Invalid customer page cursor.");
    }
    const status = input.status ?? "ALL";
    const verification = input.verification ?? "ALL";
    if (
      !["ALL", "PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "BLOCKED", "ARCHIVED"].includes(
        status,
      )
    ) {
      throw new BadRequestException("Unsupported customer status filter.");
    }
    if (!["ALL", "VERIFIED", "PENDING"].includes(verification)) {
      throw new BadRequestException("Unsupported customer verification filter.");
    }
    const result = await this.customers.page({
      cursor: input.cursor,
      query: input.query?.trim().slice(0, 100) || undefined,
      status,
      verification,
    });
    const hasMore = result.items.length > 30;
    const visible = result.items.slice(0, 30);
    return {
      items: visible.map((item) => this.toListItem(item, input.locale)),
      nextCursor: hasMore ? (visible.at(-1)?.id ?? null) : null,
      summary: result.summary,
    };
  }

  async detail(
    token: string | undefined,
    id: string,
    locale: Locale,
  ): Promise<AdminCustomerDetail> {
    const session = await this.adminSession(token);
    const [customer, audit] = await Promise.all([
      this.customers.detail(id),
      this.customers.statusAudit(id),
    ]);
    if (!customer) throw new NotFoundException("Customer account not found.");
    const preference = customer.notificationPreference;
    return {
      ...this.toListItem(customer, locale),
      canRevealContact: session.user.role === "SUPER_ADMIN",
      contact: null,
      preferences: {
        inApp: preference?.inAppEnabled ?? true,
        push: preference?.pushEnabled ?? true,
        email: preference?.emailEnabled ?? true,
        marketing: preference?.marketingEnabled ?? false,
      },
      recentReservations: customer.reservations.map((reservation) => ({
        id: reservation.id,
        reference: reservation.reference,
        status: reservation.status,
        vehicleName: locale === "ar" ? reservation.vehicle.nameAr : reservation.vehicle.nameEn,
        pickupAt: reservation.pickupAt.toISOString(),
        returnAt: reservation.returnAt.toISOString(),
        createdAt: reservation.createdAt.toISOString(),
      })),
      recentStatusChanges: audit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        reason: entry.reason,
        actorName:
          locale === "ar" && entry.actor?.fullNameAr
            ? entry.actor.fullNameAr
            : (entry.actor?.fullNameEn ?? (locale === "ar" ? "نظام رحال" : "Rahal system")),
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  async contactAccess(
    token: string | undefined,
    id: string,
    input: CustomerContactAccessDto,
  ): Promise<{ email: string; phone: string | null }> {
    const session = await this.auth.getSession(token);
    if (session.user.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("Only a super administrator may access full contact details.");
    }
    const customer = await this.customers.detail(id);
    if (!customer) throw new NotFoundException("Customer account not found.");
    await this.customers.recordContactAccess(id, {
      actorId: session.user.id,
      action: input.action,
      reason: input.reason.trim(),
    });
    return { email: customer.email, phone: customer.phone };
  }

  async updateStatus(
    token: string | undefined,
    id: string,
    input: UpdateCustomerStatusDto,
    locale: Locale,
  ): Promise<AdminCustomerListItem> {
    const session = await this.adminSession(token);
    const current = await this.customers.detail(id);
    if (!current) throw new NotFoundException("Customer account not found.");
    if (current.status === "ARCHIVED") {
      throw new ConflictException("Archived customer accounts cannot be changed here.");
    }
    if (current.status === input.status) {
      throw new ConflictException("The customer account already has this status.");
    }
    const updated = await this.customers.updateStatus(id, input.status, {
      actorId: session.user.id,
      reason: input.reason.trim(),
      previousStatus: current.status,
    });
    return this.toListItem(updated, locale);
  }

  private async adminSession(token: string | undefined): Promise<AuthSession> {
    const session = await this.auth.getSession(token);
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      throw new ForbiddenException("An administrator account is required.");
    }
    return session;
  }

  private toListItem(
    customer: {
      id: string;
      email: string;
      phone: string | null;
      fullNameAr: string | null;
      fullNameEn: string;
      status: string;
      preferredLocale: string;
      emailVerifiedAt: Date | null;
      createdAt: Date;
      _count: { reservations: number; bookings: number };
      sessions: Array<{ lastSeenAt: Date }>;
    },
    locale: Locale,
  ): AdminCustomerListItem {
    return {
      id: customer.id,
      displayName:
        locale === "ar" && customer.fullNameAr ? customer.fullNameAr : customer.fullNameEn,
      emailMasked: maskEmail(customer.email),
      phoneMasked: maskPhone(customer.phone),
      status: customer.status as AdminCustomerStatus,
      preferredLocale: customer.preferredLocale === "en" ? "en" : "ar",
      verification: {
        email: Boolean(customer.emailVerifiedAt),
      },
      reservationCount: customer._count.reservations,
      bookingCount: customer._count.bookings,
      lastActivityAt: customer.sessions[0]?.lastSeenAt.toISOString() ?? null,
      createdAt: customer.createdAt.toISOString(),
    };
  }
}

export function maskEmail(value: string) {
  const [local = "", domain = ""] = value.split("@");
  return `${local.slice(0, 2)}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`;
}

export function maskPhone(value: string | null) {
  if (!value) return "—";
  if (value.length < 7) return "***";
  return `${value.slice(0, 3)}${"*".repeat(Math.max(4, value.length - 6))}${value.slice(-3)}`;
}
