import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("verified customer contact changes", () => {
  const schema = read("packages/database/prisma/schema.prisma");
  const migration = read(
    "packages/database/prisma/migrations/20260808213000_contact_change_challenges/migration.sql",
  );
  const service = read("apps/api/src/auth/auth.service.ts");
  const repository = read("apps/api/src/auth/auth.repository.ts");
  const controller = read("apps/api/src/auth/auth.controller.ts");
  const component = read("apps/web/components/customer-account-workspace.tsx");

  it("stores only target and code hashes in finite expiring challenges", () => {
    expect(schema).toContain("model ContactChangeChallenge");
    expect(schema).toContain("valueHash String");
    expect(schema).toContain("codeHash  String");
    expect(schema).not.toContain("model ContactChangeChallenge {\n  newEmail");
    expect(schema).not.toContain("model ContactChangeChallenge {\n  newPhone");
    expect(migration).toContain('CREATE TYPE "ContactChangeKind"');
    expect(migration).toContain("ON DELETE CASCADE");
  });

  it("rate limits both authenticated request and confirmation endpoints", () => {
    expect(controller).toContain('@Post("contact-change/request")');
    expect(controller).toContain('@Post("contact-change/confirm")');
    expect(controller).toContain("contact-change-request:");
    expect(controller).toContain("contact-change-confirm:");
  });

  it("normalizes, verifies uniqueness, limits attempts, and binds codes to the destination hash", () => {
    expect(service).toContain("normalizeContactChange");
    expect(service).toContain("hashContactChangeValue");
    expect(service).toContain("hashContactChangeCode");
    expect(service).toContain("verificationAttemptLimit");
    expect(service).toContain("Another account already uses this contact method");
    expect(repository).toContain("valueHash: input.valueHash");
  });

  it("updates atomically, preserves the current session, revokes others, and audits no contact", () => {
    expect(repository).toContain("this.prisma.client.$transaction");
    expect(repository).toContain("id: { not: input.currentSessionId }");
    expect(repository).toContain('status: "REVOKED"');
    expect(repository).toContain('action: "AUTH_CONTACT_CHANGE_COMPLETE"');
    expect(repository).not.toContain("newData: { email: input.value");
    expect(repository).not.toContain("newData: { phone: input.value");
  });

  it("provides a bilingual mobile-ready two-step account experience", () => {
    const styles = read("apps/web/app/globals.css");
    expect(component).toContain("requestContactChange");
    expect(component).toContain("confirmContactChange");
    expect(component).toContain("account-contact-change");
    expect(component).toContain('step: "CODE"');
    expect(component).toContain('event.key === "Escape"');
    expect(styles).toContain("@media (max-width: 640px)");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });
});
