import { createHash } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ManagedSiteContent,
  PublishedSiteContent,
  SiteContentAdminOverview,
  SiteContentKey,
  SiteContentTranslation,
} from "@rahal/contracts";
import type { Prisma } from "@rahal/database";
import { PrismaService } from "../database/prisma.service";
import { siteContentKeys } from "./content.dto";

const contentSelect = {
  id: true,
  key: true,
  status: true,
  publishedAt: true,
  updatedAt: true,
  translations: {
    orderBy: { locale: "asc" as const },
    select: {
      locale: true,
      title: true,
      body: true,
      publishedTitle: true,
      publishedBody: true,
    },
  },
} as const;

type ContentRecord = Prisma.ContentEntryGetPayload<{ select: typeof contentSelect }>;

@Injectable()
export class ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<SiteContentAdminOverview> {
    const records = await this.prisma.client.contentEntry.findMany({
      where: { key: { in: [...siteContentKeys] } },
      orderBy: { key: "asc" },
      select: contentSelect,
    });
    return {
      supportedKeys: [...siteContentKeys],
      entries: records.map(toManagedContent),
    };
  }

  async published(): Promise<PublishedSiteContent> {
    const records = await this.prisma.client.contentEntry.findMany({
      where: { key: { in: [...siteContentKeys] }, status: "PUBLISHED" },
      orderBy: { key: "asc" },
      select: contentSelect,
    });
    return {
      entries: records.flatMap((record) => {
        if (!record.publishedAt || !isContentKey(record.key)) return [];
        const translations = record.translations
          .map((translation) => toTranslation(translation, true))
          .filter((translation): translation is SiteContentTranslation => Boolean(translation));
        return translations.length === 2
          ? [{ key: record.key, translations, publishedAt: record.publishedAt.toISOString() }]
          : [];
      }),
    };
  }

  async findDraft(key: SiteContentKey): Promise<ManagedSiteContent | null> {
    const record = await this.prisma.client.contentEntry.findUnique({
      where: { key },
      select: contentSelect,
    });
    return record ? toManagedContent(record) : null;
  }

  saveDraft(input: {
    actorId: string;
    key: SiteContentKey;
    reason: string;
    translations: SiteContentTranslation[];
  }): Promise<ManagedSiteContent> {
    return this.prisma.client.$transaction(async (transaction) => {
      const previous = await transaction.contentEntry.findUnique({
        where: { key: input.key },
        select: contentSelect,
      });
      const entry = await transaction.contentEntry.upsert({
        where: { key: input.key },
        create: { key: input.key, type: "SITE_SECTION", status: "DRAFT" },
        update: { type: "SITE_SECTION" },
        select: { id: true },
      });
      for (const translation of input.translations) {
        await transaction.contentTranslation.upsert({
          where: { contentId_locale: { contentId: entry.id, locale: translation.locale } },
          create: {
            contentId: entry.id,
            locale: translation.locale,
            title: translation.title,
            body: toBody(translation),
          },
          update: {
            title: translation.title,
            body: toBody(translation),
          },
        });
      }
      const saved = await transaction.contentEntry.findUniqueOrThrow({
        where: { id: entry.id },
        select: contentSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "SITE_CONTENT_DRAFT_SAVED",
          entityType: "ContentEntry",
          entityId: entry.id,
          reason: input.reason,
          previousData: previous ? auditSnapshot(previous) : undefined,
          newData: auditSnapshot(saved),
        },
      });
      return toManagedContent(saved);
    });
  }

  publish(input: {
    actorId: string;
    key: SiteContentKey;
    reason: string;
  }): Promise<ManagedSiteContent> {
    return this.prisma.client.$transaction(async (transaction) => {
      const previous = await transaction.contentEntry.findUnique({
        where: { key: input.key },
        select: contentSelect,
      });
      if (!previous) throw new NotFoundException("The site content draft was not found.");
      const publishedAt = new Date();
      for (const translation of previous.translations) {
        await transaction.contentTranslation.update({
          where: {
            contentId_locale: { contentId: previous.id, locale: translation.locale },
          },
          data: {
            publishedTitle: translation.title,
            publishedBody: translation.body as Prisma.InputJsonValue,
          },
        });
      }
      const published = await transaction.contentEntry.update({
        where: { id: previous.id },
        data: { status: "PUBLISHED", publishedAt },
        select: contentSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "SITE_CONTENT_PUBLISHED",
          entityType: "ContentEntry",
          entityId: previous.id,
          reason: input.reason,
          previousData: auditSnapshot(previous),
          newData: auditSnapshot(published),
        },
      });
      return toManagedContent(published);
    });
  }
}

function toManagedContent(record: ContentRecord): ManagedSiteContent {
  const translations = record.translations
    .map((translation) => toTranslation(translation, false))
    .filter((translation): translation is SiteContentTranslation => Boolean(translation));
  const publishedTranslations = record.translations
    .map((translation) => toTranslation(translation, true))
    .filter((translation): translation is SiteContentTranslation => Boolean(translation));
  return {
    key: record.key as SiteContentKey,
    status: record.status,
    translations,
    publishedTranslations,
    hasUnpublishedChanges:
      stableHash(translations) !== stableHash(publishedTranslations) ||
      record.status !== "PUBLISHED",
    publishedAt: record.publishedAt?.toISOString() ?? null,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toTranslation(
  record: ContentRecord["translations"][number],
  published: boolean,
): SiteContentTranslation | null {
  if (record.locale !== "ar" && record.locale !== "en") return null;
  const title = published ? record.publishedTitle : record.title;
  const body = readBody(published ? record.publishedBody : record.body);
  if (!title || !body) return null;
  return {
    locale: record.locale,
    title,
    eyebrow: body.eyebrow,
    introduction: body.introduction,
    statement: body.statement,
    items: body.items,
  };
}

function toBody(translation: SiteContentTranslation): Prisma.InputJsonObject {
  return {
    eyebrow: translation.eyebrow,
    introduction: translation.introduction,
    statement: translation.statement,
    items: translation.items.map((item) => ({ title: item.title, body: item.body })),
  };
}

function readBody(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const eyebrow = value.eyebrow;
  const introduction = value.introduction;
  const statement = value.statement;
  const rawItems = value.items;
  if (
    typeof eyebrow !== "string" ||
    typeof introduction !== "string" ||
    typeof statement !== "string" ||
    !Array.isArray(rawItems)
  ) {
    return null;
  }
  const items = rawItems.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    return typeof item.title === "string" && typeof item.body === "string"
      ? [{ title: item.title, body: item.body }]
      : [];
  });
  if (items.length !== rawItems.length) return null;
  return { eyebrow, introduction, statement, items };
}

function auditSnapshot(record: ContentRecord): Prisma.InputJsonObject {
  return {
    key: record.key,
    status: record.status,
    locales: record.translations.map((translation) => translation.locale),
    draftHash: stableHash(
      record.translations.map((translation) => [
        translation.locale,
        translation.title,
        translation.body,
      ]),
    ),
    publishedHash: stableHash(
      record.translations.map((translation) => [
        translation.locale,
        translation.publishedTitle,
        translation.publishedBody,
      ]),
    ),
    publishedAt: record.publishedAt?.toISOString() ?? null,
  };
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isContentKey(value: string): value is SiteContentKey {
  return siteContentKeys.includes(value as SiteContentKey);
}
