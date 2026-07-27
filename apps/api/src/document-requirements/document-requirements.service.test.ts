import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DocumentRequirementsService } from "./document-requirements.service";

const input = {
  customerCategory: "EGYPTIAN" as const,
  documentType: "NATIONAL_ID_FRONT" as const,
  requiresSelfDrive: false,
  labelAr: "وجه بطاقة الرقم القومي",
  labelEn: "National ID front",
  allowedMimeTypes: ["image/jpeg", "application/pdf"] as Array<
    "image/jpeg" | "image/png" | "application/pdf"
  >,
  maxSizeBytes: 8 * 1024 * 1024,
  active: true,
  sortOrder: 0,
  reason: "Updating the Egyptian document policy.",
};

function setup(role: "CUSTOMER" | "SALES" | "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
  const auth = {
    getSession: vi.fn().mockResolvedValue({ user: { id: "admin-1", role } }),
  };
  const repository = {
    list: vi.fn().mockResolvedValue([]),
    find: vi.fn(),
    findEquivalent: vi.fn(),
    countOtherBaseRules: vi.fn().mockResolvedValue(1),
    create: vi.fn().mockResolvedValue({ id: "rule-1" }),
    update: vi.fn().mockResolvedValue({ id: "rule-1" }),
  };
  return {
    repository,
    service: new DocumentRequirementsService(auth as never, repository as never),
  };
}

describe("DocumentRequirementsService", () => {
  it("rejects sales accounts from document policy management", async () => {
    const { service } = setup("SALES");
    await expect(service.overview("session")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates a deterministic, audited rule without accepting a browser key", async () => {
    const { repository, service } = setup();
    await service.create("session", input);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "egyptian-national-id-front-base",
        customerCategory: "EGYPTIAN",
        documentType: "NATIONAL_ID_FRONT",
      }),
      expect.objectContaining({
        labelAr: input.labelAr,
        allowedMimeTypes: ["image/jpeg", "application/pdf"],
      }),
      "admin-1",
      input.reason,
    );
  });

  it("rejects a duplicate scenario rule", async () => {
    const { repository, service } = setup();
    repository.findEquivalent.mockResolvedValue({ id: "existing" });
    await expect(service.create("session", input)).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("does not disable the final base rule for a customer category", async () => {
    const { repository, service } = setup();
    repository.find.mockResolvedValue({
      id: "rule-1",
      active: true,
      customerCategory: "EGYPTIAN",
      requiresSelfDrive: false,
    });
    repository.countOtherBaseRules.mockResolvedValue(0);
    await expect(
      service.update("session", "rule-1", { ...input, active: false }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("updates a rule with a trimmed reason and safe configuration", async () => {
    const { repository, service } = setup();
    repository.find.mockResolvedValue({
      id: "rule-1",
      active: true,
      customerCategory: "EGYPTIAN",
      requiresSelfDrive: true,
    });
    await service.update("session", "rule-1", { ...input, reason: `  ${input.reason}  ` });
    expect(repository.update).toHaveBeenCalledWith(
      "rule-1",
      expect.objectContaining({ active: true, maxSizeBytes: 8 * 1024 * 1024 }),
      "admin-1",
      input.reason,
    );
  });

  it("does not reveal whether an unknown rule exists beyond a bounded 404", async () => {
    const { service } = setup();
    await expect(service.update("session", "missing", input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
