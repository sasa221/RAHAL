import { Injectable } from "@nestjs/common";
import type { BranchSummary, ManagedBranch } from "@rahal/contracts";
import type { Prisma } from "@rahal/database";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<BranchSummary[]> {
    const branches = await this.prisma.client.branch.findMany({
      where: { active: true },
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
        workingHours: true,
        active: true,
      },
    });
    return branches.filter(isApprovedPublicBranch).map(toPublicBranch);
  }

  async adminList(): Promise<ManagedBranch[]> {
    const branches = await this.prisma.client.branch.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      select: managedBranchSelect,
    });
    return branches.map(toManagedBranch);
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
  workingHours: true,
  active: true,
  updatedAt: true,
} as const;

type BranchRecord = Prisma.BranchGetPayload<{ select: typeof managedBranchSelect }>;
type PublicBranchRecord = Omit<BranchRecord, "updatedAt">;

type BranchWrite = {
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  latitude: number | null;
  longitude: number | null;
  phones: string[];
  whatsappNumbers: string[];
  workingHours: Prisma.InputJsonObject;
  active: boolean;
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
    workingHours: asObject(branch.workingHours),
    active: branch.active,
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
    workingHours: asObject(branch.workingHours),
    active: branch.active,
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
    workingHours: asObject(branch.workingHours) as Prisma.InputJsonObject,
    active: branch.active,
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
