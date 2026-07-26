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
    expect(storage).toContain("this.resolveKey(storageKey)");
    expect(storage).toContain('relativePath.startsWith("..")');
    expect(storage).toContain("isAbsolute(relativePath)");
  });

  it("supports explicit verification or rejection without exposing identity data", () => {
    expect(controller).toContain('@Post("sales/:id/documents/:documentId/review")');
    expect(dto).toContain('["VERIFY", "REJECT"]');
    expect(repository).toContain('"REVIEW_VERIFY"');
    expect(repository).toContain('"REVIEW_REJECT"');
    expect(repository).toContain("verifiedBy: input.actorId");
    expect(repository).toContain("rejectionReason:");
    expect(repository).not.toContain("identityNumber");
  });

  it("returns a rejected request to the customer for a safe replacement", () => {
    expect(repository).toContain('"RESERVATION_DOCUMENT_REPLACEMENT_REQUIRED"');
    expect(repository).toContain('data: { status: "MORE_INFORMATION_REQUIRED" }');
    expect(service).toContain("Only a rejected document can be replaced after submission");
    expect(repository).toContain('"DOCUMENT_REPLACEMENT_REQUIRED"');
    expect(customer).toContain("uploadReplacement");
    expect(customer).toContain('accept="image/jpeg,image/png,application/pdf"');
  });

  it("provides bilingual inline review and mobile-safe replacement controls", () => {
    expect(sales).toContain("فحص المستند");
    expect(sales).toContain("Inspect document");
    expect(sales).toContain('className="sales-document-review"');
    expect(customer).toContain("رفع مستند بديل");
    expect(customer).toContain("Upload replacement");
  });
});
