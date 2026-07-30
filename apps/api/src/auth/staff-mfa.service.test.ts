import { describe, expect, it } from "vitest";
import { StaffMfaService } from "./staff-mfa.service";

describe("StaffMfaService", () => {
  const service = new StaffMfaService();

  it("encrypts staff secrets with authenticated encryption", () => {
    const secret = service.generateSecret();
    const first = service.encryptSecret(secret);
    const second = service.encryptSecret(secret);

    expect(first).not.toBe(secret);
    expect(first).not.toBe(second);
    expect(service.decryptSecret(first)).toBe(secret);
    const tamperIndex = Math.floor(first.length / 2);
    const replacement = first[tamperIndex] === "A" ? "B" : "A";
    const tampered = `${first.slice(0, tamperIndex)}${replacement}${first.slice(tamperIndex + 1)}`;
    expect(() => service.decryptSecret(tampered)).toThrow();
  });

  it("verifies RFC-compatible six-digit TOTP values and rejects replay", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    const counter = service.verifyTotp(secret, "287082", null, 59_000);

    expect(counter).toBe(1n);
    expect(service.verifyTotp(secret, "287082", counter, 59_000)).toBeNull();
    expect(service.verifyTotp(secret, "000000", null, 59_000)).toBeNull();
  });

  it("generates one-time recovery codes and hashes normalized forms", () => {
    const codes = service.generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    expect(codes.every((code) => /^RAHAL-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(code))).toBe(
      true,
    );
    expect(service.hashRecoveryCode("staff-1", codes[0]!)).toBe(
      service.hashRecoveryCode("staff-1", codes[0]!.toLowerCase().replaceAll("-", " ")),
    );
  });
});
