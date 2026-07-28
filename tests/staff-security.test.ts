import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("staff security launch gate", () => {
  it("persists encrypted MFA state, one-time recovery hashes, and MFA-bound sessions", () => {
    const schema = read("packages/database/prisma/schema.prisma");
    expect(schema).toContain("model StaffMfaCredential");
    expect(schema).toContain("secretCiphertext");
    expect(schema).toContain("model StaffMfaRecoveryCode");
    expect(schema).toContain("codeHash");
    expect(schema).toContain("usedAt");
    expect(schema).toContain("mfaVerifiedAt");
  });

  it("keeps the staff password step separate from full session issuance", () => {
    const service = read("apps/api/src/auth/auth.service.ts");
    expect(service).toContain('kind: "STAFF_MFA_REQUIRED"');
    expect(service).toContain("invalidateStaffLoginChallenges");
    expect(service).toContain("Staff MFA verification is required.");
    expect(service).toContain("mustChangePassword");
  });

  it("ships bilingual, responsive authenticator and recovery-code onboarding", () => {
    const component = read("apps/web/components/staff-security-onboarding.tsx");
    const styles = read("apps/web/app/globals.css");
    expect(component).toContain("اربط حسابك بتطبيق المصادقة");
    expect(component).toContain("Connect your authenticator app");
    expect(component).toContain("recoveryCodes");
    expect(component).toContain("QRCode.toDataURL");
    expect(component).not.toContain("localStorage");
    expect(styles).toContain("@media (max-width: 660px)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
