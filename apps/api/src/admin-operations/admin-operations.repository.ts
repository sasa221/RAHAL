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
}
