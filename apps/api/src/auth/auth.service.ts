import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  AccountSecurityOverview,
  AuthLoginResult,
  AuthSession,
  AuthUser,
  PasswordChangeResult,
  PasswordResetRequestResult,
  PasswordResetResult,
  SessionRevocationResult,
  StaffMfaChallenge,
  StaffMfaCompletion,
} from "@rahal/contracts";
import type { VerificationPurpose } from "@rahal/database";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { loadApiConfig } from "../config";
import { sendConfiguredEmail } from "../email-delivery";
import { AuthRepository, type AuthUserRecord } from "./auth.repository";
import type {
  ConfirmVerificationDto,
  ChangePasswordDto,
  ConfirmStaffMfaDto,
  ConfirmPasswordResetDto,
  LoginDto,
  RegisterDto,
  RequestPasswordResetDto,
  RequestVerificationDto,
} from "./auth.dto";
import { PasswordService } from "./password.service";
import { StaffMfaService } from "./staff-mfa.service";
import { buildPasswordResetEmail } from "./password-reset-email.template";
import { buildVerificationEmail } from "./verification-email.template";

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const verificationLifetimeMs = 10 * 60 * 1000;
const verificationAttemptLimit = 5;
const twilioVerifyCodeMarker = "TWILIO_VERIFY_WHATSAPP";
const staffMfaChallengeLifetimeMs = 5 * 60 * 1000;
const staffMfaAttemptLimit = 5;

export type AuthRequestContext = { ipHash?: string; userAgent?: string };

function normalizePhone(value: string) {
  return value.replace(/[\s()-]/g, "");
}

function normalizeIdentifier(value: string) {
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : normalizePhone(trimmed);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toAuthUser(user: AuthUserRecord): AuthUser {
  const staffAccount = user.systemRole !== "CUSTOMER";
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullNameEn,
    preferredLocale: user.preferredLocale === "en" ? "en" : "ar",
    role: user.systemRole,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    phoneVerified: Boolean(user.phoneVerifiedAt),
    mfaEnabled: Boolean(user.staffMfaCredential),
    securityAction:
      staffAccount && !user.staffMfaCredential
        ? "ENROLL_MFA"
        : staffAccount && user.mustChangePassword
          ? "CHANGE_TEMPORARY_PASSWORD"
          : null,
  };
}

