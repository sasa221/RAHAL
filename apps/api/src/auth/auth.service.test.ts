import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import nodemailer from "nodemailer";
import { AuthService, hashSessionToken } from "./auth.service";
import type { AuthRepository, AuthUserRecord } from "./auth.repository";
import { PasswordService } from "./password.service";

vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));

const activeUser: AuthUserRecord = {
  id: "customer-1",
  email: "customer@example.com",
  phone: "+201001112222",
  passwordHash: "stored-hash",
  fullNameAr: null,
  fullNameEn: "Rahal Customer",
  preferredLocale: "en",
  systemRole: "CUSTOMER",
  status: "ACTIVE",
  emailVerifiedAt: new Date("2026-07-01T00:00:00Z"),
  phoneVerifiedAt: null,
  mustChangePassword: false,
  staffMfaCredential: null,
};

function buildRepository() {
  return {
    findByIdentifier: vi.fn(),
    createUser: vi.fn(),
    createSession: vi.fn().mockResolvedValue({ id: "session-1", expiresAt: new Date() }),
    findSession: vi.fn(),
    touchSession: vi.fn(),
    revokeSession: vi.fn(),
    invalidateVerificationCodes: vi.fn(),
    createVerificationCode: vi.fn().mockResolvedValue({ id: "code-1", expiresAt: new Date() }),
    findActiveVerificationCode: vi.fn(),
    incrementVerificationAttempts: vi.fn().mockResolvedValue({ attempts: 1 }),
    completeVerification: vi.fn(),
    writeAudit: vi.fn(),
  };
}

