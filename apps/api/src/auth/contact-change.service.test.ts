import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const user = {
  id: "customer-1",
  email: "old@example.com",
  phone: "+201000000001",
  passwordHash: "hash",
  fullNameAr: null,
  fullNameEn: "Rahal Customer",
  preferredLocale: "en",
  systemRole: "CUSTOMER",
  status: "ACTIVE",
  emailVerifiedAt: new Date(),
  phoneVerifiedAt: new Date(),
  mustChangePassword: false,
  staffMfaCredential: null,
};

function setup(role: "CUSTOMER" | "SALES" | "ADMIN" = "CUSTOMER") {
  const repository = {
    findSession: vi.fn().mockResolvedValue({
      id: "session-current",
      expiresAt: new Date(Date.now() + 60_000),
      mfaVerifiedAt: role === "ADMIN" ? new Date() : null,
      user: {
        ...user,
        systemRole: role,
        emailVerifiedAt: role === "ADMIN" ? null : user.emailVerifiedAt,
        mustChangePassword: role === "ADMIN",
        staffMfaCredential: role === "ADMIN" ? { id: "mfa-1" } : null,
      },
    }),
    touchSession: vi.fn(),
    findByIdentifier: vi.fn().mockResolvedValue(null),
    invalidateContactChangeChallenges: vi.fn(),
    createContactChangeChallenge: vi.fn().mockResolvedValue({
      id: "challenge-1",
      expiresAt: new Date(Date.now() + 600_000),
    }),
    findActiveContactChangeChallenge: vi.fn(),
    incrementContactChangeAttempts: vi.fn().mockResolvedValue({ attempts: 1 }),
    completeContactChange: vi.fn().mockResolvedValue({
      user: { ...user, email: "new@example.com" },
      revoked: 2,
    }),
    writeAudit: vi.fn(),
  };
  const service = new AuthService(
    repository as never,
    { hash: vi.fn(), verify: vi.fn() } as never,
    {} as never,
  );
  const internals = service as unknown as {
    hasVerificationDelivery(channel: "email" | "phone"): boolean;
    deliverVerificationCode(input: unknown): Promise<void>;
    hashContactChangeValue(channel: "email" | "phone", value: string): string;
    hashContactChangeCode(
      userId: string,
      kind: "EMAIL" | "PHONE",
      valueHash: string,
      code: string,
    ): string;
  };
  Object.defineProperty(internals, "hasVerificationDelivery", { value: () => true });
  Object.defineProperty(internals, "deliverVerificationCode", { value: vi.fn() });
  return { repository, service, internals };
}

describe("verified contact changes", () => {
  it("rejects non-customer sessions", async () => {
    await expect(
      setup("SALES").service.requestContactChange(
        "session",
        { channel: "email", value: "new@example.com" },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows an MFA-verified temporary administrator to claim a real email", async () => {
    const { service, repository } = setup("ADMIN");
    await expect(
      service.requestContactChange("session", { channel: "email", value: "owner@example.com" }, {}),
    ).resolves.toMatchObject({ channel: "email", destination: "ow***@example.com" });
    expect(repository.createContactChangeChallenge).toHaveBeenCalledOnce();
  });

  it("normalizes the destination but persists only value and code hashes in the challenge", async () => {
    const { service, repository, internals } = setup();
    const result = await service.requestContactChange(
      "session",
      { channel: "email", value: "  NEW@Example.com " },
      { ipHash: "ip-hash" },
    );

    expect(result).toMatchObject({ channel: "email", destination: "ne***@example.com" });
    const stored = repository.createContactChangeChallenge.mock.calls[0]?.[0];
    expect(stored).not.toBeUndefined();
    expect(JSON.stringify(stored)).not.toContain("new@example.com");
    expect(stored.valueHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(internals.deliverVerificationCode).toHaveBeenCalledWith(
      expect.objectContaining({ destination: "new@example.com", channel: "email" }),
    );
    expect(repository.writeAudit).toHaveBeenCalledWith(
      expect.not.objectContaining({ newData: expect.anything(), previousData: expect.anything() }),
    );
  });

  it("rejects the current contact and a contact owned by another account", async () => {
    const same = setup();
    await expect(
      same.service.requestContactChange(
        "session",
        { channel: "email", value: "OLD@example.com" },
        {},
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const used = setup();
    used.repository.findByIdentifier.mockResolvedValue({ id: "customer-2" });
    await expect(
      used.service.requestContactChange(
        "session",
        { channel: "phone", value: "+201000000099" },
        {},
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("increments attempts for an invalid code", async () => {
    const { service, repository } = setup();
    repository.findActiveContactChangeChallenge.mockResolvedValue({
      id: "challenge-1",
      codeHash: "0".repeat(64),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      service.confirmContactChange(
        "session",
        { channel: "email", value: "new@example.com", code: "123456" },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.incrementContactChangeAttempts).toHaveBeenCalledWith("challenge-1");
    expect(repository.completeContactChange).not.toHaveBeenCalled();
  });

  it("changes the verified destination and revokes other sessions after a valid code", async () => {
    const { service, repository, internals } = setup();
    const valueHash = internals.hashContactChangeValue("email", "new@example.com");
    repository.findActiveContactChangeChallenge.mockResolvedValue({
      id: "challenge-1",
      valueHash,
      codeHash: internals.hashContactChangeCode("customer-1", "EMAIL", valueHash, "123456"),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await service.confirmContactChange(
      "session",
      { channel: "email", value: "new@example.com", code: "123456" },
      { userAgent: "test" },
    );

    expect(result).toMatchObject({
      changed: true,
      channel: "email",
      destination: "ne***@example.com",
      otherSessionsRevoked: 2,
    });
    expect(repository.completeContactChange).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "customer-1",
        currentSessionId: "session-current",
        kind: "EMAIL",
        value: "new@example.com",
      }),
    );
  });
});
