import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AuthService, hashSessionToken } from "./auth.service";
import type { AuthRepository, AuthUserRecord } from "./auth.repository";
import { PasswordService } from "./password.service";

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
  it("returns a redacted user and stores only a hash of the opaque session token", async () => {
    const repository = buildRepository();
    repository.findByIdentifier.mockResolvedValue(activeUser);
    const passwords = { verify: vi.fn().mockResolvedValue(true) } as unknown as PasswordService;
    const service = new AuthService(repository as unknown as AuthRepository, passwords);

    const result = await service.login(
      { identifier: "CUSTOMER@EXAMPLE.COM", password: "customer-password" },
      { ipHash: "ip-hash" },
    );

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

  it("issues a short-lived development verification code but stores only its hash", async () => {
    const repository = buildRepository();
    repository.findSession.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: activeUser,
    });
    const service = new AuthService(repository as unknown as AuthRepository, {} as PasswordService);

    const result = await service.requestVerification("session-token", { channel: "phone" }, {});

    expect(result.developmentCode).toMatch(/^\d{6}$/);
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
    expect(repository.createVerificationCode.mock.calls[0]?.[0].codeHash).not.toBe(
      result.developmentCode,
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
    const issued = await service.requestVerification("session-token", { channel: "phone" }, {});
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
      { channel: "phone", code: issued.developmentCode },
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
