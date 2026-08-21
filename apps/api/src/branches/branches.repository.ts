import { Injectable } from "@nestjs/common";
import type { BranchManagementOverview, BranchSummary, ManagedBranch } from "@rahal/contracts";
import type { Prisma } from "@rahal/database";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<BranchSummary[]> {
    const branches = await this.prisma.client.branch.findMany({
      where: { active: true, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        addressAr: true,
        addressEn: true,
        latitude: true,
        longitude: true,
        phones: true,
        whatsappNumbers: true,
        whatsappVisible: true,
        whatsappMessageAr: true,
        whatsappMessageEn: true,
        workingHours: true,
        active: true,
        governorateAr: true,
        governorateEn: true,
        areaAr: true,
        areaEn: true,
        streetAr: true,
        streetEn: true,
        landmarkAr: true,
        landmarkEn: true,
        email: true,
        socialLinks: true,
        services: true,
        managerId: true,
        status: true,
        whatsappNumber: true,
      },
    });
    return branches.filter(isApprovedPublicBranch).map(toPublicBranch);
  }

  async adminOverview(): Promise<Omit<BranchManagementOverview, "permissions">> {
    const [branches, managers] = await Promise.all([
      this.prisma.client.branch.findMany({
        orderBy: [{ active: "desc" }, { createdAt: "asc" }],
        select: managedBranchSelect,
      }),
      this.prisma.client.user.findMany({
        where: { systemRole: { in: ["ADMIN", "SUPER_ADMIN", "SALES"] }, status: "ACTIVE" },
        orderBy: { fullNameEn: "asc" },
        select: { id: true, fullNameAr: true, fullNameEn: true },
      }),
    ]);
    return {
      branches: branches.map(toManagedBranch),
      managers: managers.map((manager) => ({
        id: manager.id,
        name: manager.fullNameAr || manager.fullNameEn,
      })),
    };
  }

  async findStatus(id: string) {
    return this.prisma.client.branch.findUnique({ where: { id }, select: { status: true } });
  }

  create(input: BranchWrite, actorId: string): Promise<ManagedBranch> {
    return this.prisma.client.$transaction(async (transaction) => {
      const branch = await transaction.branch.create({
        data: input,
        select: managedBranchSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "BRANCH_CREATED",
          entityType: "Branch",
          entityId: branch.id,
          newData: auditBranch(branch),
        },
      });
      return toManagedBranch(branch);
    });
  }

  update(id: string, input: BranchWrite, actorId: string): Promise<ManagedBranch | null> {
    return this.prisma.client.$transaction(async (transaction) => {
      const previous = await transaction.branch.findUnique({
        where: { id },
        select: managedBranchSelect,
      });
      if (!previous) return null;
      const branch = await transaction.branch.update({
        where: { id },
        data: input,
        select: managedBranchSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "BRANCH_UPDATED",
          entityType: "Branch",
          entityId: branch.id,
          previousData: auditBranch(previous),
          newData: auditBranch(branch),
        },
      });
      return toManagedBranch(branch);
    });
  }

  setStatus(
    id: string,
    status: "INACTIVE",
    actorId: string,
    reason: string,
  ): Promise<ManagedBranch | null> {
    return this.prisma.client.$transaction(async (transaction) => {
      const previous = await transaction.branch.findUnique({
        where: { id },
        select: managedBranchSelect,
      });
      if (!previous) return null;
      const branch = await transaction.branch.update({
        where: { id },
        data: { status, active: false },
        select: managedBranchSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "BRANCH_DISABLED",
          entityType: "Branch",
          entityId: id,
          reason,
          previousData: auditBranch(previous),
          newData: auditBranch(branch),
        },
      });
      return toManagedBranch(branch);
    });
  }

  deleteUnreferenced(
    id: string,
    actorId: string,
    reason: string,
  ): Promise<"DELETED" | "NOT_FOUND" | "REFERENCED"> {
    return this.prisma.client.$transaction(async (transaction) => {
      const branch = await transaction.branch.findUnique({
        where: { id },
        select: managedBranchSelect,
      });
      if (!branch) return "NOT_FOUND";
      if (branch._count.vehicles || branch._count.reservations || branch._count.bookings)
        return "REFERENCED";
      await transaction.branch.delete({ where: { id } });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "BRANCH_DELETED",
          entityType: "Branch",
          entityId: id,
          reason,
          previousData: auditBranch(branch),
        },
      });
      return "DELETED";
    });
  }
}

const managedBranchSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  addressAr: true,
  addressEn: true,
  latitude: true,
  longitude: true,
  phones: true,
  whatsappNumbers: true,
  whatsappVisible: true,
  whatsappMessageAr: true,
  whatsappMessageEn: true,
  workingHours: true,
  active: true,
  governorateAr: true,
  governorateEn: true,
  areaAr: true,
  areaEn: true,
  streetAr: true,
  streetEn: true,
  landmarkAr: true,
  landmarkEn: true,
  email: true,
  socialLinks: true,
  services: true,
  managerId: true,
  status: true,
  whatsappNumber: true,
  manager: { select: { fullNameAr: true, fullNameEn: true } },
  _count: { select: { vehicles: true, reservations: true, bookings: true } },
  updatedAt: true,
} as const;

