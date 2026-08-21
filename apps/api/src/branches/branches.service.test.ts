import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BranchesService } from "./branches.service";

const input = {
  nameAr: "فرع رحال",
  nameEn: "Rahal Branch",
  addressAr: "عنوان فرع رحال في القاهرة",
  addressEn: "Rahal branch address in Cairo",
  governorateAr: "القاهرة",
  governorateEn: "Cairo",
  areaAr: "وسط البلد",
  areaEn: "Downtown",
  streetAr: "شارع رحال",
  streetEn: "Rahal Street",
  latitude: 30.01,
  longitude: 31.2,
  phones: ["+201000000000"],
  whatsappNumber: "+201000000000",
  whatsappVisible: true,
  socialLinks: [],
  services: ["BRANCH_PICKUP"],
  workingHours: {
    timezone: "Africa/Cairo",
    weekly: ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map(
      (day) => ({ day, closed: false, opensAt: "09:00", closesAt: "22:00" }),
    ),
    exceptions: [],
  },
  status: "ACTIVE" as const,
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
      { require: vi.fn(), allows: vi.fn().mockResolvedValue(true) } as never,
    );

    await expect(service.create("session", input)).resolves.toEqual({ id: "branch-1" });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        nameAr: "فرع رحال",
        phones: ["+201000000000"],
        status: "ACTIVE",
      }),
      "admin-1",
    );
  });

  it("enforces dedicated disable and delete permissions and explains linked deletion", async () => {
    const access = { require: vi.fn(), allows: vi.fn() };
    const repository = {
      setStatus: vi.fn().mockResolvedValue({ id: "branch-1", status: "INACTIVE" }),
      deleteUnreferenced: vi.fn().mockResolvedValue("REFERENCED"),
    };
    const service = new BranchesService(
      repository as never,
      {
        getSession: vi.fn().mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } }),
      } as never,
      access as never,
    );
    await expect(
      service.disable("session", "branch-1", { reason: "Branch temporarily closed" }),
    ).resolves.toMatchObject({ status: "INACTIVE" });
    expect(access.require).toHaveBeenCalledWith(expect.anything(), "branches.disable");
    await expect(
      service.delete("session", "branch-1", { reason: "Remove unused branch" }),
    ).rejects.toThrow("Disable it instead");
    expect(access.require).toHaveBeenCalledWith(expect.anything(), "branches.delete");
  });

  it("rejects non-administrators and missing updates", async () => {
    const auth = {
      getSession: vi.fn().mockResolvedValue({ user: { id: "sales-1", role: "SALES" } }),
    };
    const access = {
      require: vi.fn().mockRejectedValue(new ForbiddenException()),
      allows: vi.fn(),
    };
    const service = new BranchesService(
      { adminOverview: vi.fn() } as never,
      auth as never,
      access as never,
    );
    await expect(service.adminList("session")).rejects.toBeInstanceOf(ForbiddenException);

    auth.getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    const missing = new BranchesService(
      {
        findStatus: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue(null),
      } as never,
      auth as never,
      { require: vi.fn(), allows: vi.fn() } as never,
    );
    await expect(missing.update("session", "missing", input)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
