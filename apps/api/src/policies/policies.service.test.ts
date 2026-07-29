import { describe, expect, it, vi } from "vitest";
import { PoliciesService } from "./policies.service";

const copies = (
  ["RENTAL_TERMS", "PRIVACY", "DOCUMENT_PROCESSING", "RESERVATION_PROCESS"] as const
).flatMap((key) =>
  (["ar", "en"] as const).map((locale) => ({
    key,
    locale,
    title: `${key} ${locale} approved title`,
    body: `${key} ${locale} approved legal body `.repeat(4),
  })),
);

function build(role: "CUSTOMER" | "ADMIN" = "ADMIN") {
  const repository = {
    overview: vi.fn().mockResolvedValue({
      activeVersion: "POLICY-2026-01",
      activeIsDevelopmentOnly: false,
      bundles: [],
    }),
    publish: vi.fn().mockResolvedValue(true),
  };
  const auth = {
    getSession: vi.fn().mockResolvedValue({ user: { id: "admin-1", role } }),
  };
  return {
    service: new PoliciesService(repository as never, auth as never),
    repository,
  };
}

describe("PoliciesService", () => {
  it("requires an administrator", async () => {
    const { service } = build("CUSTOMER");
    await expect(service.overview("token")).rejects.toThrow(
      "Only administrators can publish policy bundles.",
    );
  });

  it("publishes one complete immediate bilingual bundle", async () => {
    const { service, repository } = build();
    await expect(
      service.publish("token", {
        version: "policy-2026-01",
        effectiveAt: new Date().toISOString(),
        copies,
        reason: "Approved by the company owner and legal reviewer.",
      }),
    ).resolves.toMatchObject({ activeVersion: "POLICY-2026-01" });
    expect(repository.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        version: "POLICY-2026-01",
        copies: expect.arrayContaining([
          expect.objectContaining({ key: "PRIVACY", locale: "ar" }),
          expect.objectContaining({ key: "PRIVACY", locale: "en" }),
        ]),
      }),
    );
  });

  it("rejects development prefixes and incomplete bilingual matrices", async () => {
    const { service } = build();
    await expect(
      service.publish("token", {
        version: "DEV-RELEASE",
        effectiveAt: new Date().toISOString(),
        copies,
        reason: "Approved by the company owner and legal reviewer.",
      }),
    ).rejects.toThrow("cannot use the DEV- prefix");
    await expect(
      service.publish("token", {
        version: "POLICY-2026-02",
        effectiveAt: new Date().toISOString(),
        copies: copies.slice(0, 7),
        reason: "Approved by the company owner and legal reviewer.",
      }),
    ).rejects.toThrow("required exactly once");
  });
});
