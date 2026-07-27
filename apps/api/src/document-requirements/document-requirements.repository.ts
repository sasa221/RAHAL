import { Injectable } from "@nestjs/common";
import type { AdminDocumentRequirementRule, ReservationDocumentType } from "@rahal/contracts";
import { PrismaService } from "../database/prisma.service";

const ruleSelect = {
  id: true,
  key: true,
  customerCategory: true,
  documentType: true,
  requiresSelfDrive: true,
  labelAr: true,
  labelEn: true,
  allowedMimeTypes: true,
  maxSizeBytes: true,
  active: true,
  sortOrder: true,
  updatedAt: true,
} as const;

type RuleWrite = {
  labelAr: string;
  labelEn: string;
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  active: boolean;
  sortOrder: number;
};

type RuleIdentity = {
  customerCategory: "EGYPTIAN" | "FOREIGN";
  documentType: ReservationDocumentType;
  requiresSelfDrive: boolean;
};

@Injectable()
export class DocumentRequirementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminDocumentRequirementRule[]> {
    const rules = await this.prisma.client.documentRequirementRule.findMany({
      orderBy: [
        { customerCategory: "asc" },
        { active: "desc" },
        { sortOrder: "asc" },
        { key: "asc" },
      ],
      select: ruleSelect,
    });
    return rules.map(toRule);
  }

  find(id: string) {
    return this.prisma.client.documentRequirementRule.findUnique({
      where: { id },
      select: ruleSelect,
    });
  }

  findEquivalent(identity: RuleIdentity) {
    return this.prisma.client.documentRequirementRule.findFirst({
      where: identity,
      select: { id: true },
    });
  }

  countOtherBaseRules(category: RuleIdentity["customerCategory"], excludedId: string) {
    return this.prisma.client.documentRequirementRule.count({
      where: {
        customerCategory: category,
        requiresSelfDrive: false,
        active: true,
        id: { not: excludedId },
      },
    });
  }

  create(
    identity: RuleIdentity & { key: string },
    input: RuleWrite,
    actorId: string,
    reason: string,
  ): Promise<AdminDocumentRequirementRule> {
    return this.prisma.client.$transaction(async (transaction) => {
      const rule = await transaction.documentRequirementRule.create({
        data: { ...identity, ...input },
        select: ruleSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "DOCUMENT_REQUIREMENT_CREATED",
          entityType: "DOCUMENT_REQUIREMENT_RULE",
          entityId: rule.id,
          reason,
          newData: auditRule(rule),
        },
      });
      return toRule(rule);
    });
  }

  update(
    id: string,
    input: RuleWrite,
    actorId: string,
    reason: string,
  ): Promise<AdminDocumentRequirementRule> {
    return this.prisma.client.$transaction(async (transaction) => {
      const previous = await transaction.documentRequirementRule.findUniqueOrThrow({
        where: { id },
        select: ruleSelect,
      });
      const rule = await transaction.documentRequirementRule.update({
        where: { id },
        data: input,
        select: ruleSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "DOCUMENT_REQUIREMENT_UPDATED",
          entityType: "DOCUMENT_REQUIREMENT_RULE",
          entityId: rule.id,
          reason,
          previousData: auditRule(previous),
          newData: auditRule(rule),
        },
      });
      return toRule(rule);
    });
  }
}

function toRule(rule: {
  id: string;
  key: string;
  customerCategory: string;
  documentType: string;
  requiresSelfDrive: boolean;
  labelAr: string;
  labelEn: string;
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  active: boolean;
  sortOrder: number;
  updatedAt: Date;
}): AdminDocumentRequirementRule {
  return {
    ...rule,
    customerCategory: rule.customerCategory as "EGYPTIAN" | "FOREIGN",
    documentType: rule.documentType as ReservationDocumentType,
    allowedMimeTypes: rule.allowedMimeTypes as AdminDocumentRequirementRule["allowedMimeTypes"],
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function auditRule(rule: {
  customerCategory: string;
  documentType: string;
  requiresSelfDrive: boolean;
  labelAr: string;
  labelEn: string;
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  active: boolean;
  sortOrder: number;
}) {
  return {
    customerCategory: rule.customerCategory,
    documentType: rule.documentType,
    requiresSelfDrive: rule.requiresSelfDrive,
    labelAr: rule.labelAr,
    labelEn: rule.labelEn,
    allowedMimeTypes: rule.allowedMimeTypes,
    maxSizeBytes: rule.maxSizeBytes,
    active: rule.active,
    sortOrder: rule.sortOrder,
  };
}
