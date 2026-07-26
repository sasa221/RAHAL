import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("password recovery and session security", () => {
  const controller = read("apps/api/src/auth/auth.controller.ts");
  const repository = read("apps/api/src/auth/auth.repository.ts");
  const service = read("apps/api/src/auth/auth.service.ts");
  const security = read("apps/web/components/account-security-workspace.tsx");
  const recovery = read("apps/web/components/password-recovery.tsx");

  it("rate-limits public reset request and confirmation endpoints", () => {
    expect(controller).toContain('@Post("password-reset/request")');
    expect(controller).toContain('@Post("password-reset/confirm")');
    expect(controller).toContain("password-reset-request:");
    expect(controller).toContain("password-reset-confirm:");
    expect(controller).toContain("response.clearCookie");
  });

  it("stores only HMAC reset codes and revokes all sessions after recovery", () => {
    expect(service).toContain('this.hashVerificationCode(user.id, "RESET_PASSWORD", code)');
    expect(service).not.toContain("codePlaintext");
    expect(repository).toContain("resetPassword(");
    expect(repository).toContain('where: { userId, status: "ACTIVE" }');
    expect(repository).toContain('status: "REVOKED"');
    expect(repository).toContain('action: "AUTH_PASSWORD_RESET_COMPLETE"');
  });

  it("prevents account enumeration and limits code attempts", () => {
    expect(service).toContain("GENERIC_ACCEPTED");
    expect(service).toContain("return { accepted: true }");
    expect(service).toContain("verificationAttemptLimit");
    expect(service).toContain("incrementVerificationAttempts");
  });

  it("owner-scopes session revocation and excludes raw security metadata", () => {
    expect(repository).toContain('where: { id, userId, status: "ACTIVE" }');
    expect(repository).not.toContain("select: { id: true, ipHash: true");
    expect(security).not.toContain("refreshTokenHash");
    expect(security).not.toContain("ipHash");
    expect(security).not.toContain("userAgent");
  });

  it("ships shared Arabic/English responsive recovery and account-security routes", () => {
    expect(security).toContain("ar: {");
    expect(security).toContain("en: {");
    expect(security).toContain("account-session-list");
    expect(recovery).toContain('"REQUEST" | "CONFIRM" | "DONE"');
    expect(recovery).toContain("password-reset/request");
    expect(recovery).toContain("password-reset/confirm");
    expect(read("apps/web/app/account/security/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/account/security/page.tsx")).toContain('locale="en"');
    expect(read("apps/web/app/auth/recover/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/auth/recover/page.tsx")).toContain('locale="en"');
  });
});
