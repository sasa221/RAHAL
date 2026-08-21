import { Injectable } from "@nestjs/common";
import type {
  Prisma,
  StaffMfaChallengeKind,
  SystemRole,
  UserStatus,
  VerificationPurpose,
} from "@rahal/database";
import { PrismaService } from "../database/prisma.service";

export type AuthUserRecord = {
  id: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  fullNameAr: string | null;
  fullNameEn: string;
  preferredLocale: string;
  systemRole: SystemRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  mustChangePassword: boolean;
  staffMfaCredential: {
    id: string;
    secretCiphertext: string;
    enabledAt: Date;
    lastUsedCounter: bigint | null;
  } | null;
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
  mustChangePassword: true,
  staffMfaCredential: {
    select: {
      id: true,
      secretCiphertext: true,
      enabledAt: true,
      lastUsedCounter: true,
    },
  },
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
    phone?: string;
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
    mfaVerifiedAt?: Date;
  }) {
    return this.prisma.client.session.create({
      data: input,
      select: { id: true, expiresAt: true },
    });
  }

  findSession(refreshTokenHash: string) {
    return this.prisma.client.session.findFirst({
      where: { refreshTokenHash, status: "ACTIVE", expiresAt: { gt: new Date() } },
      select: {
        id: true,
        expiresAt: true,
        mfaVerifiedAt: true,
        user: { select: authUserSelect },
      },
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
      await transaction.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          temporaryPasswordIssuedAt: null,
        },
      });
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
      await transaction.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          temporaryPasswordIssuedAt: null,
        },
      });
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

  invalidateContactChangeChallenges(userId: string, kind: "EMAIL" | "PHONE") {
    return this.prisma.client.contactChangeChallenge.updateMany({
      where: { userId, kind, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  createContactChangeChallenge(input: {
    userId: string;
    kind: "EMAIL" | "PHONE";
    valueHash: string;
    codeHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.client.contactChangeChallenge.create({
      data: input,
      select: { id: true, expiresAt: true },
    });
  }

  findActiveContactChangeChallenge(userId: string, kind: "EMAIL" | "PHONE", valueHash: string) {
    return this.prisma.client.contactChangeChallenge.findFirst({
      where: { userId, kind, valueHash, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, codeHash: true, attempts: true, expiresAt: true },
    });
  }

  incrementContactChangeAttempts(id: string) {
    return this.prisma.client.contactChangeChallenge.update({
      where: { id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
  }

  completeContactChange(input: {
    challengeId: string;
    userId: string;
    currentSessionId: string;
    kind: "EMAIL" | "PHONE";
    valueHash: string;
    value: string;
    audit: { ipHash?: string; userAgent?: string };
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const consumed = await transaction.contactChangeChallenge.updateMany({
        where: {
          id: input.challengeId,
          userId: input.userId,
          kind: input.kind,
          valueHash: input.valueHash,
          usedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 5 },
        },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error("CONTACT_CHANGE_STATE_CONFLICT");

      const verifiedAt = new Date();
      const user = await transaction.user.update({
        where: { id: input.userId },
        data:
          input.kind === "EMAIL"
            ? { email: input.value, emailVerifiedAt: verifiedAt }
            : { phone: input.value },
        select: authUserSelect,
      });
      const revoked = await transaction.session.updateMany({
        where: {
          userId: input.userId,
          id: { not: input.currentSessionId },
          status: "ACTIVE",
        },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      await transaction.contactChangeChallenge.updateMany({
        where: { userId: input.userId, kind: input.kind, usedAt: null },
        data: { usedAt: verifiedAt },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.userId,
          action: "AUTH_CONTACT_CHANGE_COMPLETE",
          entityType: "USER",
          entityId: input.userId,
          reason: input.kind,
          newData: { channel: input.kind, otherSessionsRevoked: revoked.count },
          ...input.audit,
          succeeded: true,
        },
      });
      return { user, revoked: revoked.count };
    });
  }

  invalidateStaffLoginChallenges(userId: string) {
    return this.prisma.client.staffLoginChallenge.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  createStaffLoginChallenge(input: {
    userId: string;
    tokenHash: string;
    kind: StaffMfaChallengeKind;
    secretCiphertext?: string;
    expiresAt: Date;
    ipHash?: string;
  }) {
    return this.prisma.client.staffLoginChallenge.create({
      data: input,
      select: { id: true, kind: true, expiresAt: true },
    });
  }

  findStaffLoginChallenge(tokenHash: string) {
    return this.prisma.client.staffLoginChallenge.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        kind: true,
        secretCiphertext: true,
        attempts: true,
        expiresAt: true,
        user: { select: authUserSelect },
      },
    });
  }

  incrementStaffLoginChallengeAttempts(id: string) {
    return this.prisma.client.staffLoginChallenge.update({
      where: { id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
  }

  enableStaffMfa(input: {
    challengeId: string;
    userId: string;
    secretCiphertext: string;
    usedCounter: bigint;
    recoveryCodeHashes: string[];
    audit: { ipHash?: string; userAgent?: string };
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const consumed = await transaction.staffLoginChallenge.updateMany({
        where: {
          id: input.challengeId,
          userId: input.userId,
          kind: "ENROLL",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error("STAFF_MFA_STATE_CONFLICT");

      const credential = await transaction.staffMfaCredential.create({
        data: {
          userId: input.userId,
          secretCiphertext: input.secretCiphertext,
          enabledAt: new Date(),
          lastUsedCounter: input.usedCounter,
          recoveryCodes: {
            createMany: {
              data: input.recoveryCodeHashes.map((codeHash) => ({ codeHash })),
            },
          },
        },
        select: {
          id: true,
          secretCiphertext: true,
          enabledAt: true,
          lastUsedCounter: true,
        },
      });
      await transaction.session.updateMany({
        where: { userId: input.userId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.userId,
          action: "AUTH_STAFF_MFA_ENROLL",
          entityType: "USER",
          entityId: input.userId,
          reason: "AUTHENTICATOR_AND_RECOVERY_CODES",
          ...input.audit,
          succeeded: true,
        },
      });
      return credential;
    });
  }

  completeStaffMfaTotp(input: {
    challengeId: string;
    userId: string;
    credentialId: string;
    usedCounter: bigint;
    audit: { ipHash?: string; userAgent?: string };
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const updated = await transaction.staffMfaCredential.updateMany({
        where: {
          id: input.credentialId,
          userId: input.userId,
          OR: [{ lastUsedCounter: null }, { lastUsedCounter: { lt: input.usedCounter } }],
        },
        data: { lastUsedCounter: input.usedCounter },
      });
      if (updated.count !== 1) throw new Error("STAFF_MFA_STATE_CONFLICT");
      await this.consumeStaffChallenge(transaction, input.challengeId, input.userId);
      await transaction.auditLog.create({
        data: {
          actorId: input.userId,
          action: "AUTH_STAFF_MFA_VERIFY",
          entityType: "USER",
          entityId: input.userId,
          reason: "TOTP",
          ...input.audit,
          succeeded: true,
        },
      });
    });
  }

  completeStaffMfaRecovery(input: {
    challengeId: string;
    userId: string;
    credentialId: string;
    recoveryCodeHash: string;
    audit: { ipHash?: string; userAgent?: string };
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const used = await transaction.staffMfaRecoveryCode.updateMany({
        where: {
          credentialId: input.credentialId,
          codeHash: input.recoveryCodeHash,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1) throw new Error("STAFF_MFA_STATE_CONFLICT");
      await this.consumeStaffChallenge(transaction, input.challengeId, input.userId);
      await transaction.auditLog.create({
        data: {
          actorId: input.userId,
          action: "AUTH_STAFF_MFA_VERIFY",
          entityType: "USER",
          entityId: input.userId,
          reason: "RECOVERY_CODE",
          ...input.audit,
          succeeded: true,
        },
      });
    });
  }

  completeVerification(id: string, userId: string, _purpose: VerificationPurpose) {
    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.verificationCode.update({ where: { id }, data: { usedAt: new Date() } });
      const verifiedAt = new Date();
      let user = await transaction.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: verifiedAt },
        select: authUserSelect,
      });
      if (user.status === "PENDING_VERIFICATION" && user.emailVerifiedAt) {
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

  private async consumeStaffChallenge(
    transaction: Prisma.TransactionClient,
    challengeId: string,
    userId: string,
  ) {
    const consumed = await transaction.staffLoginChallenge.updateMany({
      where: {
        id: challengeId,
        userId,
        kind: "VERIFY",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) throw new Error("STAFF_MFA_STATE_CONFLICT");
  }
}
