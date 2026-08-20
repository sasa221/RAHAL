import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("customer profile and communication preferences", () => {
  it("keeps customer self-service owner-scoped and role-protected", () => {
    const service = read("apps/api/src/account/account.service.ts");
    const repository = read("apps/api/src/account/account.repository.ts");
    expect(service).toContain('session.user.role !== "CUSTOMER"');
    expect(repository).toContain('where: { id: userId, systemRole: "CUSTOMER" }');
    expect(repository).not.toContain("findMany");
  });

  it("does not accept sign-in contact changes through the profile endpoint", () => {
    const dto = read("apps/api/src/account/account.dto.ts");
    const controller = read("apps/api/src/account/account.controller.ts");
    expect(controller).toContain('@Patch("profile")');
    expect(dto).not.toMatch(/email!|phone!/);
  });

  it("keeps operational in-app notifications enabled and marketing separate", () => {
    const repository = read("apps/api/src/account/account.repository.ts");
    const contracts = read("packages/contracts/src/index.ts");
    expect(repository).toContain("inAppEnabled: true");
    expect(contracts).toContain("inAppEnabled: true");
    expect(contracts).toContain("marketingEnabled: boolean");
    expect(contracts).toContain("marketingConsentDecided: boolean");
  });

  it("audits only changed profile field names rather than profile values", () => {
    const repository = read("apps/api/src/account/account.repository.ts");
    const transaction = repository.slice(
      repository.indexOf("updateProfile("),
      repository.indexOf("updateNotifications("),
    );
    expect(transaction).toContain("newData: { changedFields }");
    expect(transaction).not.toContain("previousData");
  });

  it("ships shared Arabic and English responsive account routes", () => {
    const component = read("apps/web/components/customer-account-workspace.tsx");
    expect(component).toContain("ar: {");
    expect(component).toContain("en: {");
    expect(component).toContain('activePage="profile"');
    expect(read("apps/web/app/account/profile/page.tsx")).toContain('locale="ar"');
    expect(read("apps/web/app/en/account/profile/page.tsx")).toContain('locale="en"');
  });

  it("asks customers for an explicit marketing choice once and preserves account controls", () => {
    const gate = read("apps/web/components/marketing-consent-gate.tsx");
    const pushGate = read("apps/web/components/push-permission-gate.tsx");
    const repository = read("apps/api/src/account/account.repository.ts");
    const layout = read("apps/web/app/layout.tsx");
    expect(gate).toContain('sessionPayload.data.user.role !== "CUSTOMER"');
    expect(gate).toContain('setState(decided ? "HIDDEN" : "PROMPT")');
    expect(gate).toContain("void decide(true)");
    expect(gate).toContain("void decide(false)");
    expect(gate).toContain("pendingDecision ?? true");
    expect(gate).toContain("No thanks");
    expect(pushGate).toContain("rahal:marketing-gate-ready");
    expect(pushGate).toContain('"rahal:marketing-consent-changed"');
    expect(repository).toContain("marketingConsentDecidedAt = new Date()");
    expect(layout).toContain("<MarketingConsentGate");
  });
});
