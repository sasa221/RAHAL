import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type {
  ManagedPolicyBundle,
  ManagedPolicyCopy,
  PolicyManagementOverview,
} from "@rahal/contracts";
import { PrismaService } from "../database/prisma.service";

const requiredKeys = [
  "RENTAL_TERMS",
  "PRIVACY",
  "DOCUMENT_PROCESSING",
  "RESERVATION_PROCESS",
] as const;

@Injectable()
export class PoliciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<PolicyManagementOverview> {
    const records = await this.prisma.client.policyVersion.findMany({
      orderBy: [{ effectiveAt: "desc" }, { policyKey: "asc" }, { locale: "asc" }],
      take: 160,
      select: {
        policyKey: true,
        version: true,
        locale: true,
        title: true,
        body: true,
        effectiveAt: true,
        retiredAt: true,
      },
    });
    const groups = new Map<string, ManagedPolicyBundle>();
    for (const record of records) {
      const existing = groups.get(record.version) ?? {
        version: record.version,
        effectiveAt: record.effectiveAt.toISOString(),
        developmentOnly: record.version.startsWith("DEV-"),
        complete: false,
        copies: [],
      };
      if (isPolicyKey(record.policyKey) && isLocale(record.locale)) {
        existing.copies.push({
          key: record.policyKey,
          locale: record.locale,
          title: record.title,
          body: record.body,
        });
      }
      groups.set(record.version, existing);
    }
    const bundles = [...groups.values()]
      .map((bundle) => ({
        ...bundle,
        complete: hasCompleteMatrix(bundle.copies),
        copies: bundle.copies.sort(
          (left, right) =>
            requiredKeys.indexOf(left.key) - requiredKeys.indexOf(right.key) ||
            left.locale.localeCompare(right.locale),
        ),
      }))
      .sort((left, right) => right.effectiveAt.localeCompare(left.effectiveAt))
      .slice(0, 12);

    const now = new Date();
    const activeRows = records.filter(
      (record) =>
        record.effectiveAt <= now &&
        (!record.retiredAt || record.retiredAt.getTime() > now.getTime()),
    );
    const selected = new Map<string, (typeof activeRows)[number]>();
    for (const record of activeRows) {
      const key = `${record.policyKey}:${record.locale}`;
      if (!selected.has(key)) selected.set(key, record);
    }
    const activeVersions = new Set([...selected.values()].map((record) => record.version));
    const activeVersion =
      selected.size === requiredKeys.length * 2 && activeVersions.size === 1
        ? ([...activeVersions][0] ?? null)
        : null;

    return {
      activeVersion,
      activeIsDevelopmentOnly: activeVersion?.startsWith("DEV-") ?? false,
      bundles,
    };
  }

  publish(input: {
    actorId: string;
    version: string;
    effectiveAt: Date;
    reason: string;
    copies: ManagedPolicyCopy[];
  }) {
    return this.prisma.client.$transaction(async (transaction) => {
      const exists = await transaction.policyVersion.count({
        where: { version: input.version },
      });
      if (exists) return false;
      await transaction.policyVersion.updateMany({
        where: {
          retiredAt: null,
          effectiveAt: { lt: input.effectiveAt },
        },
        data: { retiredAt: input.effectiveAt },
      });
      await transaction.policyVersion.createMany({
        data: input.copies.map((copy) => ({
          policyKey: copy.key,
          version: input.version,
          locale: copy.locale,
          title: copy.title,
          body: copy.body,
          effectiveAt: input.effectiveAt,
        })),
      });
      const contentHash = createHash("sha256")
        .update(
          JSON.stringify(
            input.copies
              .map((copy) => [copy.key, copy.locale, copy.title, copy.body])
              .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
          ),
        )
        .digest("hex");
      await transaction.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "POLICY_BUNDLE_PUBLISHED",
          entityType: "PolicyVersion",
          entityId: input.version,
          reason: input.reason,
          newData: {
            version: input.version,
            effectiveAt: input.effectiveAt.toISOString(),
            policyKeys: [...requiredKeys],
            locales: ["ar", "en"],
            contentHash,
          },
        },
      });
      return true;
    });
  }
}

function isPolicyKey(value: string): value is ManagedPolicyCopy["key"] {
  return requiredKeys.includes(value as ManagedPolicyCopy["key"]);
}

function isLocale(value: string): value is ManagedPolicyCopy["locale"] {
  return value === "ar" || value === "en";
}

function hasCompleteMatrix(copies: ManagedPolicyCopy[]) {
  return requiredKeys.every((key) =>
    (["ar", "en"] as const).every(
      (locale) => copies.filter((copy) => copy.key === key && copy.locale === locale).length === 1,
    ),
  );
}