describe("AuthService", () => {
  beforeEach(() => {
    process.env.VERIFICATION_DELIVERY_WEBHOOK_URL = "http://localhost:9999/verification";
    process.env.VERIFICATION_DELIVERY_WEBHOOK_SECRET =
      "test-verification-delivery-secret-32-characters";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    for (const name of [
      "VERIFICATION_DELIVERY_WEBHOOK_URL",
      "VERIFICATION_DELIVERY_WEBHOOK_SECRET",
      "RESEND_API_KEY",
      "VERIFICATION_EMAIL_FROM",
      "GMAIL_SMTP_USER",
      "GMAIL_SMTP_APP_PASSWORD",
      "WHATSAPP_CLOUD_ACCESS_TOKEN",
      "WHATSAPP_CLOUD_PHONE_NUMBER_ID",
      "WHATSAPP_AUTH_TEMPLATE_NAME",
      "WHATSAPP_GRAPH_API_VERSION",
    ]) {
      delete process.env[name];
    }
    vi.unstubAllGlobals();
  });

  it("returns a redacted user and stores only a hash of the opaque session token", async () => {
    const repository = buildRepository();
    repository.findByIdentifier.mockResolvedValue(activeUser);
    const passwords = { verify: vi.fn().mockResolvedValue(true) } as unknown as PasswordService;
    const service = new AuthService(repository as unknown as AuthRepository, passwords);

    const result = await service.login(
      { identifier: "CUSTOMER@EXAMPLE.COM", password: "customer-password" },
      { ipHash: "ip-hash" },
    );
    if (!("session" in result)) throw new Error("Expected a customer session.");

    expect(result.session.user).toEqual({
      id: "customer-1",
      email: "customer@example.com",
      phone: "+201001112222",
      fullName: "Rahal Customer",
      preferredLocale: "en",
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      securityAction: null,
    });
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "customer-1",
        refreshTokenHash: hashSessionToken(result.token),
      }),
    );
    expect(repository.createSession.mock.calls[0]?.[0].refreshTokenHash).not.toBe(result.token);
  });

  it("uses the same response for an unknown account and a wrong password", async () => {
    const repository = buildRepository();
    repository.findByIdentifier.mockResolvedValue(null);
    const passwords = { verify: vi.fn() } as unknown as PasswordService;
    const service = new AuthService(repository as unknown as AuthRepository, passwords);

    await expect(
      service.login({ identifier: "missing@example.com", password: "wrong" }, {}),
    ).rejects.toThrow(new UnauthorizedException("Invalid email, phone, or password."));
    expect(repository.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ succeeded: false, reason: "INVALID_CREDENTIALS" }),
    );
  });

  it("blocks sessions for suspended accounts", async () => {
    const repository = buildRepository();
    repository.findByIdentifier.mockResolvedValue({ ...activeUser, status: "SUSPENDED" });
    const passwords = { verify: vi.fn().mockResolvedValue(true) } as unknown as PasswordService;
    const service = new AuthService(repository as unknown as AuthRepository, passwords);

    await expect(
      service.login({ identifier: activeUser.email, password: "correct-password" }, {}),
    ).rejects.toThrow(ForbiddenException);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it("delivers a short-lived verification code without returning or storing its plaintext", async () => {
    const repository = buildRepository();
    repository.findSession.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: activeUser,
    });
    const service = new AuthService(repository as unknown as AuthRepository, {} as PasswordService);

    const result = await service.requestVerification("session-token", { channel: "phone" }, {});

    const deliveryRequest = vi.mocked(fetch).mock.calls[0];
    const delivered = JSON.parse(String(deliveryRequest?.[1]?.body)) as { code: string };

    expect(delivered.code).toMatch(/^\d{6}$/);
    expect(result).not.toHaveProperty("developmentCode");
    expect(result).toEqual(
      expect.objectContaining({ channel: "phone", destination: expect.any(String) }),
    );
    expect(deliveryRequest?.[0]).toBe("http://localhost:9999/verification");
    expect(deliveryRequest?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-verification-delivery-secret-32-characters",
        }),
      }),
    );
    expect(repository.invalidateVerificationCodes).toHaveBeenCalledWith(
      activeUser.id,
      "VERIFY_PHONE",
    );
    expect(repository.createVerificationCode).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: activeUser.id,
        purpose: "VERIFY_PHONE",
        codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(repository.createVerificationCode.mock.calls[0]?.[0].codeHash).not.toBe(delivered.code);
  });

  it("sends email verification through Resend without exposing the code to the client", async () => {
    delete process.env.VERIFICATION_DELIVERY_WEBHOOK_URL;
    delete process.env.VERIFICATION_DELIVERY_WEBHOOK_SECRET;
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.VERIFICATION_EMAIL_FROM = "RAHAL <accounts@rahal.example>";
    const repository = buildRepository();
    repository.findSession.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: { ...activeUser, emailVerifiedAt: null },
    });
    const service = new AuthService(repository as unknown as AuthRepository, {} as PasswordService);

    const result = await service.requestVerification("session-token", { channel: "email" }, {});
    const deliveryRequest = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(deliveryRequest?.[1]?.body)) as {
      to: string[];
      text: string;
    };

    expect(deliveryRequest?.[0]).toBe("https://api.resend.com/emails");
    expect(deliveryRequest?.[1]?.headers).toEqual(
      expect.objectContaining({ authorization: "Bearer re_test_key" }),
    );
    expect(body.to).toEqual([activeUser.email]);
    expect(body.text).toMatch(/\d{6}/);
    expect(result).not.toHaveProperty("code");
    expect(result).not.toHaveProperty("developmentCode");
  });

  it("sends verification to any user address through Gmail SMTP when configured", async () => {
    delete process.env.VERIFICATION_DELIVERY_WEBHOOK_URL;
    delete process.env.VERIFICATION_DELIVERY_WEBHOOK_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.VERIFICATION_EMAIL_FROM;
    process.env.GMAIL_SMTP_USER = "sender@gmail.com";
    process.env.GMAIL_SMTP_APP_PASSWORD = "test-app-password";
    const sendMail = vi.fn().mockResolvedValue({ accepted: [activeUser.email] });
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    const repository = buildRepository();
    repository.findSession.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: { ...activeUser, emailVerifiedAt: null },
    });
    const service = new AuthService(repository as unknown as AuthRepository, {} as PasswordService);

    const result = await service.requestVerification("session-token", { channel: "email" }, {});

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.gmail.com", port: 465, secure: true }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "RAHAL <sender@gmail.com>",
        to: activeUser.email,
        html: expect.stringContaining("RAHAL | رحال"),
      }),
    );
    expect(result).not.toHaveProperty("code");
  });

  it("sends phone verification through a Meta WhatsApp authentication template", async () => {
    delete process.env.VERIFICATION_DELIVERY_WEBHOOK_URL;
    delete process.env.VERIFICATION_DELIVERY_WEBHOOK_SECRET;
    process.env.WHATSAPP_CLOUD_ACCESS_TOKEN = "whatsapp-test-token";
    process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID = "123456789";
    process.env.WHATSAPP_AUTH_TEMPLATE_NAME = "rahal_account_verification";
    process.env.WHATSAPP_GRAPH_API_VERSION = "v23.0";
    const repository = buildRepository();
    repository.findSession.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: activeUser,
    });
    const service = new AuthService(repository as unknown as AuthRepository, {} as PasswordService);

    const result = await service.requestVerification("session-token", { channel: "phone" }, {});
    const deliveryRequest = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(deliveryRequest?.[1]?.body)) as {
      to: string;
      template: { name: string; components: Array<{ parameters: Array<{ text: string }> }> };
    };

    expect(deliveryRequest?.[0]).toBe("https://graph.facebook.com/v23.0/123456789/messages");
    expect(body.to).toBe("201001112222");
    expect(body.template.name).toBe("rahal_account_verification");
    expect(body.template.components[0]?.parameters[0]?.text).toMatch(/^\d{6}$/);
    expect(result).not.toHaveProperty("code");
    expect(result).not.toHaveProperty("developmentCode");
  });

  it("fails closed without a delivery provider and does not create a code", async () => {
    delete process.env.VERIFICATION_DELIVERY_WEBHOOK_URL;
    delete process.env.VERIFICATION_DELIVERY_WEBHOOK_SECRET;
    const repository = buildRepository();
    repository.findSession.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: activeUser,
    });
    const service = new AuthService(repository as unknown as AuthRepository, {} as PasswordService);

    await expect(
      service.requestVerification("session-token", { channel: "phone" }, {}),
    ).rejects.toThrow(
      new ServiceUnavailableException("Verification delivery provider is not configured."),
    );
    expect(repository.createVerificationCode).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("invalidates the issued code when the delivery provider fails", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const repository = buildRepository();
    repository.findSession.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: activeUser,
    });
    const service = new AuthService(repository as unknown as AuthRepository, {} as PasswordService);

    await expect(
      service.requestVerification("session-token", { channel: "phone" }, {}),
    ).rejects.toThrow(
      new ServiceUnavailableException("Verification delivery is temporarily unavailable."),
    );
    expect(repository.invalidateVerificationCodes).toHaveBeenCalledTimes(2);
    expect(repository.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        succeeded: false,
        reason: "VERIFY_PHONE_DELIVERY_FAILED",
      }),
    );
  });

  it("verifies the current code and rejects a wrong code without storing plaintext", async () => {
    const repository = buildRepository();
    repository.findSession.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: activeUser,
    });
    repository.completeVerification.mockResolvedValue({
      ...activeUser,
      phoneVerifiedAt: new Date(),
    });
    const service = new AuthService(repository as unknown as AuthRepository, {} as PasswordService);
    await service.requestVerification("session-token", { channel: "phone" }, {});
    const deliveryRequest = vi.mocked(fetch).mock.calls[0];
    const delivered = JSON.parse(String(deliveryRequest?.[1]?.body)) as { code: string };
    const codeHash = repository.createVerificationCode.mock.calls[0]?.[0].codeHash as string;
    repository.findActiveVerificationCode.mockResolvedValue({
      id: "code-1",
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.confirmVerification("session-token", { channel: "phone", code: "000000" }, {}),
    ).rejects.toThrow("Invalid or expired verification code.");
    expect(repository.incrementVerificationAttempts).toHaveBeenCalledWith("code-1");

    const confirmed = await service.confirmVerification(
      "session-token",
      { channel: "phone", code: delivered.code },
      {},
    );
    expect(confirmed.verified).toBe(true);
    expect(confirmed.user.phoneVerified).toBe(true);
    expect(repository.completeVerification).toHaveBeenCalledWith(
      "code-1",
      activeUser.id,
      "VERIFY_PHONE",
    );
  });
});
