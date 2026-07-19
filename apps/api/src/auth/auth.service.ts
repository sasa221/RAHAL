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
import type { AuthSession, AuthUser } from "@rahal/contracts";
import type { VerificationPurpose } from "@rahal/database";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { loadApiConfig } from "../config";
import { AuthRepository, type AuthUserRecord } from "./auth.repository";
import type {
  ConfirmVerificationDto,
  LoginDto,
  RegisterDto,
  RequestVerificationDto,
} from "./auth.dto";
import { PasswordService } from "./password.service";
import { buildVerificationEmail } from "./verification-email.template";

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const verificationLifetimeMs = 10 * 60 * 1000;
const verificationAttemptLimit = 5;

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
  };
}

@Injectable()
export class AuthService {
  private readonly config = loadApiConfig();

  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordService,
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
    if (!token) throw new UnauthorizedException("Authentication is required.");
    const session = await this.repository.findSession(hashSessionToken(token));
    if (!session) throw new UnauthorizedException("The session is invalid or expired.");
    if (["SUSPENDED", "BLOCKED", "ARCHIVED"].includes(session.user.status)) {
      throw new ForbiddenException("This account cannot use the current session.");
    }
    await this.repository.touchSession(session.id);
    return { user: toAuthUser(session.user), expiresAt: session.expiresAt.toISOString() };
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

    const code = String(randomInt(100_000, 1_000_000));
    const expiresAt = new Date(Date.now() + verificationLifetimeMs);
    await this.repository.invalidateVerificationCodes(session.user.id, purpose);
    await this.repository.createVerificationCode({
      userId: session.user.id,
      purpose,
      codeHash: this.hashVerificationCode(session.user.id, purpose, code),
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

    const expected = Buffer.from(record.codeHash, "hex");
    const actual = Buffer.from(
      this.hashVerificationCode(session.user.id, purpose, input.code),
      "hex",
    );
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
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
    if (input.channel === "email" && this.config.verificationEmail) {
      await this.deliverEmailVerification(input);
      return;
    }
    if (input.channel === "phone" && this.config.verificationWhatsApp) {
      await this.deliverWhatsAppVerification(input);
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

  private hasVerificationDelivery(channel: "email" | "phone") {
    return channel === "email"
      ? Boolean(
          this.config.verificationGmail ||
          this.config.verificationEmail ||
          this.config.verificationDelivery,
        )
      : Boolean(this.config.verificationWhatsApp || this.config.verificationDelivery);
  }

  private async deliverGmailVerification(input: {
    destination: string;
    locale: string;
    code: string;
  }) {
    const delivery = this.config.verificationGmail;
    if (!delivery) return;
    const email = buildVerificationEmail(input);

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
  }) {
    const delivery = this.config.verificationEmail;
    if (!delivery) return;
    const email = buildVerificationEmail(input);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${delivery.apiKey}`,
          "content-type": "application/json",
          "idempotency-key": `rahal-auth-${randomBytes(16).toString("hex")}`,
          "user-agent": "rahal-platform/1.0",
        },
        body: JSON.stringify({
          from: delivery.from,
          to: [input.destination],
          subject: email.subject,
          text: email.text,
          html: email.html,
          tags: [{ name: "category", value: "account_verification" }],
        }),
      });
      if (!response.ok) throw new Error("Email provider rejected the request.");
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

  private maskEmail(email: string) {
    const [name, domain] = email.split("@");
    return `${name?.slice(0, 2) || "**"}***@${domain ?? "***"}`;
  }

  private maskPhone(phone: string) {
    return `${phone.slice(0, 3)}••••${phone.slice(-4)}`;
  }

  private async issueSession(user: AuthUserRecord, context: AuthRequestContext) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);
    await this.repository.createSession({
      userId: user.id,
      refreshTokenHash: hashSessionToken(token),
      expiresAt,
      ...context,
    });
    return { token, session: { user: toAuthUser(user), expiresAt: expiresAt.toISOString() } };
  }
}
