import { Injectable } from "@nestjs/common";
import type { SystemRole, UserStatus, VerificationPurpose } from "@rahal/database";
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

  listSessions(userId: string) {
    return this.prisma.client.session.findMany({
      where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        expiresAt: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });
  }

  revokeOwnedSession(userId: string, id: string) {
    return this.prisma.client.session.updateMany({
      where: { id, userId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
  }

  revokeOtherSessions(userId: string, currentSessionId: string) {
    return this.prisma.client.session.updateMany({
      where: { userId, id: { not: currentSessionId }, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
  }

  changePassword(
    userId: string,
    passwordHash: string,
    currentSessionId: string,
    audit: { ipHash?: string; userAgent?: string },
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: userId }, data: { passwordHash } });
      const revoked = await transaction.session.updateMany({
        where: { userId, id: { not: currentSessionId }, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: userId,
          action: "AUTH_PASSWORD_CHANGE",
          entityType: "USER",
          entityId: userId,
          reason: "ACCOUNT_SECURITY",
          ...audit,
          succeeded: true,
        },
      });
      return revoked;
    });
  }

  resetPassword(
    userId: string,
    verificationId: string,
    passwordHash: string,
    audit: { ipHash?: string; userAgent?: string },
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.verificationCode.update({
        where: { id: verificationId },
        data: { usedAt: new Date() },
      });
      await transaction.user.update({ where: { id: userId }, data: { passwordHash } });
      const revoked = await transaction.session.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: userId,
          action: "AUTH_PASSWORD_RESET_COMPLETE",
          entityType: "USER",
          entityId: userId,
          reason: "ALL_SESSIONS_REVOKED",
          ...audit,
          succeeded: true,
        },
      });
      return revoked;
    });
  }

  invalidateVerificationCodes(userId: string, purpose: VerificationPurpose) {
    return this.prisma.client.verificationCode.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  createVerificationCode(input: {
    userId: string;
    purpose: VerificationPurpose;
    codeHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.client.verificationCode.create({
      data: input,
      select: { id: true, expiresAt: true },
    });
  }

  findActiveVerificationCode(userId: string, purpose: VerificationPurpose) {
    return this.prisma.client.verificationCode.findFirst({
      where: { userId, purpose, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, codeHash: true, attempts: true, expiresAt: true },
    });
  }

  incrementVerificationAttempts(id: string) {
    return this.prisma.client.verificationCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
  }

  completeVerification(id: string, userId: string, purpose: VerificationPurpose) {
    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.verificationCode.update({ where: { id }, data: { usedAt: new Date() } });
      const verifiedAt = new Date();
      let user = await transaction.user.update({
        where: { id: userId },
        data:
          purpose === "VERIFY_EMAIL"
            ? { emailVerifiedAt: verifiedAt }
            : { phoneVerifiedAt: verifiedAt },
        select: authUserSelect,
      });
      if (user.status === "PENDING_VERIFICATION" && user.emailVerifiedAt && user.phoneVerifiedAt) {
        user = await transaction.user.update({
          where: { id: userId },
          data: { status: "ACTIVE" },
          select: authUserSelect,
        });
      }
      return user;
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
