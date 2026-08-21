import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("protected customer document review", () => {
  const controller = read("apps/api/src/reservations/reservations.controller.ts");
  const dto = read("apps/api/src/reservations/reservations.dto.ts");
  const repository = read("apps/api/src/reservations/reservations.repository.ts");
  const service = read("apps/api/src/reservations/reservations.service.ts");
  const storage = read("apps/api/src/reservations/private-document-storage.ts");
  const sales = read("apps/web/components/sales-review-workspace.tsx");
  const studio = read("apps/web/components/protected-document-studio.tsx");
  const customer = read("apps/web/components/customer-requests-workspace.tsx");

  it("streams documents only through an authenticated no-store POST boundary", () => {
    expect(controller).toContain('@Post("sales/:id/documents/:documentId/access")');
    expect(controller).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(controller).toContain(
      '"Content-Disposition": "inline; filename=rahal-protected-document"',
    );
    expect(controller).toContain('"X-Content-Type-Options": "nosniff"');
    expect(service).toContain("documentStorage.read(document.storageKey)");
    expect(sales).not.toContain("storageKey");
    expect(controller).not.toContain('@Get("sales/:id/documents/:documentId/access")');
  });

  it("requires a bounded access reason and assigned-reviewer authorization", () => {
    expect(dto).toContain("class SalesDocumentAccessDto");
    expect(dto).toContain("@Length(10, 300)");
    expect(service).toContain("Only the assigned reviewer can view this document");
    expect(repository).toContain("transaction.documentAccessLog.create");
    expect(service).toContain("succeeded: false");
  });

  it("uses safe path resolution for reads as well as deletion", () => {
    expect(storage).toContain("async read(storageKey: string)");
    expect(storage).toContain("this.resolveLocalKey(storageKey)");
    expect(storage).toContain("this.assertStorageKey(storageKey)");
    expect(storage).toContain('relativePath.startsWith("..")');
    expect(storage).toContain("isAbsolute(relativePath)");
    expect(storage).toContain('code === "ENOENT"');
    expect(storage).toContain("The protected document object is temporarily unavailable.");
  });

  it("supports explicit verification or rejection without exposing identity data", () => {
    expect(controller).toContain('@Post("sales/:id/documents/:documentId/review")');
    expect(dto).toContain('["VERIFY", "REJECT"]');
    expect(repository).toContain('"REVIEW_VERIFY"');
    expect(repository).toContain('"REVIEW_REJECT"');
    expect(repository).toContain("verifiedBy: input.actorId");
    expect(repository).toContain("rejectionReason:");
    expect(repository).not.toContain("identityNumber");
    expect(repository).toContain('action: "VIEW_INLINE"');
    expect(repository).toContain('return { kind: "PREVIEW_REQUIRED" as const }');
    expect(service).toContain("Preview this protected document before recording");
    expect(service).toContain(
      "Document decisions are locked after the request leaves document review.",
    );
  });

  it("returns a rejected request to the customer for a safe replacement", () => {
    expect(repository).toContain('"RESERVATION_DOCUMENT_REPLACEMENT_REQUIRED"');
    expect(repository).toContain('data: { status: "MORE_INFORMATION_REQUIRED" }');
    expect(service).toContain("Only a rejected document can be replaced after submission");
    expect(repository).toContain('"DOCUMENT_REPLACEMENT_REQUIRED"');
    expect(customer).toContain("uploadReplacement");
    expect(customer).toContain('accept="image/jpeg,image/png,application/pdf"');
  });

  it("provides a bilingual secure review studio and mobile-safe replacement controls", () => {
    expect(sales).toContain("<ProtectedDocumentStudio");
    expect(studio).toContain("Identity review, inside one secure studio.");
    expect(studio).toContain("مراجعة الهوية داخل استوديو آمن واحد.");
    expect(studio).toContain('aria-modal="true"');
    expect(studio).toContain("URL.revokeObjectURL");
    expect(studio).toContain("accessReason");
    expect(studio).toContain("decisionReason");
    expect(studio).toContain("decisionsEnabled");
    expect(studio).not.toContain("storageKey");
    expect(customer).toContain("رفع مستند بديل");
    expect(customer).toContain("Upload replacement");
    expect(customer).not.toContain("requirement.document.originalName");
    expect(service).toContain("assertProtectedUploadsEnabled");
    expect(service).toContain("Protected uploads are disabled in this delivery environment");
    expect(storage).toContain("withRetry");
  });
});
