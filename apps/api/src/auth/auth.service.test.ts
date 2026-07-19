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
});
