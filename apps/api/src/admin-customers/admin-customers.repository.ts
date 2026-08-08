import { Injectable } from "@nestjs/common";
import type { Prisma } from "@rahal/database";
import { PrismaService } from "../database/prisma.service";

const customerListSelect = {
  id: true,
  email: true,
  phone: true,
  fullNameAr: true,
  fullNameEn: true,
  status: true,
  preferredLocale: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  createdAt: true,
  _count: { select: { reservations: true, bookings: true } },
  sessions: {
    orderBy: { lastSeenAt: "desc" as const },
    take: 1,
    select: { lastSeenAt: true },
  },
} as const;

@Injectable()
export class AdminCustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async page(input: { cursor?: string; query?: string; status?: string; verification?: string }) {
    const where: Prisma.UserWhereInput = {
      systemRole: "CUSTOMER",
      ...(input.status && input.status !== "ALL" ? { status: input.status as never } : {}),
      ...(input.verification === "VERIFIED"
        ? { emailVerifiedAt: { not: null }, phoneVerifiedAt: { not: null } }
        : input.verification === "PENDING"
          ? { OR: [{ emailVerifiedAt: null }, { phoneVerifiedAt: null }] }
          : {}),
      ...(input.query
        ? {
            AND: [
              {
                OR: [
                  { fullNameEn: { contains: input.query, mode: "insensitive" } },
                  { fullNameAr: { contains: input.query, mode: "insensitive" } },
                  { email: { contains: input.query, mode: "insensitive" } },
                  { phone: { contains: input.query } },
                ],
              },
            ],
          }
        : {}),
    };
    const [items, total, active, pendingVerification, restricted] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 31,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: customerListSelect,
      }),
      this.prisma.client.user.count({ where: { systemRole: "CUSTOMER" } }),
      this.prisma.client.user.count({ where: { systemRole: "CUSTOMER", status: "ACTIVE" } }),
      this.prisma.client.user.count({
        where: {
          systemRole: "CUSTOMER",
          OR: [{ emailVerifiedAt: null }, { phoneVerifiedAt: null }],
        },
      }),
      this.prisma.client.user.count({
        where: { systemRole: "CUSTOMER", status: { in: ["SUSPENDED", "BLOCKED"] } },
      }),
    ]);
    return { items, summary: { total, active, pendingVerification, restricted } };
  }

  detail(id: string) {
    return this.prisma.client.user.findFirst({
      where: { id, systemRole: "CUSTOMER" },
      select: {
        ...customerListSelect,
        notificationPreference: {
          select: {
            inAppEnabled: true,
            pushEnabled: true,
            emailEnabled: true,
            whatsappEnabled: true,
            marketingEnabled: true,
          },
        },
        reservations: {
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            reference: true,
            status: true,
            pickupAt: true,
            returnAt: true,
            createdAt: true,
            vehicle: { select: { nameAr: true, nameEn: true } },
          },
        },
      },
    });
  }

  statusAudit(id: string) {
    return this.prisma.client.auditLog.findMany({
      where: { entityType: "CUSTOMER", entityId: id, action: "CUSTOMER_STATUS_CHANGE" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        reason: true,
        createdAt: true,
        actor: { select: { fullNameAr: true, fullNameEn: true } },
      },
    });
  }

  async updateStatus(
    id: string,
    status: "ACTIVE" | "SUSPENDED" | "BLOCKED",
    audit: { actorId: string; reason: string; previousStatus: string },
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      const customer = await transaction.user.update({
        where: { id },
        data: { status },
        select: customerListSelect,
      });
      const revoked = await transaction.session.updateMany({
        where: { userId: id, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: audit.actorId,
          action: "CUSTOMER_STATUS_CHANGE",
          entityType: "CUSTOMER",
          entityId: id,
          reason: audit.reason,
          previousData: { status: audit.previousStatus },
          newData: { status, sessionsRevoked: revoked.count },
        },
      });
      return customer;
    });
  }
}
