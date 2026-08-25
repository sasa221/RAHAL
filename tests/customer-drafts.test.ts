import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("customer reservation draft center", () => {
  const controller = read("apps/api/src/reservations/reservations.controller.ts");
  const repository = read("apps/api/src/reservations/reservations.repository.ts");
  const service = read("apps/api/src/reservations/reservations.service.ts");
  const workspace = read("apps/web/components/customer-requests-workspace.tsx");
  const reservation = read("apps/web/components/reservation-start.tsx");

  it("keeps listing, resume, and abandonment owner-scoped on the server", () => {
    expect(controller).toContain('@Get("customer/drafts")');
    expect(controller).toContain('@Get("customer/drafts/:id")');
    expect(controller).toContain('@Delete("customer/drafts/:id")');
    expect(repository).toContain('where: { id, customerId, status: "DRAFT"');
    expect(service).toContain("assertCustomerAccess(session.user.role)");
  });

  it("expires drafts only when their own pickup time passes", () => {
    const expiry = repository
      .split("async expireStaleReviewWindows")[1]!
      .split("const dueOffers")[0]!;
    expect(expiry).toContain('status: "DRAFT"');
    expect(expiry).toContain("pickupAt: { lte: now }");
    expect(expiry).toContain('toStatus: "EXPIRED"');
    expect(expiry).not.toContain("createdAt: {");
    expect(expiry).not.toContain("booking.create");
  });

  it("soft-deletes private metadata and removes object keys on abandonment and expiry", () => {
    expect(repository).toContain('data: { status: "DELETED", deletedAt: abandonedAt }');
    expect(repository).toContain("removedDraftStorageKeys");
    expect(service).toContain("abandoned.storageKeys.map");
    expect(read("apps/api/src/reservations/reservation-expiry.service.ts")).toContain(
      "this.documentStorage.remove(storageKey)",
    );
  });

  it("hydrates the exact saved draft instead of starting a duplicate journey", () => {
    expect(workspace).toContain("draft: draft.id");
    expect(workspace).toContain("draft.progress.completedSteps");
    expect(workspace).toContain("customer/drafts?locale=${locale}");
    expect(reservation).toContain("/api/reservations/customer/drafts/");
    expect(reservation).toContain("?locale=${locale}");
    expect(reservation).toContain('setCustomerCategory("FOREIGN")');
    expect(reservation).toContain("setSavedConsents");
    expect(reservation).toContain("requestedDraft");
  });

  it("ships bilingual responsive progress, confirmation, and reduced-motion states", () => {
    expect(workspace).toContain("رحلات بدأت ولم تُرسل بعد");
    expect(workspace).toContain("Journeys started, not yet submitted");
    expect(workspace).toContain('role="progressbar"');
    expect(workspace).toContain('role="alert"');
    const css = read("apps/web/app/globals.css");
    expect(css).toContain(".customer-drafts-studio");
    expect(css).toContain("@keyframes customer-draft-fill");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
