import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthRepository, AuthUserRecord } from "./auth.repository";
import { AuthService, hashSessionToken } from "./auth.service";

const staffUser: AuthUserRecord = {
  id: "sales-secure-1",
  email: "sales.secure@example.test",
  phone: "+201000000007",
  passwordHash: "stored-hash",
  fullNameAr: null,
  fullNameEn: "Secure Sales",
  preferredLocale: "en",
  systemRole: "SALES",
  status: "ACTIVE",
  emailVerifiedAt: new Date(),
  mustChangePassword: true,
  staffMfaCredential: null,
};

function setup() {
  const repository = {
    findByIdentifier: vi.fn().mockResolvedValue(staffUser),
    invalidateStaffLoginChallenges: vi.fn(),
    createStaffLoginChallenge: vi
      .fn()
      .mockResolvedValue({ id: "challenge-1", kind: "ENROLL", expiresAt: new Date() }),
    findStaffLoginChallenge: vi.fn(),
    promoteStaffLoginChallengeToEnrollment: vi.fn().mockResolvedValue({ count: 1 }),
    incrementStaffLoginChallengeAttempts: vi.fn().mockResolvedValue({ attempts: 1 }),
    enableStaffMfa: vi.fn().mockResolvedValue({
      id: "credential-1",
      secretCiphertext: "encrypted-secret",
      enabledAt: new Date(),
      lastUsedCounter: 12n,
    }),
    completeStaffMfaTotp: vi.fn(),
    completeStaffMfaRecovery: vi.fn(),
    createSession: vi.fn().mockResolvedValue({ id: "session-1", expiresAt: new Date() }),
    findSession: vi.fn(),
    touchSession: vi.fn(),
    writeAudit: vi.fn(),
  };
  const passwords = { verify: vi.fn().mockResolvedValue(true) };
  const mfa = {
    generateSecret: vi.fn().mockReturnValue("BASE32SECRET"),
    encryptSecret: vi.fn().mockReturnValue("encrypted-secret"),
    decryptSecret: vi.fn().mockReturnValue("BASE32SECRET"),
    buildOtpAuthUri: vi.fn().mockReturnValue("otpauth://totp/RAHAL"),
    verifyTotp: vi.fn().mockReturnValue(12n),
    generateRecoveryCodes: vi
      .fn()
      .mockReturnValue(["RAHAL-AAAA-BBBB-CCCC", "RAHAL-DDDD-EEEE-FFFF"]),
    hashRecoveryCode: vi.fn((userId: string, code: string) => `${userId}:${code}`),
  };
  return {
    repository,
    mfa,
    service: new AuthService(
      repository as unknown as AuthRepository,
      passwords as never,
      mfa as never,
    ),
  };
}

describe("staff MFA login flow", () => {
  it("turns a valid staff password into a short-lived enrollment challenge, not a session", async () => {
    const { service, repository } = setup();
    const result = await service.login(
      { identifier: staffUser.email, password: "temporary-password" },
      { ipHash: "safe-ip-hash" },
    );

    expect(result).toMatchObject({
      result: { kind: "STAFF_MFA_REQUIRED", action: "ENROLL" },
    });
    expect(repository.createSession).not.toHaveBeenCalled();
    expect(repository.createStaffLoginChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: staffUser.id,
        kind: "ENROLL",
        secretCiphertext: "encrypted-secret",
      }),
    );
  });

  it("enables MFA, returns recovery codes once, and issues an MFA-bound session", async () => {
    const { service, repository } = setup();
    repository.findStaffLoginChallenge.mockResolvedValue({
      id: "challenge-1",
      kind: "ENROLL",
      secretCiphertext: "encrypted-secret",
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
      user: staffUser,
    });

    const result = await service.completeStaffMfaChallenge("raw-challenge", { code: "123456" }, {});

    expect(result.completion.recoveryCodes).toEqual([
      "RAHAL-AAAA-BBBB-CCCC",
      "RAHAL-DDDD-EEEE-FFFF",
    ]);
    expect(result.completion.session.user).toMatchObject({
      role: "SALES",
      mfaEnabled: true,
      securityAction: "CHANGE_TEMPORARY_PASSWORD",
    });
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: staffUser.id,
        refreshTokenHash: hashSessionToken(result.token),
        mfaVerifiedAt: expect.any(Date),
      }),
    );
  });

  it("repairs a stale verify challenge into enrollment when the MFA credential is missing", async () => {
    const { service, repository, mfa } = setup();
    repository.findStaffLoginChallenge.mockResolvedValue({
      id: "stale-challenge",
      kind: "VERIFY",
      secretCiphertext: null,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
      user: staffUser,
    });

    const challenge = await service.getStaffMfaChallenge("raw-challenge");

    expect(repository.promoteStaffLoginChallengeToEnrollment).toHaveBeenCalledWith({
      id: "stale-challenge",
      userId: staffUser.id,
      secretCiphertext: "encrypted-secret",
    });
    expect(mfa.generateSecret).toHaveBeenCalledOnce();
    expect(challenge).toMatchObject({
      action: "ENROLL",
      enrollment: {
        secret: "BASE32SECRET",
        otpAuthUri: "otpauth://totp/RAHAL",
      },
    });
  });

  it("blocks staff workspaces until the temporary password is replaced", async () => {
    const { service, repository } = setup();
    repository.findSession.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      mfaVerifiedAt: new Date(),
      user: {
        ...staffUser,
        staffMfaCredential: {
          id: "credential-1",
          secretCiphertext: "encrypted-secret",
          enabledAt: new Date(),
          lastUsedCounter: 12n,
        },
      },
    });

    await expect(service.getSession("staff-session")).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getSessionStatus("staff-session")).resolves.toMatchObject({
      user: { securityAction: "CHANGE_TEMPORARY_PASSWORD" },
    });
  });
});
