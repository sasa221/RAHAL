import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("completed-rental review workflow", () => {
  it("keeps customer creation owner-scoped, completed-only, and unique", () => {
    const repository = read("apps/api/src/reviews/reviews.repository.ts");
    const schema = read("packages/database/prisma/schema.prisma");
    expect(repository).toContain("customerId: input.customerId");
    expect(repository).toContain('status: "COMPLETED"');
    expect(repository).toContain("review: null");
    expect(schema).toContain("reservationId String");
    expect(schema).toMatch(/reservationId\s+String\s+@unique/);
  });

  it("publishes approved reviews only through a privacy-minimized contract", () => {
    const repository = read("apps/api/src/reviews/reviews.repository.ts");
    const service = read("apps/api/src/reviews/reviews.service.ts");
    const contracts = read("packages/contracts/src/index.ts");
    expect(repository).toContain('status: "APPROVED"');
    expect(service).toContain("safePublicName");
    expect(contracts).toContain("export type PublicReview");
    const publicContract = contracts.slice(contracts.indexOf("export type PublicReview"));
    expect(publicContract.slice(0, publicContract.indexOf("};"))).not.toMatch(
      /email|phone|document|identity|storage/i,
    );
  });

  it("requires administrator moderation and an audited rejection reason", () => {
    const service = read("apps/api/src/reviews/reviews.service.ts");
    const repository = read("apps/api/src/reviews/reviews.repository.ts");
    expect(service).toContain('["ADMIN", "SUPER_ADMIN"]');
    expect(service).toContain('input.action === "REJECT" && !note');
    expect(repository).toContain("REVIEW_${status}");
    expect(repository).toContain("reason: input.note");
  });

  it("provides shared bilingual customer, administration, and public routes", () => {
    for (const path of [
      "apps/web/app/reviews/page.tsx",
      "apps/web/app/en/reviews/page.tsx",
      "apps/web/app/admin/reviews/page.tsx",
      "apps/web/app/en/admin/reviews/page.tsx",
      "apps/web/components/customer-review-panel.tsx",
      "apps/web/components/review-admin-workspace.tsx",
      "apps/web/components/public-reviews.tsx",
    ]) {
      expect(read(path).length).toBeGreaterThan(20);
    }
  });
});
