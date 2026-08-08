import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

const safeAuditSelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  succeeded: true,
  createdAt: true,
  actor: {
    select: {
      fullNameAr: true,
      fullNameEn: true,
      systemRole: true,
    },
  },
} as const;

const safeDocumentAccessSelect = {
  id: true,
  action: true,
  reason: true,
  succeeded: true,
  createdAt: true,
  actor: {
    select: {
      fullNameAr: true,
      fullNameEn: true,
      systemRole: true,
    },
  },
  document: {
    select: {
      type: true,
      status: true,
      reservation: {
        select: {
          id: true,
          reference: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class AdminOperationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async overview(since: Date, now: Date) {
    const openStatuses = [
      "PENDING_REVIEW",
      "UNDER_REVIEW",
      "MORE_INFORMATION_REQUIRED",
      "PRE_APPROVED",
      "ALTERNATIVE_OFFERED",
    ] as const;
    return Promise.all([
      this.prisma.client.reservation.count({ where: { status: { in: [...openStatuses] } } }),
      this.prisma.client.booking.count({ where: { status: "CONFIRMED" } }),
      this.prisma.client.booking.count({ where: { status: "ACTIVE" } }),
      this.prisma.client.vehicle.count({ where: { status: "AVAILABLE" } }),
      this.prisma.client.booking.count({
        where: { status: "ACTIVE", returnAt: { lt: now } },
      }),
      this.prisma.client.reservation.count({
        where: {
          status: "PRE_APPROVED",
          preApprovalExpiresAt: { gt: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.client.notificationDelivery.count({ where: { status: "FAILED" } }),
      this.prisma.client.review.count({ where: { status: "PENDING" } }),
      this.prisma.client.vehicle.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.client.reservation.findMany({
        where: {
          OR: [{ submittedAt: { gte: since } }, { completedAt: { gte: since } }],
        },
        select: { submittedAt: true, completedAt: true },
      }),
      this.prisma.client.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: safeAuditSelect,
      }),
    ]);
  }

  async reportWindow(start: Date, end: Date, branchId?: string) {
    const branchWhere = branchId ? { branchId } : {};
    const cohortWhere = {
      submittedAt: { gte: start, lt: end },
      ...branchWhere,
    };
    return Promise.all([
      this.prisma.client.reservation.findMany({
        where: cohortWhere,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          confirmedAt: true,
          completedAt: true,
          vehicleId: true,
          assignedSalesId: true,
          vehicle: { select: { nameAr: true, nameEn: true } },
          assignedSales: { select: { fullNameAr: true, fullNameEn: true } },
        },
      }),
      this.prisma.client.reservation.findMany({
        where: {
          ...branchWhere,
          OR: [
            { submittedAt: { gte: start, lt: end } },
            { confirmedAt: { gte: start, lt: end } },
            { completedAt: { gte: start, lt: end } },
          ],
        },
        select: { submittedAt: true, confirmedAt: true, completedAt: true },
      }),
      this.prisma.client.reservationEvent.findMany({
        where: {
          toStatus: { in: ["UNDER_REVIEW", "PRE_APPROVED"] },
          reservation: cohortWhere,
        },
        orderBy: { createdAt: "asc" },
        select: {
          reservationId: true,
          toStatus: true,
          createdAt: true,
          reservation: { select: { submittedAt: true, assignedSalesId: true } },
        },
      }),
      this.prisma.client.deposit.findMany({
        where: {
          recordedAt: { gte: start, lt: end },
          ...(branchId ? { reservation: { branchId } } : {}),
        },
        select: {
          amount: true,
          recordedAt: true,
          reservation: { select: { vehicleId: true } },
        },
      }),
      this.prisma.client.booking.findMany({
        where: {
          status: { in: ["CONFIRMED", "ACTIVE", "COMPLETED"] },
          pickupAt: { lt: end },
          returnAt: { gt: start },
          ...branchWhere,
        },
        select: {
          vehicleId: true,
          status: true,
          pickupAt: true,
          returnAt: true,
          completedAt: true,
          vehicle: { select: { nameAr: true, nameEn: true } },
        },
      }),
      this.prisma.client.reservation.groupBy({
        by: ["status"],
        where: cohortWhere,
        _count: { _all: true },
      }),
    ]);
  }

  async reportContext(input: { branchId?: string; now: Date; todayStart: Date; todayEnd: Date }) {
    const branchWhere = input.branchId ? { branchId: input.branchId } : {};
    const futureTolerance = new Date(input.now.getTime() + 5 * 60 * 1000);
    return Promise.all([
      this.prisma.client.branch.findMany({
        where: { active: true },
        orderBy: { nameEn: "asc" },
        select: { id: true, nameAr: true, nameEn: true },
      }),
      this.prisma.client.vehicle.findMany({
        where: { active: true, archivedAt: null, ...branchWhere },
        select: { id: true, status: true, nameAr: true, nameEn: true },
      }),
      this.prisma.client.booking.count({
        where: {
          pickupAt: { gte: input.todayStart, lt: input.todayEnd },
          status: { in: ["CONFIRMED", "ACTIVE"] },
          ...branchWhere,
        },
      }),
      this.prisma.client.booking.count({
        where: {
          returnAt: { gte: input.todayStart, lt: input.todayEnd },
          status: { in: ["ACTIVE", "COMPLETED"] },
          ...branchWhere,
        },
      }),
      this.prisma.client.reservation.count({
        where: { status: { not: "DRAFT" }, submittedAt: null, ...branchWhere },
      }),
      this.prisma.client.reservation.count({
        where: { status: "COMPLETED", completedAt: null, ...branchWhere },
      }),
      this.prisma.client.deposit.count({
        where: {
          amount: { lte: 0 },
          ...(input.branchId ? { reservation: { branchId: input.branchId } } : {}),
        },
      }),
      this.prisma.client.deposit.count({
        where: {
          reservation: {
            branchAttendedAt: null,
            ...(input.branchId ? { branchId: input.branchId } : {}),
          },
        },
      }),
      this.prisma.client.booking.count({
        where: { status: "COMPLETED", completedAt: null, ...branchWhere },
      }),
      this.prisma.client.reservation.count({
        where: { submittedAt: { gt: futureTolerance }, ...branchWhere },
      }),
      this.prisma.client.vehicle.groupBy({
        by: ["status"],
        where: { active: true, archivedAt: null, ...branchWhere },
        _count: { _all: true },
      }),
    ]);
  }

  async communicationStats() {
    const [deliveries, outbox] = await Promise.all([
      this.prisma.client.notificationDelivery.groupBy({
        by: ["channel", "status"],
        _count: { _all: true },
      }),
      this.prisma.client.notificationEvent.groupBy({
        by: ["status"],
        where: { status: { in: ["PENDING", "PROCESSING", "FAILED"] } },
        _count: { _all: true },
      }),
    ]);
    return { deliveries, outbox };
  }

  writeCommunicationAudit(actorId: string, processed: number) {
    return this.prisma.client.auditLog.create({
      data: {
        actorId,
        action: "ADMIN_NOTIFICATION_QUEUE_RUN",
        entityType: "NOTIFICATION_EVENT",
        reason: `PROCESSED_${processed}`,
        succeeded: true,
      },
    });
  }

  async audit(input: {
    cursor?: string;
    action?: string;
    entityType?: string;
    succeeded?: boolean;
    query?: string;
  }) {
    const where = {
      ...(input.action ? { action: input.action } : {}),
      ...(input.entityType ? { entityType: input.entityType } : {}),
      ...(input.succeeded === undefined ? {} : { succeeded: input.succeeded }),
      ...(input.query
        ? {
            OR: [
              { action: { contains: input.query, mode: "insensitive" as const } },
              { entityType: { contains: input.query, mode: "insensitive" as const } },
              { entityId: { contains: input.query, mode: "insensitive" as const } },
              { actor: { fullNameEn: { contains: input.query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
    const [items, actions, entityTypes] = await Promise.all([
      this.prisma.client.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 41,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: safeAuditSelect,
      }),
      this.prisma.client.auditLog.findMany({
        distinct: ["action"],
        orderBy: { action: "asc" },
        select: { action: true },
      }),
      this.prisma.client.auditLog.findMany({
        distinct: ["entityType"],
        orderBy: { entityType: "asc" },
        select: { entityType: true },
      }),
    ]);
    return { items, actions, entityTypes };
  }

  async documentAccess(input: {
    cursor?: string;
    action?: string;
    succeeded?: boolean;
    query?: string;
  }) {
    const where = {
      ...(input.action ? { action: input.action } : {}),
      ...(input.succeeded === undefined ? {} : { succeeded: input.succeeded }),
      ...(input.query
        ? {
            OR: [
              { action: { contains: input.query, mode: "insensitive" as const } },
              { reason: { contains: input.query, mode: "insensitive" as const } },
              { actor: { fullNameEn: { contains: input.query, mode: "insensitive" as const } } },
              { actor: { fullNameAr: { contains: input.query, mode: "insensitive" as const } } },
              {
                document: {
                  reservation: {
                    reference: { contains: input.query, mode: "insensitive" as const },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [items, actions] = await Promise.all([
      this.prisma.client.documentAccessLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 41,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: safeDocumentAccessSelect,
      }),
      this.prisma.client.documentAccessLog.findMany({
        distinct: ["action"],
        orderBy: { action: "asc" },
        select: { action: true },
      }),
    ]);
    return { items, actions };
  }
}
