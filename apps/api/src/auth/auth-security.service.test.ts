import { UnauthorizedException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { AuthService, hashSessionToken } from "./auth.service";

const user = {
  id: "user-security",
  email: "security@example.test",
  phone: "+201000000001",
  passwordHash: "stored-password-hash",
  fullNameAr: null,
  fullNameEn: "Security User",
  preferredLocale: "en",
  systemRole: "CUSTOMER",
  status: "ACTIVE",
  emailVerifiedAt: new Date(),
  phoneVerifiedAt: new Date(),
};

function setup() {
  const repository = {
    findSession: vi.fn().mockResolvedValue({
      id: "session-current",
      expiresAt: new Date("2026-08-26T08:00:00.000Z"),
      user,
    }),
    touchSession: vi.fn(),
    listSessions: vi.fn().mockResolvedValue([
      {
        id: "session-current",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36",
        expiresAt: new Date("2026-08-26T08:00:00.000Z"),
        lastSeenAt: new Date("2026-07-26T08:00:00.000Z"),
        createdAt: new Date("2026-07-25T08:00:00.000Z"),
      },
    ]),
    revokeOwnedSession: vi.fn().mockResolvedValue({ count: 1 }),
    revokeOtherSessions: vi.fn().mockResolvedValue({ count: 2 }),
    changePassword: vi.fn().mockResolvedValue({ count: 2 }),
    findByIdentifier: vi.fn().mockResolvedValue(null),
    findActiveVerificationCode: vi.fn(),
    incrementVerificationAttempts: vi.fn(),
    resetPassword: vi.fn().mockResolvedValue({ count: 2 }),
    writeAudit: vi.fn(),
  };
  const passwords = {
    verify: vi.fn().mockImplementation(async (password: string) => password === "current-password"),
    hash: vi.fn().mockResolvedValue("new-safe-hash"),
  };
  return {
    repository,
    passwords,
    service: new AuthService(repository as never, passwords as never),
  };
}

describe("account security", () => {
  it("returns safe device labels without exposing tokens, IP hashes, or raw user agents", async () => {
    const { service, repository } = setup();
    await expect(service.securityOverview("raw-session-token")).resolves.toEqual({
      sessions: [
        expect.objectContaining({
          id: "session-current",
          current: true,
          deviceLabel: "Windows computer",
          browserLabel: "Chrome",
        }),
      ],
    });
    expect(repository.findSession).toHaveBeenCalledWith(hashSessionToken("raw-session-token"));
    const result = await service.securityOverview("raw-session-token");
    expect(JSON.stringify(result)).not.toContain("Mozilla/");
    expect(JSON.stringify(result)).not.toContain("ipHash");
  });

  it("changes the password only after current-password verification", async () => {
    const { service, repository } = setup();
    await expect(
      service.changePassword(
        "raw-session-token",
        { currentPassword: "current-password", newPassword: "new-password-123" },
        {},
      ),
    ).resolves.toEqual({ passwordChanged: true, otherSessionsRevoked: 2 });
    expect(repository.changePassword).toHaveBeenCalledWith(
      user.id,
      "new-safe-hash",
      "session-current",
      {},
    );
  });

  it("rejects a wrong current password without changing stored credentials", async () => {
    const { service, repository, passwords } = setup();
    passwords.verify.mockResolvedValue(false);
    await expect(
      service.changePassword(
        "raw-session-token",
        { currentPassword: "wrong-password", newPassword: "new-password-123" },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.changePassword).not.toHaveBeenCalled();
  });

  it("revokes only a session owned by the authenticated user", async () => {
    const { service, repository } = setup();
    await expect(
      service.revokeOwnedSession("raw-session-token", "session-current", {}),
    ).resolves.toEqual({
      revoked: 1,
      currentSessionRevoked: true,
    });
    expect(repository.revokeOwnedSession).toHaveBeenCalledWith(user.id, "session-current");
  });

  it("uses the same accepted response for an unknown recovery identifier", async () => {
    const { service, repository } = setup();
    await expect(
      service.requestPasswordReset({ identifier: "missing@example.test" }, {}),
    ).resolves.toEqual({ accepted: true });
    expect(repository.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "GENERIC_ACCEPTED", succeeded: true }),
    );
  });

  it("consumes a valid HMAC reset code and revokes every active session", async () => {
    const { service, repository } = setup();
    const secret = process.env.AUTH_SECRET ?? "rahal-local-development-auth-secret-change-me";
    repository.findByIdentifier.mockResolvedValue(user);
    repository.findActiveVerificationCode.mockResolvedValue({
      id: "reset-code-1",
      codeHash: createHmac("sha256", secret)
        .update(`${user.id}:RESET_PASSWORD:123456`)
        .digest("hex"),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      service.confirmPasswordReset(
        {
          identifier: user.email,
          code: "123456",
          newPassword: "brand-new-password",
        },
        {},
      ),
    ).resolves.toEqual({ passwordReset: true });
    expect(repository.resetPassword).toHaveBeenCalledWith(
      user.id,
      "reset-code-1",
      "new-safe-hash",
      {},
    );
  });
});