type BranchRecord = Prisma.BranchGetPayload<{ select: typeof managedBranchSelect }>;
type PublicBranchRecord = Omit<BranchRecord, "updatedAt" | "manager" | "_count">;

type BranchWrite = {
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  latitude: number | null;
  longitude: number | null;
  phones: string[];
  whatsappNumbers: string[];
  whatsappVisible: boolean;
  whatsappMessageAr: string | null;
  whatsappMessageEn: string | null;
  workingHours: Prisma.InputJsonObject;
  active: boolean;
  governorateAr: string;
  governorateEn: string;
  areaAr: string;
  areaEn: string;
  streetAr: string;
  streetEn: string;
  landmarkAr: string | null;
  landmarkEn: string | null;
  email: string | null;
  socialLinks: Prisma.InputJsonArray;
  services: Prisma.InputJsonArray;
  managerId: string | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  whatsappNumber: string | null;
};

function toManagedBranch(branch: BranchRecord): ManagedBranch {
  return {
    id: branch.id,
    nameAr: branch.nameAr,
    nameEn: branch.nameEn,
    addressAr: branch.addressAr,
    addressEn: branch.addressEn,
    latitude: branch.latitude?.toNumber() ?? null,
    longitude: branch.longitude?.toNumber() ?? null,
    phones: asStringArray(branch.phones),
    whatsappNumbers: asStringArray(branch.whatsappNumbers),
    whatsappVisible: branch.whatsappVisible,
    whatsappMessageAr: branch.whatsappMessageAr,
    whatsappMessageEn: branch.whatsappMessageEn,
    workingHours: asObject(branch.workingHours),
    active: branch.active,
    governorateAr: branch.governorateAr ?? "",
    governorateEn: branch.governorateEn ?? "",
    areaAr: branch.areaAr ?? "",
    areaEn: branch.areaEn ?? "",
    streetAr: branch.streetAr ?? "",
    streetEn: branch.streetEn ?? "",
    landmarkAr: branch.landmarkAr,
    landmarkEn: branch.landmarkEn,
    email: branch.email,
    socialLinks: asSocialLinks(branch.socialLinks),
    services: asStringArray(branch.services),
    managerId: branch.managerId,
    managerName: branch.manager?.fullNameAr || branch.manager?.fullNameEn || null,
    status: branch.status,
    whatsappNumber: branch.whatsappNumber ?? asStringArray(branch.whatsappNumbers)[0] ?? null,
    dependencyCounts: branch._count,
    updatedAt: branch.updatedAt.toISOString(),
  };
}

function toPublicBranch(branch: PublicBranchRecord): BranchSummary {
  return {
    id: branch.id,
    nameAr: branch.nameAr,
    nameEn: branch.nameEn,
    addressAr: branch.addressAr,
    addressEn: branch.addressEn,
    latitude: branch.latitude?.toNumber() ?? null,
    longitude: branch.longitude?.toNumber() ?? null,
    phones: asStringArray(branch.phones),
    whatsappNumbers: asStringArray(branch.whatsappNumbers),
    whatsappVisible: branch.whatsappVisible,
    whatsappMessageAr: branch.whatsappMessageAr,
    whatsappMessageEn: branch.whatsappMessageEn,
    workingHours: asObject(branch.workingHours),
    active: branch.active,
    governorateAr: branch.governorateAr ?? "",
    governorateEn: branch.governorateEn ?? "",
    areaAr: branch.areaAr ?? "",
    areaEn: branch.areaEn ?? "",
    streetAr: branch.streetAr ?? "",
    streetEn: branch.streetEn ?? "",
    landmarkAr: branch.landmarkAr,
    landmarkEn: branch.landmarkEn,
    email: branch.email,
    socialLinks: asSocialLinks(branch.socialLinks),
    services: asStringArray(branch.services),
    managerId: branch.managerId,
    status: branch.status,
    whatsappNumber: branch.whatsappNumber ?? asStringArray(branch.whatsappNumbers)[0] ?? null,
  };
}

function isApprovedPublicBranch(branch: PublicBranchRecord) {
  const searchable = [branch.nameAr, branch.nameEn, branch.addressAr, branch.addressEn]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase();
  return !["demo", "fictional", "temporary", "تجريبي", "مؤقت"].some((marker) =>
    searchable.includes(marker),
  );
}

function auditBranch(branch: BranchRecord): Prisma.InputJsonObject {
  return {
    nameAr: branch.nameAr,
    nameEn: branch.nameEn,
    addressAr: branch.addressAr,
    addressEn: branch.addressEn,
    latitude: branch.latitude?.toNumber() ?? null,
    longitude: branch.longitude?.toNumber() ?? null,
    phones: asStringArray(branch.phones),
    whatsappNumbers: asStringArray(branch.whatsappNumbers),
    whatsappVisible: branch.whatsappVisible,
    whatsappMessageAr: branch.whatsappMessageAr,
    whatsappMessageEn: branch.whatsappMessageEn,
    workingHours: asObject(branch.workingHours) as Prisma.InputJsonObject,
    active: branch.active,
    status: branch.status,
    managerId: branch.managerId,
    email: branch.email,
  };
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asSocialLinks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    return typeof row.id === "string" &&
      typeof row.platform === "string" &&
      typeof row.url === "string"
      ? [{ id: row.id, platform: row.platform, url: row.url }]
      : [];
  });
}
