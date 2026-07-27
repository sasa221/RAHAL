import { ForbiddenException, Injectable } from "@nestjs/common";
import type {
  AdminAuditEntry,
  AdminAuditPage,
  AdminDocumentAccessEntry,
  AdminDocumentAccessPage,
  AdminOperationsOverview,
  AuthSession,
  ReservationDocumentType,
  VehicleOperationalStatus,
} from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import { StaffAccessService } from "../staff/staff-access.service";
import { AdminOperationsRepository } from "./admin-operations.repository";

type Locale = "ar" | "en";

function actorName(
  entry: { actor: { fullNameAr: string | null; fullNameEn: string } | null },
  locale: Locale,
) {
  if (!entry.actor) return locale === "ar" ? "النظام" : "Rahal system";
  return locale === "ar" && entry.actor.fullNameAr
    ? entry.actor.fullNameAr
    : entry.actor.fullNameEn;
}

function maskIdentitySequences(value: string) {
  return value.replace(/[0-9٠-٩]{8,}/g, (match) => {
    const visibleStart = match.slice(0, 2);
    const visibleEnd = match.slice(-2);
    return `${visibleStart}${"•".repeat(Math.max(4, match.length - 4))}${visibleEnd}`;
  });
}

function toAuditEntry(
  entry: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    succeeded: boolean;
    createdAt: Date;
    actor: {
      fullNameAr: string | null;
      fullNameEn: string;
      systemRole: string;
    } | null;
  },
  locale: Locale,
): AdminAuditEntry {
  return {
    id: entry.id,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    actorName: actorName(entry, locale),
    actorRole: entry.actor?.systemRole ?? null,
    reason: null,
    succeeded: entry.succeeded,
    createdAt: entry.createdAt.toISOString(),
  };
}

function toDocumentAccessEntry(
  entry: {
    id: string;
    action: string;
    reason: string;
    succeeded: boolean;
    createdAt: Date;
    actor: {
      fullNameAr: string | null;
      fullNameEn: string;
      systemRole: string;
    };
    document: {
      type: string;
      status: string;
      reservation: {
        id: string;
        reference: string;
      };
    };
  },
  locale: Locale,
): AdminDocumentAccessEntry {
  return {
    id: entry.id,
    action: entry.action,
    reason: maskIdentitySequences(entry.reason),
    succeeded: entry.succeeded,
    createdAt: entry.createdAt.toISOString(),
    actorName: actorName(entry, locale),
    actorRole: entry.actor.systemRole,
    reservationId: entry.document.reservation.id,
    reservationReference: entry.document.reservation.reference,
    documentType: entry.document.type as ReservationDocumentType,
    documentStatus: entry.document.status as AdminDocumentAccessEntry["documentStatus"],
  };
}

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly auth: AuthService,
    private readonly access: StaffAccessService,
    private readonly repository: AdminOperationsRepository,
  ) {}

  private async adminSession(token: string | undefined): Promise<AuthSession> {
    const session = await this.auth.getSession(token);
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      throw new ForbiddenException("An administrator account is required.");
    }
    return session;
  }

  async overview(token: string | undefined, locale: Locale): Promise<AdminOperationsOverview> {
    await this.adminSession(token);
    const now = new Date();
    const since = new Date(now);
    since.setUTCDate(since.getUTCDate() - 13);
    since.setUTCHours(0, 0, 0, 0);
    const [
      openRequests,
      confirmedBookings,
      activeRentals,
      availableVehicles,
      overdueRentals,
      expiringPreapprovals,
      failedDeliveries,
      pendingReviews,
      fleetRows,
      reservations,
      recentActivity,
    ] = await this.repository.overview(since, now);
    const trend = Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(since);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        submitted: reservations.filter((item) => item.submittedAt?.toISOString().startsWith(key))
          .length,
        completed: reservations.filter((item) => item.completedAt?.toISOString().startsWith(key))
          .length,
      };
    });
    const attentionRequired =
      overdueRentals + expiringPreapprovals + failedDeliveries + pendingReviews;
    return {
      metrics: [
        { key: "OPEN_REQUESTS", value: openRequests },
        { key: "CONFIRMED_BOOKINGS", value: confirmedBookings },
        { key: "ACTIVE_RENTALS", value: activeRentals },
        { key: "AVAILABLE_VEHICLES", value: availableVehicles },
        { key: "ATTENTION_REQUIRED", value: attentionRequired },
      ],
      trend,
      fleet: fleetRows.map((item) => ({
        status: item.status as VehicleOperationalStatus,
        count: item._count._all,
      })),
      alerts: [
        { key: "OVERDUE_RENTALS", count: overdueRentals, severity: "CRITICAL", href: "/sales" },
        {
          key: "EXPIRING_PREAPPROVALS",
          count: expiringPreapprovals,
          severity: "WARNING",
          href: "/sales",
        },
        {
          key: "FAILED_DELIVERIES",
          count: failedDeliveries,
          severity: "WARNING",
          href: "/admin/audit",
        },
        {
          key: "PENDING_REVIEWS",
          count: pendingReviews,
          severity: "INFO",
          href: "/admin/reviews",
        },
      ],
      recentActivity: recentActivity.map((item) => toAuditEntry(item, locale)),
      generatedAt: now.toISOString(),
    };
  }

  async audit(
    token: string | undefined,
    locale: Locale,
    input: {
      cursor?: string;
      action?: string;
      entityType?: string;
      result?: string;
      query?: string;
    },
  ): Promise<AdminAuditPage> {
    const session = await this.auth.getSession(token);
    await this.access.require(session, "audit.view");
    const page = await this.repository.audit({
      cursor: input.cursor,
      action: input.action,
      entityType: input.entityType,
      succeeded: input.result === "success" ? true : input.result === "failed" ? false : undefined,
      query: input.query?.trim().slice(0, 80) || undefined,
    });
    const hasMore = page.items.length > 40;
    const items = page.items.slice(0, 40);
    return {
      items: items.map((item) => toAuditEntry(item, locale)),
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
      availableActions: page.actions.map((item) => item.action),
      availableEntityTypes: page.entityTypes.map((item) => item.entityType),
    };
  }

  async documentAccess(
    token: string | undefined,
    locale: Locale,
    input: {
      cursor?: string;
      action?: string;
      result?: string;
      query?: string;
    },
  ): Promise<AdminDocumentAccessPage> {
    const session = await this.adminSession(token);
    await this.access.require(session, "audit.view");
    const page = await this.repository.documentAccess({
      cursor: input.cursor,
      action: input.action,
      succeeded: input.result === "success" ? true : input.result === "failed" ? false : undefined,
      query: input.query?.trim().slice(0, 80) || undefined,
    });
    const hasMore = page.items.length > 40;
    const items = page.items.slice(0, 40);
    return {
      items: items.map((item) => toDocumentAccessEntry(item, locale)),
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
      availableActions: page.actions.map((item) => item.action),
    };
  }
}