@Injectable()
export class AuthService {
  private readonly config = loadApiConfig();

  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly staffMfa: StaffMfaService = new StaffMfaService(),
  ) {}

  async register(input: RegisterDto, context: AuthRequestContext) {
    const email = input.email.trim().toLowerCase();
    const phone = normalizePhone(input.phone);
    if (
      (await this.repository.findByIdentifier(email)) ||
      (await this.repository.findByIdentifier(phone))
    ) {
      throw new ConflictException("An account already uses that email or phone number.");
    }

    try {
      const user = await this.repository.createUser({
        email,
        phone,
        passwordHash: await this.passwords.hash(input.password),
        fullNameAr: input.fullNameAr?.trim() || undefined,
        fullNameEn: input.fullNameEn.trim(),
        preferredLocale: input.preferredLocale,
      });
      await this.repository.writeAudit({
        actorId: user.id,
        action: "AUTH_REGISTER",
        entityType: "USER",
        entityId: user.id,
        ...context,
        succeeded: true,
      });
      return this.issueSession(user, context);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException("An account already uses that email or phone number.");
      }
      throw error;
    }
  }

  async login(input: LoginDto, context: AuthRequestContext) {
    const identifier = normalizeIdentifier(input.identifier);
    const user = await this.repository.findByIdentifier(identifier);
    if (!user || !(await this.passwords.verify(input.password, user.passwordHash))) {
      await this.repository.writeAudit({
        action: "AUTH_LOGIN",
        entityType: "USER",
        reason: "INVALID_CREDENTIALS",
        ...context,
        succeeded: false,
      });
      throw new UnauthorizedException("Invalid email, phone, or password.");
    }

    if (["SUSPENDED", "BLOCKED", "ARCHIVED"].includes(user.status)) {
      await this.repository.writeAudit({
        actorId: user.id,
        action: "AUTH_LOGIN",
        entityType: "USER",
        entityId: user.id,
        reason: `ACCOUNT_${user.status}`,
        ...context,
        succeeded: false,
      });
      throw new ForbiddenException("This account cannot start a session.");
    }

    if (user.systemRole !== "CUSTOMER") {
      const challengeToken = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + staffMfaChallengeLifetimeMs);
      const action = user.staffMfaCredential ? "VERIFY" : "ENROLL";
      const secretCiphertext =
        action === "ENROLL"
          ? this.staffMfa.encryptSecret(this.staffMfa.generateSecret())
          : undefined;
      await this.repository.invalidateStaffLoginChallenges(user.id);
      await this.repository.createStaffLoginChallenge({
        userId: user.id,
        tokenHash: hashSessionToken(challengeToken),
        kind: action,
        secretCiphertext,
        expiresAt,
        ipHash: context.ipHash,
      });
      await this.repository.writeAudit({
        actorId: user.id,
        action: "AUTH_LOGIN_PASSWORD",
        entityType: "USER",
        entityId: user.id,
        reason: `STAFF_MFA_${action}_REQUIRED`,
        ...context,
        succeeded: true,
      });
      return {
        challengeToken,
        result: {
          kind: "STAFF_MFA_REQUIRED",
          action,
          expiresAt: expiresAt.toISOString(),
        } satisfies AuthLoginResult,
      };
    }

    await this.repository.writeAudit({
      actorId: user.id,
      action: "AUTH_LOGIN",
      entityType: "USER",
      entityId: user.id,
      ...context,
      succeeded: true,
    });
    return this.issueSession(user, context);
  }

  async getSession(token: string | undefined): Promise<AuthSession> {
    const { session } = await this.requireSessionRecord(token);
    return this.serializeSession(session);
  }

  async getSessionStatus(token: string | undefined): Promise<AuthSession> {
    const { session } = await this.requireSessionRecord(token, false);
    return this.serializeSession(session);
  }

  async getStaffMfaChallenge(token: string | undefined): Promise<StaffMfaChallenge> {
    const challenge = await this.requireStaffMfaChallenge(token);
    const secret =
      challenge.kind === "ENROLL" && challenge.secretCiphertext
        ? this.staffMfa.decryptSecret(challenge.secretCiphertext)
        : null;
    return {
      action: challenge.kind,
      expiresAt: challenge.expiresAt.toISOString(),
      account: this.maskEmail(challenge.user.email),
      enrollment: secret
        ? {
            secret,
            otpAuthUri: this.staffMfa.buildOtpAuthUri({
              email: challenge.user.email,
              secret,
            }),
          }
        : null,
    };
  }

  async completeStaffMfaChallenge(
    token: string | undefined,
    input: ConfirmStaffMfaDto,
    context: AuthRequestContext,
  ): Promise<{ token: string; completion: StaffMfaCompletion }> {
    const challenge = await this.requireStaffMfaChallenge(token);
    const code = input.code.trim().toUpperCase();

    try {
      if (challenge.kind === "ENROLL") {
        if (!challenge.secretCiphertext || !/^\d{6}$/.test(code)) {
          return await this.rejectStaffMfaChallenge(challenge, context);
        }
        const secret = this.staffMfa.decryptSecret(challenge.secretCiphertext);
        const counter = this.staffMfa.verifyTotp(secret, code, null);
        if (counter === null) return await this.rejectStaffMfaChallenge(challenge, context);

        const recoveryCodes = this.staffMfa.generateRecoveryCodes();
        const credential = await this.repository.enableStaffMfa({
          challengeId: challenge.id,
          userId: challenge.user.id,
          secretCiphertext: challenge.secretCiphertext,
          usedCounter: counter,
          recoveryCodeHashes: recoveryCodes.map((recoveryCode) =>
            this.staffMfa.hashRecoveryCode(challenge.user.id, recoveryCode),
          ),
          audit: context,
        });
        const issued = await this.issueSession(
          { ...challenge.user, staffMfaCredential: credential },
          context,
          true,
        );
        return {
          token: issued.token,
          completion: { session: issued.session, recoveryCodes },
        };
      }

      const credential = challenge.user.staffMfaCredential;
      if (!credential) return await this.rejectStaffMfaChallenge(challenge, context);

      if (/^\d{6}$/.test(code)) {
        const secret = this.staffMfa.decryptSecret(credential.secretCiphertext);
        const counter = this.staffMfa.verifyTotp(secret, code, credential.lastUsedCounter);
        if (counter === null) return await this.rejectStaffMfaChallenge(challenge, context);
        await this.repository.completeStaffMfaTotp({
          challengeId: challenge.id,
          userId: challenge.user.id,
          credentialId: credential.id,
          usedCounter: counter,
          audit: context,
        });
      } else {
        await this.repository.completeStaffMfaRecovery({
          challengeId: challenge.id,
          userId: challenge.user.id,
          credentialId: credential.id,
          recoveryCodeHash: this.staffMfa.hashRecoveryCode(challenge.user.id, code),
          audit: context,
        });
      }

      const issued = await this.issueSession(challenge.user, context, true);
      return {
        token: issued.token,
        completion: { session: issued.session, recoveryCodes: null },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error && error.message === "STAFF_MFA_STATE_CONFLICT") {
        return await this.rejectStaffMfaChallenge(challenge, context);
      }
      throw error;
    }
  }

  async logout(token: string | undefined, context: AuthRequestContext) {
    if (!token) return;
    await this.repository.revokeSession(hashSessionToken(token));
    await this.repository.writeAudit({
      action: "AUTH_LOGOUT",
      entityType: "SESSION",
      ...context,
      succeeded: true,
    });
  }

  async securityOverview(token: string | undefined): Promise<AccountSecurityOverview> {
    const { session } = await this.requireSessionRecord(token);
    const records = await this.repository.listSessions(session.user.id);
    return {
      sessions: records.map((record) => {
        const labels = describeUserAgent(record.userAgent);
        return {
          id: record.id,
          current: session.id === record.id,
          deviceLabel: labels.device,
          browserLabel: labels.browser,
          createdAt: record.createdAt.toISOString(),
          lastSeenAt: record.lastSeenAt.toISOString(),
          expiresAt: record.expiresAt.toISOString(),
        };
      }),
    };
  }

  async revokeOwnedSession(
    token: string | undefined,
    id: string,
    context: AuthRequestContext,
  ): Promise<SessionRevocationResult> {
    const { session } = await this.requireSessionRecord(token);
    const result = await this.repository.revokeOwnedSession(session.user.id, id);
    const currentSessionRevoked = result.count > 0 && session.id === id;
    await this.repository.writeAudit({
      actorId: session.user.id,
      action: "AUTH_SESSION_REVOKE",
      entityType: "SESSION",
      entityId: id,
      reason: currentSessionRevoked ? "CURRENT_SESSION" : "OWNED_SESSION",
      ...context,
      succeeded: result.count > 0,
    });
    return { revoked: result.count, currentSessionRevoked };
  }

  async revokeOtherSessions(
    token: string | undefined,
    context: AuthRequestContext,
  ): Promise<SessionRevocationResult> {
    const { session } = await this.requireSessionRecord(token);
    const result = await this.repository.revokeOtherSessions(session.user.id, session.id);
    await this.repository.writeAudit({
      actorId: session.user.id,
      action: "AUTH_SESSIONS_REVOKE_OTHERS",
      entityType: "SESSION",
      entityId: session.id,
      reason: "ACCOUNT_SECURITY",
      ...context,
      succeeded: true,
    });
    return { revoked: result.count, currentSessionRevoked: false };
  }

  async changePassword(
    token: string | undefined,
    input: ChangePasswordDto,
    context: AuthRequestContext,
  ): Promise<PasswordChangeResult> {
    const { session } = await this.requireSessionRecord(token, false);
    if (
      session.user.systemRole !== "CUSTOMER" &&
      (!session.user.staffMfaCredential || !session.mfaVerifiedAt)
    ) {
      throw new ForbiddenException("Staff MFA verification is required before changing password.");
    }
    if (!(await this.passwords.verify(input.currentPassword, session.user.passwordHash))) {
      await this.repository.writeAudit({
        actorId: session.user.id,
        action: "AUTH_PASSWORD_CHANGE",
        entityType: "USER",
        entityId: session.user.id,
        reason: "INVALID_CURRENT_PASSWORD",
        ...context,
        succeeded: false,
      });
      throw new UnauthorizedException("The current password is incorrect.");
    }
    if (await this.passwords.verify(input.newPassword, session.user.passwordHash)) {
      throw new ConflictException("The new password must be different from the current password.");
    }
    const revoked = await this.repository.changePassword(
      session.user.id,
      await this.passwords.hash(input.newPassword),
      session.id,
      context,
    );
    return { passwordChanged: true, otherSessionsRevoked: revoked.count };
  }

  async requestPasswordReset(
    input: RequestPasswordResetDto,
    context: AuthRequestContext,
  ): Promise<PasswordResetRequestResult> {
    const user = await this.repository.findByIdentifier(normalizeIdentifier(input.identifier));
    if (!user || ["SUSPENDED", "BLOCKED", "ARCHIVED"].includes(user.status)) {
      await this.repository.writeAudit({
        action: "AUTH_PASSWORD_RESET_REQUEST",
        entityType: "USER",
        reason: "GENERIC_ACCEPTED",
        ...context,
        succeeded: true,
      });
      return { accepted: true };
    }

    const code = String(randomInt(100_000, 1_000_000));
    const expiresAt = new Date(Date.now() + verificationLifetimeMs);
    await this.repository.invalidateVerificationCodes(user.id, "RESET_PASSWORD");
    await this.repository.createVerificationCode({
      userId: user.id,
      purpose: "RESET_PASSWORD",
      codeHash: this.hashVerificationCode(user.id, "RESET_PASSWORD", code),
      expiresAt,
    });

    try {
      await this.deliverPasswordResetCode({
        destination: user.email,
        locale: user.preferredLocale,
        code,
        expiresAt,
      });
      await this.repository.writeAudit({
        actorId: user.id,
        action: "AUTH_PASSWORD_RESET_REQUEST",
        entityType: "USER",
        entityId: user.id,
        reason: "EMAIL_QUEUED",
        ...context,
        succeeded: true,
      });
    } catch {
      await this.repository.invalidateVerificationCodes(user.id, "RESET_PASSWORD");
      await this.repository.writeAudit({
        actorId: user.id,
        action: "AUTH_PASSWORD_RESET_REQUEST",
        entityType: "USER",
        entityId: user.id,
        reason: "DELIVERY_UNAVAILABLE",
        ...context,
        succeeded: false,
      });
    }
    return { accepted: true };
  }

  async confirmPasswordReset(
    input: ConfirmPasswordResetDto,
    context: AuthRequestContext,
  ): Promise<PasswordResetResult> {
    const user = await this.repository.findByIdentifier(normalizeIdentifier(input.identifier));
    if (!user) throw new BadRequestException("Invalid or expired password reset code.");
    const record = await this.repository.findActiveVerificationCode(user.id, "RESET_PASSWORD");
    if (!record || record.attempts >= verificationAttemptLimit) {
      throw new BadRequestException("Invalid or expired password reset code.");
    }
    const expected = Buffer.from(record.codeHash, "hex");
    const actual = Buffer.from(
      this.hashVerificationCode(user.id, "RESET_PASSWORD", input.code),
      "hex",
    );
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      const attempt = await this.repository.incrementVerificationAttempts(record.id);
      if (attempt.attempts >= verificationAttemptLimit) {
        throw new HttpException(
          "Too many reset attempts. Request a new code.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException("Invalid or expired password reset code.");
    }
    if (await this.passwords.verify(input.newPassword, user.passwordHash)) {
      throw new ConflictException("The new password must be different from the previous password.");
    }
    await this.repository.resetPassword(
      user.id,
      record.id,
      await this.passwords.hash(input.newPassword),
      context,
    );
    return { passwordReset: true };
  }

  async requestVerification(
    token: string | undefined,
    input: RequestVerificationDto,
    context: AuthRequestContext,
  ) {
    const session = await this.getSession(token);
    const purpose = this.verificationPurpose(input.channel);
    if (
      (input.channel === "email" && session.user.emailVerified) ||
      (input.channel === "phone" && session.user.phoneVerified)
    ) {
      throw new ConflictException("This contact method is already verified.");
    }
    if (!this.hasVerificationDelivery(input.channel)) {
      throw new ServiceUnavailableException("Verification delivery provider is not configured.");
    }

    const usesTwilioVerify = this.usesTwilioVerifyWhatsApp(input.channel);
    const code = usesTwilioVerify ? "" : String(randomInt(100_000, 1_000_000));
    const expiresAt = new Date(Date.now() + verificationLifetimeMs);
    await this.repository.invalidateVerificationCodes(session.user.id, purpose);
    await this.repository.createVerificationCode({
      userId: session.user.id,
      purpose,
      codeHash: this.hashVerificationCode(
        session.user.id,
        purpose,
        usesTwilioVerify ? twilioVerifyCodeMarker : code,
      ),
      expiresAt,
    });

    try {
      await this.deliverVerificationCode({
        channel: input.channel,
        destination: input.channel === "email" ? session.user.email : session.user.phone,
        locale: session.user.preferredLocale,
        code,
        expiresAt,
      });
    } catch (error) {
      await this.repository.invalidateVerificationCodes(session.user.id, purpose);
      await this.repository.writeAudit({
        actorId: session.user.id,
        action: "AUTH_VERIFICATION_REQUEST",
        entityType: "USER",
        entityId: session.user.id,
        reason: `${purpose}_DELIVERY_FAILED`,
        ...context,
        succeeded: false,
      });
      throw error;
    }

    await this.repository.writeAudit({
      actorId: session.user.id,
      action: "AUTH_VERIFICATION_REQUEST",
      entityType: "USER",
      entityId: session.user.id,
      reason: purpose,
      ...context,
      succeeded: true,
    });

    return {
      channel: input.channel,
      destination:
        input.channel === "email"
          ? this.maskEmail(session.user.email)
          : this.maskPhone(session.user.phone),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async confirmVerification(
    token: string | undefined,
    input: ConfirmVerificationDto,
    context: AuthRequestContext,
  ) {
    const session = await this.getSession(token);
    const purpose = this.verificationPurpose(input.channel);
    const record = await this.repository.findActiveVerificationCode(session.user.id, purpose);
    if (!record || record.attempts >= verificationAttemptLimit) {
      throw new BadRequestException("Invalid or expired verification code.");
    }

    const twilioVerifyHash = this.hashVerificationCode(
      session.user.id,
      purpose,
      twilioVerifyCodeMarker,
    );
    const providerVerified =
      input.channel === "phone" &&
      record.codeHash === twilioVerifyHash &&
      this.config.verificationTwilioVerifyWhatsApp
        ? await this.checkTwilioWhatsAppVerification({
            destination: session.user.phone,
            code: input.code,
          })
        : undefined;
    const expected = Buffer.from(record.codeHash, "hex");
    const actual = Buffer.from(
      this.hashVerificationCode(session.user.id, purpose, input.code),
      "hex",
    );
    const locallyVerified = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (providerVerified === false || (providerVerified === undefined && !locallyVerified)) {
      const attempt = await this.repository.incrementVerificationAttempts(record.id);
      if (attempt.attempts >= verificationAttemptLimit) {
        throw new HttpException(
          "Too many verification attempts. Request a new code.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException("Invalid or expired verification code.");
    }

    const user = await this.repository.completeVerification(record.id, session.user.id, purpose);
    await this.repository.writeAudit({
      actorId: session.user.id,
      action: "AUTH_VERIFICATION_COMPLETE",
      entityType: "USER",
      entityId: session.user.id,
      reason: purpose,
      ...context,
      succeeded: true,
    });
    return { channel: input.channel, verified: true as const, user: toAuthUser(user) };
  }

  private verificationPurpose(channel: "email" | "phone"): VerificationPurpose {
    return channel === "email" ? "VERIFY_EMAIL" : "VERIFY_PHONE";
  }

  private async requireSessionRecord(token: string | undefined, enforceStaffSecurity = true) {
    if (!token) throw new UnauthorizedException("Authentication is required.");
    const tokenHash = hashSessionToken(token);
    const session = await this.repository.findSession(tokenHash);
    if (!session) throw new UnauthorizedException("The session is invalid or expired.");
    if (["SUSPENDED", "BLOCKED", "ARCHIVED"].includes(session.user.status)) {
      throw new ForbiddenException("This account cannot use the current session.");
    }
    if (enforceStaffSecurity && session.user.systemRole !== "CUSTOMER") {
      if (!session.user.staffMfaCredential || !session.mfaVerifiedAt) {
        throw new ForbiddenException("Staff MFA verification is required.");
      }
      if (session.user.mustChangePassword) {
        throw new ForbiddenException("The temporary password must be changed before continuing.");
      }
    }
    await this.repository.touchSession(session.id);
    return { session };
  }

  private async requireStaffMfaChallenge(token: string | undefined) {
    if (!token) throw new UnauthorizedException("A staff security challenge is required.");
    const challenge = await this.repository.findStaffLoginChallenge(hashSessionToken(token));
    if (
      !challenge ||
      challenge.attempts >= staffMfaAttemptLimit ||
      challenge.user.systemRole === "CUSTOMER"
    ) {
      throw new UnauthorizedException("The staff security challenge is invalid or expired.");
    }
    if (["SUSPENDED", "BLOCKED", "ARCHIVED"].includes(challenge.user.status)) {
      throw new ForbiddenException("This account cannot continue sign in.");
    }
    return challenge;
  }

  private async rejectStaffMfaChallenge(
    challenge: NonNullable<Awaited<ReturnType<AuthRepository["findStaffLoginChallenge"]>>>,
    context: AuthRequestContext,
  ): Promise<never> {
    const attempt = await this.repository.incrementStaffLoginChallengeAttempts(challenge.id);
    await this.repository.writeAudit({
      actorId: challenge.user.id,
      action: "AUTH_STAFF_MFA_VERIFY",
      entityType: "USER",
      entityId: challenge.user.id,
      reason: "INVALID_CODE",
      ...context,
      succeeded: false,
    });
    if (attempt.attempts >= staffMfaAttemptLimit) {
      throw new HttpException(
        "Too many security code attempts. Sign in again.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw new BadRequestException("The security code is invalid or expired.");
  }

  private serializeSession(
    session: NonNullable<Awaited<ReturnType<AuthRepository["findSession"]>>>,
  ): AuthSession {
    return {
      user: toAuthUser(session.user),
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  private hashVerificationCode(userId: string, purpose: VerificationPurpose, code: string) {
    return createHmac("sha256", this.config.authSecret)
      .update(`${userId}:${purpose}:${code}`)
      .digest("hex");
  }

  private async deliverVerificationCode(input: {
    channel: "email" | "phone";
    destination: string;
    locale: string;
    code: string;
    expiresAt: Date;
  }) {
    if (input.channel === "email" && this.config.verificationGmail) {
      await this.deliverGmailVerification(input);
      return;
    }
    if (
      input.channel === "email" &&
      (this.config.verificationBrevo || this.config.verificationEmail)
    ) {
      await this.deliverEmailVerification(input);
      return;
    }
    if (input.channel === "phone" && this.config.verificationWhatsApp) {
      await this.deliverWhatsAppVerification(input);
      return;
    }
    if (input.channel === "phone" && this.config.verificationTwilioVerifyWhatsApp) {
      await this.startTwilioWhatsAppVerification(input);
      return;
    }

    const delivery = this.config.verificationDelivery;
    if (!delivery) {
      throw new ServiceUnavailableException("Verification delivery provider is not configured.");
    }

    try {
      const response = await fetch(delivery.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${delivery.secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          event: "AUTH_VERIFICATION_CODE",
          channel: input.channel,
          destination: input.destination,
          locale: input.locale,
          code: input.code,
          expiresAt: input.expiresAt.toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Verification delivery rejected the request.");
    } catch {
      throw new ServiceUnavailableException("Verification delivery is temporarily unavailable.");
    }
  }

  private async deliverPasswordResetCode(input: {
    destination: string;
    locale: string;
    code: string;
    expiresAt: Date;
  }) {
    const email = buildPasswordResetEmail(input);
    if (this.config.verificationGmail) {
      await this.deliverGmailVerification({ ...input, email });
      return;
    }
    if (this.config.verificationBrevo || this.config.verificationEmail) {
      await this.deliverEmailVerification({ ...input, email, category: "password_reset" });
      return;
    }
    const delivery = this.config.verificationDelivery;
    if (!delivery) {
      throw new ServiceUnavailableException("Password reset delivery provider is not configured.");
    }
    try {
      const response = await fetch(delivery.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${delivery.secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          event: "AUTH_PASSWORD_RESET_CODE",
          channel: "email",
          destination: input.destination,
          locale: input.locale,
          code: input.code,
          expiresAt: input.expiresAt.toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Password reset delivery rejected the request.");
    } catch {
      throw new ServiceUnavailableException("Password reset delivery is temporarily unavailable.");
    }
  }

  private hasVerificationDelivery(channel: "email" | "phone") {
    return channel === "email"
      ? Boolean(
          this.config.verificationGmail ||
          this.config.verificationBrevo ||
          this.config.verificationEmail ||
          this.config.verificationDelivery,
        )
      : Boolean(
          this.config.verificationWhatsApp ||
          this.config.verificationTwilioVerifyWhatsApp ||
          this.config.verificationDelivery,
        );
  }

  private usesTwilioVerifyWhatsApp(channel: "email" | "phone") {
    return (
      channel === "phone" &&
      !this.config.verificationWhatsApp &&
      Boolean(this.config.verificationTwilioVerifyWhatsApp)
    );
  }

  private async deliverGmailVerification(input: {
    destination: string;
    locale: string;
    code: string;
    email?: { subject: string; text: string; html: string };
  }) {
    const delivery = this.config.verificationGmail;
    if (!delivery) return;
    const email = input.email ?? buildVerificationEmail(input);

    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: delivery.user, pass: delivery.appPassword },
      });
      const result = await transporter.sendMail({
        from: `RAHAL <${delivery.user}>`,
        to: input.destination,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      if (!result.accepted.length) throw new Error("Gmail rejected the recipient.");
    } catch {
      throw new ServiceUnavailableException("Verification delivery is temporarily unavailable.");
    }
  }

  private async deliverEmailVerification(input: {
    destination: string;
    locale: string;
    code: string;
    email?: { subject: string; text: string; html: string };
    category?: string;
  }) {
    const email = input.email ?? buildVerificationEmail(input);

    try {
      await sendConfiguredEmail(this.config, {
        to: input.destination,
        subject: email.subject,
        text: email.text,
        html: email.html,
        category: input.category ?? "account_verification",
      });
    } catch {
      throw new ServiceUnavailableException("Verification delivery is temporarily unavailable.");
    }
  }

  private async deliverWhatsAppVerification(input: {
    destination: string;
    locale: string;
    code: string;
  }) {
    const delivery = this.config.verificationWhatsApp;
    if (!delivery) return;
    const destination = input.destination.replace(/\D/g, "");

    try {
      const response = await fetch(
        `https://graph.facebook.com/${delivery.graphApiVersion}/${delivery.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${delivery.accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: destination,
            type: "template",
            template: {
              name: delivery.templateName,
              language: { code: input.locale === "en" ? "en_US" : "ar" },
              components: [
                {
                  type: "body",
                  parameters: [{ type: "text", text: input.code }],
                },
                {
                  type: "button",
                  sub_type: "url",
                  index: "0",
                  parameters: [{ type: "text", text: input.code }],
                },
              ],
            },
          }),
        },
      );
      if (!response.ok) throw new Error("WhatsApp provider rejected the request.");
    } catch {
      throw new ServiceUnavailableException("Verification delivery is temporarily unavailable.");
    }
  }

  private async startTwilioWhatsAppVerification(input: { destination: string; locale: string }) {
    const delivery = this.config.verificationTwilioVerifyWhatsApp;
    if (!delivery) return;
    const body = new URLSearchParams({
      To: input.destination,
      Channel: "whatsapp",
      Locale: input.locale === "ar" ? "ar" : "en",
    });

    try {
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${delivery.serviceSid}/Verifications`,
        {
          method: "POST",
          headers: {
            authorization: `Basic ${Buffer.from(`${delivery.accountSid}:${delivery.authToken}`).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body,
        },
      );
      const result = response.ok ? ((await response.json()) as { status?: string }) : undefined;
      if (!response.ok || result?.status !== "pending") {
        throw new Error("Twilio Verify rejected the request.");
      }
    } catch {
      throw new ServiceUnavailableException("Verification delivery is temporarily unavailable.");
    }
  }

  private async checkTwilioWhatsAppVerification(input: { destination: string; code: string }) {
    const delivery = this.config.verificationTwilioVerifyWhatsApp;
    if (!delivery) return false;
    const body = new URLSearchParams({ To: input.destination, Code: input.code });

    try {
      const response = await fetch(
        `https://verify.twilio.com/v2/Services/${delivery.serviceSid}/VerificationCheck`,
        {
          method: "POST",
          headers: {
            authorization: `Basic ${Buffer.from(`${delivery.accountSid}:${delivery.authToken}`).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body,
        },
      );
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new ServiceUnavailableException(
            "Verification delivery is temporarily unavailable.",
          );
        }
        return false;
      }
      const result = (await response.json()) as { status?: string };
      return result.status === "approved";
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException("Verification delivery is temporarily unavailable.");
    }
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split("@");
    return `${name?.slice(0, 2) || "**"}***@${domain ?? "***"}`;
  }

  private maskPhone(phone: string) {
    return `${phone.slice(0, 3)}••••${phone.slice(-4)}`;
  }

  private async issueSession(
    user: AuthUserRecord,
    context: AuthRequestContext,
    mfaVerified = false,
  ) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);
    await this.repository.createSession({
      userId: user.id,
      refreshTokenHash: hashSessionToken(token),
      expiresAt,
      ...(mfaVerified ? { mfaVerifiedAt: new Date() } : {}),
      ...context,
    });
    return { token, session: { user: toAuthUser(user), expiresAt: expiresAt.toISOString() } };
  }
}

function describeUserAgent(value: string | null) {
  const userAgent = value ?? "";
  const device = /iPhone|Android.+Mobile/i.test(userAgent)
    ? "Mobile"
    : /iPad|Tablet/i.test(userAgent)
      ? "Tablet"
      : /Windows/i.test(userAgent)
        ? "Windows computer"
        : /Macintosh|Mac OS/i.test(userAgent)
          ? "Mac computer"
          : /Linux/i.test(userAgent)
            ? "Linux computer"
            : "Unknown device";
  const browser = /Edg\//i.test(userAgent)
    ? "Microsoft Edge"
    : /Firefox\//i.test(userAgent)
      ? "Firefox"
      : /Chrome\//i.test(userAgent)
        ? "Chrome"
        : /Safari\//i.test(userAgent)
          ? "Safari"
          : "Unknown browser";
  return { device, browser };
}
