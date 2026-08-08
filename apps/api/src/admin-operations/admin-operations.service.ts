import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type {
  AdminAuditEntry,
  AdminAuditPage,
  AdminCommunicationRunResult,
  AdminCommunicationsOverview,
  AdminDocumentAccessEntry,
  AdminDocumentAccessPage,
  AdminOperationsOverview,
  AdminReportMetric,
  AdminReportQualityCheck,
  AdminReportRangeDays,
  AdminReportsOverview,
  AuthSession,
  ReservationDocumentType,
  VehicleOperationalStatus,
} from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import { StaffAccessService } from "../staff/staff-access.service";
import { AdminOperationsRepository } from "./admin-operations.repository";
import { BackgroundJobsService } from "../background-jobs/background-jobs.service";
import { loadApiConfig } from "../config";

type Locale = "ar" | "en";
type ReportWindow = Awaited<ReturnType<AdminOperationsRepository["reportWindow"]>>;

const DAY_MS = 24 * 60 * 60 * 1000;
const reportRanges = new Set<AdminReportRangeDays>([7, 30, 90, 365]);
const cairoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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
  private readonly config = loadApiConfig();

  constructor(
    private readonly auth: AuthService,
    private readonly access: StaffAccessService,
    private readonly repository: AdminOperationsRepository,
    private readonly jobs: BackgroundJobsService,
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

  async reports(
    token: string | undefined,
    rawRange: string | undefined,
    rawBranchId: string | undefined,
  ): Promise<AdminReportsOverview> {
    await this.adminSession(token);
    const rangeDays = parseReportRange(rawRange);
    const branchId = rawBranchId?.trim().slice(0, 100) || undefined;
    const now = new Date();
    const periodMs = rangeDays * DAY_MS;
    const start = new Date(now.getTime() - periodMs);
    const previousEnd = start;
    const previousStart = new Date(start.getTime() - periodMs);
    const [todayStart, todayEnd] = cairoDayBounds(now);
    const [currentWindow, previousWindow, context] = await Promise.all([
      this.repository.reportWindow(start, now, branchId),
      this.repository.reportWindow(previousStart, previousEnd, branchId),
      this.repository.reportContext({ branchId, now, todayStart, todayEnd }),
    ]);
    const [
      branches,
      vehicles,
      pickups,
      returns,
      missingSubmissionTime,
      missingCompletionTime,
      invalidDepositAmount,
      depositWithoutAttendance,
      bookingWithoutCompletionTime,
      futureSubmissionTime,
      fleetStatusRows,
    ] = context;
    if (branchId && !branches.some((branch) => branch.id === branchId)) {
      throw new BadRequestException("The selected branch is not active or does not exist.");
    }
    const current = summarizeReportWindow(currentWindow, start, now, vehicles.length, rangeDays);
    const previous = summarizeReportWindow(
      previousWindow,
      previousStart,
      previousEnd,
      vehicles.length,
      rangeDays,
    );
    const metrics: AdminReportMetric[] = [
      reportMetric("SUBMITTED_REQUESTS", "COUNT", current.submitted, previous.submitted),
      reportMetric(
        "COHORT_CONFIRMATION_RATE",
        "PERCENT",
        current.confirmationRate,
        previous.confirmationRate,
      ),
      reportMetric(
        "COMPLETED_RENTALS",
        "COUNT",
        current.completedActivity,
        previous.completedActivity,
      ),
      reportMetric("DEPOSITS_RECORDED_EGP", "EGP", current.depositsEgp, previous.depositsEgp),
      reportMetric(
        "MEDIAN_FIRST_REVIEW_MINUTES",
        "MINUTES",
        current.medianFirstReviewMinutes,
        previous.medianFirstReviewMinutes,
      ),
      reportMetric(
        "FLEET_UTILIZATION_RATE",
        "PERCENT",
        current.utilizationRate,
        previous.utilizationRate,
      ),
    ];
    const qualityKeys: AdminReportQualityCheck["key"][] = [
      "MISSING_SUBMISSION_TIME",
      "MISSING_COMPLETION_TIME",
      "INVALID_DEPOSIT_AMOUNT",
      "DEPOSIT_WITHOUT_ATTENDANCE",
      "BOOKING_WITHOUT_COMPLETION_TIME",
      "FUTURE_SUBMISSION_TIME",
    ];
    const qualityCounts = [
      missingSubmissionTime,
      missingCompletionTime,
      invalidDepositAmount,
      depositWithoutAttendance,
      bookingWithoutCompletionTime,
      futureSubmissionTime,
    ];
    const checks: AdminReportQualityCheck[] = qualityKeys.map((key, index) => ({
      key,
      severity: index === 2 || index === 3 ? ("HIGH" as const) : ("MEDIUM" as const),
      count: qualityCounts[index] ?? 0,
    }));
    return {
      rangeDays,
      period: {
        start: start.toISOString(),
        end: now.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
      },
      selectedBranchId: branchId ?? null,
      branches,
      metrics,
      trend: current.trend,
      funnel: current.funnel,
      statusMix: current.statusMix,
      fleet: {
        activeVehicles: vehicles.length,
        occupiedDays: current.occupiedDays,
        capacityDays: current.capacityDays,
        utilizationRate: current.utilizationRate,
        statusMix: fleetStatusRows.map((row) => ({
          status: row.status as AdminReportsOverview["fleet"]["statusMix"][number]["status"],
          count: row._count._all,
        })),
      },
      vehicles: current.vehicles,
      sales: current.sales,
      today: { pickups, returns },
      quality: {
        status: checks.some((check) => check.count > 0) ? "REVIEW_REQUIRED" : "TRUSTED",
        checks,
      },
      generatedAt: now.toISOString(),
    };
  }

  async communications(token: string | undefined): Promise<AdminCommunicationsOverview> {
    await this.adminSession(token);
    const stats = await this.repository.communicationStats();
    const deliveryCount = (channel: "IN_APP" | "PUSH" | "EMAIL" | "WHATSAPP", statuses: string[]) =>
      stats.deliveries
        .filter((row) => row.channel === channel && statuses.includes(row.status))
        .reduce((total, row) => total + row._count._all, 0);
    const outboxCount = (status: "PENDING" | "PROCESSING" | "FAILED") =>
      stats.outbox.find((row) => row.status === status)?._count._all ?? 0;
    const emailProvider = this.config.verificationBrevo
      ? "BREVO"
      : this.config.verificationEmail
        ? "RESEND"
        : null;
    const phoneProvider = this.config.verificationWhatsApp
      ? "META"
      : this.config.verificationTwilioVerifyWhatsApp
        ? "TWILIO_VERIFY"
        : null;

    return {
      providers: [
        { key: "IN_APP", status: "READY", provider: "LOCAL" },
        {
          key: "EMAIL",
          status: emailProvider ? "READY" : "CONFIGURATION_REQUIRED",
          provider: emailProvider,
        },
        {
          key: "WHATSAPP_VERIFICATION",
          status: phoneProvider ? "READY" : "CONFIGURATION_REQUIRED",
          provider: phoneProvider,
        },
        {
          key: "WHATSAPP_NOTIFICATIONS",
          status: this.config.verificationWhatsApp?.notificationTemplateName
            ? "READY"
            : "CONFIGURATION_REQUIRED",
          provider: this.config.verificationWhatsApp?.notificationTemplateName ? "META" : null,
        },
        {
          key: "WEB_PUSH",
          status: this.config.webPush ? "READY" : "CONFIGURATION_REQUIRED",
          provider: this.config.webPush ? "VAPID" : null,
        },
      ],
      deliveries: (["IN_APP", "PUSH", "EMAIL", "WHATSAPP"] as const).map((channel) => ({
        channel,
        queued: deliveryCount(channel, ["QUEUED"]),
        sent: deliveryCount(channel, ["SENT", "DELIVERED", "READ"]),
        failed: deliveryCount(channel, ["FAILED"]),
      })),
      outbox: {
        pending: outboxCount("PENDING"),
        processing: outboxCount("PROCESSING"),
        failed: outboxCount("FAILED"),
      },
      workerMode: this.config.backgroundJobs.mode === "request" ? "REQUEST" : "INTERVAL",
      scheduledCleanup: Boolean(this.config.backgroundJobs.cronSecret),
      generatedAt: new Date().toISOString(),
    };
  }

  async runCommunicationQueue(token: string | undefined): Promise<AdminCommunicationRunResult> {
    const session = await this.adminSession(token);
    const result = await this.jobs.runDeliveryBatch();
    await this.repository.writeCommunicationAudit(session.user.id, result.processed);
    return { processed: result.processed, generatedAt: new Date().toISOString() };
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

function parseReportRange(value: string | undefined): AdminReportRangeDays {
  const parsed = Number(value ?? 30) as AdminReportRangeDays;
  if (!reportRanges.has(parsed)) {
    throw new BadRequestException("Report range must be 7, 30, 90, or 365 days.");
  }
  return parsed;
}

function reportMetric(
  key: AdminReportMetric["key"],
  unit: AdminReportMetric["unit"],
  value: number,
  previousValue: number,
): AdminReportMetric {
  return {
    key,
    unit,
    value,
    previousValue,
    changePercent:
      previousValue === 0
        ? value === 0
          ? 0
          : null
        : round(((value - previousValue) / Math.abs(previousValue)) * 100, 1),
  };
}

function summarizeReportWindow(
  window: ReportWindow,
  start: Date,
  end: Date,
  activeVehicleCount: number,
  rangeDays: AdminReportRangeDays,
) {
  const [cohort, activity, milestoneEvents, deposits, bookings, statusRows] = window;
  const firstReviewByReservation = new Map<string, number>();
  const reviewStarted = new Set<string>();
  const preApproved = new Set<string>();
  for (const event of milestoneEvents) {
    if (event.toStatus === "PRE_APPROVED") preApproved.add(event.reservationId);
    if (event.toStatus !== "UNDER_REVIEW" || !event.reservation.submittedAt) continue;
    reviewStarted.add(event.reservationId);
    const minutes = (event.createdAt.getTime() - event.reservation.submittedAt.getTime()) / 60_000;
    if (minutes >= 0 && !firstReviewByReservation.has(event.reservationId)) {
      firstReviewByReservation.set(event.reservationId, minutes);
    }
  }
  for (const reservation of cohort) {
    if (reservation.assignedSalesId) reviewStarted.add(reservation.id);
  }
  const confirmed = cohort.filter((reservation) => Boolean(reservation.confirmedAt)).length;
  const completed = cohort.filter((reservation) => Boolean(reservation.completedAt)).length;
  const completedActivity = activity.filter(
    (reservation) =>
      reservation.completedAt &&
      reservation.completedAt.getTime() >= start.getTime() &&
      reservation.completedAt.getTime() < end.getTime(),
  ).length;
  const lostStatuses = new Set(["REJECTED", "EXPIRED", "CANCELLED", "NO_SHOW"]);
  const lost = cohort.filter((reservation) => lostStatuses.has(reservation.status)).length;
  const depositsEgp = round(
    deposits.reduce((total, deposit) => total + deposit.amount.toNumber(), 0),
    2,
  );
  const periodDays = Math.max((end.getTime() - start.getTime()) / DAY_MS, 1);
  const occupiedByVehicle = new Map<string, number>();
  for (const booking of bookings) {
    const overlapStart = Math.max(start.getTime(), booking.pickupAt.getTime());
    const overlapEnd = Math.min(end.getTime(), booking.returnAt.getTime());
    const occupied = Math.max(0, overlapEnd - overlapStart) / DAY_MS;
    occupiedByVehicle.set(
      booking.vehicleId,
      (occupiedByVehicle.get(booking.vehicleId) ?? 0) + occupied,
    );
  }
  const occupiedDays = round(
    [...occupiedByVehicle.values()].reduce((total, value) => total + value, 0),
    1,
  );
  const capacityDays = round(activeVehicleCount * periodDays, 1);
  const utilizationRate = capacityDays ? round((occupiedDays / capacityDays) * 100, 1) : 0;
  const vehicleMap = new Map<
    string,
    {
      vehicleId: string;
      nameAr: string;
      nameEn: string;
      requests: number;
      confirmed: number;
      completed: number;
      occupiedDays: number;
    }
  >();
  for (const reservation of cohort) {
    const row = vehicleMap.get(reservation.vehicleId) ?? {
      vehicleId: reservation.vehicleId,
      nameAr: reservation.vehicle.nameAr,
      nameEn: reservation.vehicle.nameEn,
      requests: 0,
      confirmed: 0,
      completed: 0,
      occupiedDays: 0,
    };
    row.requests += 1;
    if (reservation.confirmedAt) row.confirmed += 1;
    if (reservation.completedAt) row.completed += 1;
    vehicleMap.set(reservation.vehicleId, row);
  }
  for (const [vehicleId, days] of occupiedByVehicle) {
    const booking = bookings.find((item) => item.vehicleId === vehicleId);
    const row =
      vehicleMap.get(vehicleId) ??
      (booking
        ? {
            vehicleId,
            nameAr: booking.vehicle.nameAr,
            nameEn: booking.vehicle.nameEn,
            requests: 0,
            confirmed: 0,
            completed: 0,
            occupiedDays: 0,
          }
        : null);
    if (row) {
      row.occupiedDays = round(days, 1);
      vehicleMap.set(vehicleId, row);
    }
  }
  const salesMap = new Map<
    string,
    {
      userId: string;
      nameAr: string | null;
      nameEn: string;
      assigned: number;
      confirmed: number;
      completed: number;
      reviewMinutes: number[];
    }
  >();
  for (const reservation of cohort) {
    if (!reservation.assignedSalesId || !reservation.assignedSales) continue;
    const row = salesMap.get(reservation.assignedSalesId) ?? {
      userId: reservation.assignedSalesId,
      nameAr: reservation.assignedSales.fullNameAr,
      nameEn: reservation.assignedSales.fullNameEn,
      assigned: 0,
      confirmed: 0,
      completed: 0,
      reviewMinutes: [],
    };
    row.assigned += 1;
    if (reservation.confirmedAt) row.confirmed += 1;
    if (reservation.completedAt) row.completed += 1;
    const reviewMinutes = firstReviewByReservation.get(reservation.id);
    if (reviewMinutes !== undefined) row.reviewMinutes.push(reviewMinutes);
    salesMap.set(reservation.assignedSalesId, row);
  }
  return {
    submitted: cohort.length,
    confirmationRate: cohort.length ? round((confirmed / cohort.length) * 100, 1) : 0,
    completedActivity,
    depositsEgp,
    medianFirstReviewMinutes: round(median([...firstReviewByReservation.values()]) ?? 0, 1),
    utilizationRate,
    occupiedDays,
    capacityDays,
    trend: buildReportTrend(activity, deposits, start, end, rangeDays),
    funnel: [
      { key: "SUBMITTED" as const, value: cohort.length },
      { key: "REVIEW_STARTED" as const, value: reviewStarted.size },
      { key: "PRE_APPROVED" as const, value: preApproved.size },
      { key: "CONFIRMED" as const, value: confirmed },
      { key: "COMPLETED" as const, value: completed },
      { key: "LOST" as const, value: lost },
    ],
    statusMix: statusRows.map((row) => ({
      status: row.status as AdminReportsOverview["statusMix"][number]["status"],
      count: row._count._all,
    })),
    vehicles: [...vehicleMap.values()]
      .sort(
        (left, right) => right.requests - left.requests || right.occupiedDays - left.occupiedDays,
      )
      .slice(0, 12),
    sales: [...salesMap.values()]
      .map(({ reviewMinutes, ...row }) => ({
        ...row,
        medianFirstReviewMinutes:
          reviewMinutes.length > 0 ? round(median(reviewMinutes) ?? 0, 1) : null,
      }))
      .sort((left, right) => right.assigned - left.assigned || right.confirmed - left.confirmed)
      .slice(0, 12),
  };
}

function buildReportTrend(
  activity: ReportWindow[1],
  deposits: ReportWindow[3],
  start: Date,
  end: Date,
  rangeDays: AdminReportRangeDays,
) {
  const bucketDays = rangeDays <= 7 ? 1 : rangeDays <= 30 ? 3 : rangeDays <= 90 ? 7 : 30;
  const bucketMs = bucketDays * DAY_MS;
  const bucketCount = Math.ceil((end.getTime() - start.getTime()) / bucketMs);
  const points = Array.from({ length: bucketCount }, (_, index) => ({
    date: cairoDateKey(new Date(start.getTime() + index * bucketMs)),
    submitted: 0,
    confirmed: 0,
    completed: 0,
    depositsEgp: 0,
  }));
  const bucket = (date: Date) =>
    points[
      Math.min(
        points.length - 1,
        Math.max(0, Math.floor((date.getTime() - start.getTime()) / bucketMs)),
      )
    ];
  for (const row of activity) {
    if (row.submittedAt && row.submittedAt >= start && row.submittedAt < end) {
      const point = bucket(row.submittedAt);
      if (point) point.submitted += 1;
    }
    if (row.confirmedAt && row.confirmedAt >= start && row.confirmedAt < end) {
      const point = bucket(row.confirmedAt);
      if (point) point.confirmed += 1;
    }
    if (row.completedAt && row.completedAt >= start && row.completedAt < end) {
      const point = bucket(row.completedAt);
      if (point) point.completed += 1;
    }
  }
  for (const deposit of deposits) {
    const point = bucket(deposit.recordedAt);
    if (point) point.depositsEgp = round(point.depositsEgp + deposit.amount.toNumber(), 2);
  }
  return points;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function cairoDateKey(date: Date) {
  const parts = cairoDateFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function cairoDayBounds(now: Date): [Date, Date] {
  const parts = cairoDateFormatter.formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const start = cairoLocalMidnight(year, month, day);
  const nextCalendarDay = new Date(Date.UTC(year, month - 1, day + 1));
  const end = cairoLocalMidnight(
    nextCalendarDay.getUTCFullYear(),
    nextCalendarDay.getUTCMonth() + 1,
    nextCalendarDay.getUTCDate(),
  );
  return [start, end];
}

function cairoLocalMidnight(year: number, month: number, day: number) {
  const utcGuess = Date.UTC(year, month - 1, day);
  let result = new Date(utcGuess);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    result = new Date(utcGuess - cairoOffsetAt(result));
  }
  return result;
}

function cairoOffsetAt(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return (
    Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      read("hour"),
      read("minute"),
      read("second"),
    ) - date.getTime()
  );
}
