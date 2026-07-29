import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BranchesService } from "./branches.service";

const input = {
  nameAr: "فرع رحال",
  nameEn: "Rahal Branch",
  addressAr: "عنوان فرع رحال في القاهرة",
  addressEn: "Rahal branch address in Cairo",
  latitude: 30.01,
  longitude: 31.2,
  phones: ["+201000000000"],
  whatsappNumbers: ["+201000000000"],
  workingHours: { regular: "09:00–22:00", friday: "14:00–22:00" },
  active: true,
};

describe("BranchesService administration", () => {
  it("normalizes and audits branch writes through the repository", async () => {
    const create = vi.fn().mockResolvedValue({ id: "branch-1" });
    const service = new BranchesService(
      { create } as never,
      {
        getSession: vi.fn().mockResolvedValue({
          user: { id: "admin-1", role: "ADMIN" },
        }),
      } as never,
    );

    await expect(service.create("session", input)).resolves.toEqual({ id: "branch-1" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        nameAr: "فرع رحال",
        phones: ["+201000000000"],
        workingHours: input.workingHours,
      }),
      "admin-1",
    );
  });

  it("rejects non-administrators and missing updates", async () => {
    const auth = {
      getSession: vi.fn().mockResolvedValue({ user: { id: "sales-1", role: "SALES" } }),
    };
    const service = new BranchesService({ adminList: vi.fn() } as never, auth as never);
    await expect(service.adminList("session")).rejects.toBeInstanceOf(ForbiddenException);

    auth.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const missing = new BranchesService(
      { update: vi.fn().mockResolvedValue(null) } as never,
      auth as never,
    );
    await expect(missing.update("session", "missing", input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
