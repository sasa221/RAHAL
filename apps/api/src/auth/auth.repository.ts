import { Injectable } from "@nestjs/common";
import type { SystemRole, UserStatus } from "@rahal/database";
import { PrismaService } from "../database/prisma.service";

export type AuthUserRecord = {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  fullNameAr: string | null;
  fullNameEn: string;
  preferredLocale: string;
  systemRole: SystemRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
};

const authUserSelect = {
  id: true,
  email: true,
  phone: true,
  passwordHash: true,
  fullNameAr: true,
  fullNameEn: true,
  preferredLocale: true,
  systemRole: true,
  status: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
} as const;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdentifier(identifier: string) {
    return this.prisma.client.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
      select: authUserSelect,
    });
  }

  createUser(input: {
    email: string;
    phone: string;
    passwordHash: string;
    fullNameAr?: string;
    fullNameEn: string;
    preferredLocale: "ar" | "en";
  }) {
    return this.prisma.client.user.create({ data: input, select: authUserSelect });
  }

  createSession(input: {
    userId: string;
    refreshTokenHash: string;
    ipHash?: string;
    userAgent?: string;
    expiresAt: Date;
  }) {
    return this.prisma.client.session.create({
      data: input,
      select: { id: true, expiresAt: true },
    });
  }

  findSession(refreshTokenHash: string) {
    return this.prisma.client.session.findFirst({
      where: { refreshTokenHash, status: "ACTIVE", expiresAt: { gt: new Date() } },
      select: { id: true, expiresAt: true, user: { select: authUserSelect } },
    });
  }

  touchSession(id: string) {
    return this.prisma.client.session.update({ where: { id }, data: { lastSeenAt: new Date() } });
  }

  revokeSession(refreshTokenHash: string) {
    return this.prisma.client.session.updateMany({
      where: { refreshTokenHash, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
  }

  writeAudit(input: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    reason?: string;
    ipHash?: string;
    userAgent?: string;
    succeeded: boolean;
  }) {
    return this.prisma.client.auditLog.create({ data: input });
  }
}
