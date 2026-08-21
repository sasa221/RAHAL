import { BadRequestException, Injectable } from "@nestjs/common";
import type { SiteContentDocument, SiteContentKey, SiteContentTranslation } from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import { StaffAccessService } from "../staff/staff-access.service";
import {
  siteContentKeys,
  type PublishSiteContentDto,
  type SaveSiteContentDto,
} from "./content.dto";
import { ContentRepository } from "./content.repository";
import { parseSiteContentDocument } from "./content-schema";

const forbiddenContent = [
  new RegExp("\\bA" + "ED\\b", "i"),
  new RegExp("\\bU" + "AE\\b", "i"),
  new RegExp("Du" + "bai", "i"),
  new RegExp("airport\\s+(pick" + "up|ret" + "urn)", "i"),
  new RegExp("Rahal\\s+El" + "ite", "i"),
  new RegExp("El" + "ite\\s+Mobility", "i"),
  new RegExp("con" + "cierge", "i"),
  new RegExp("\\bS" + "MS\\b", "i"),
  new RegExp(
    "\\u062f\\u0628\\u064a|\\u0627\\u0644\\u0625\\u0645\\u0627\\u0631\\u0627\\u062a|" +
      "\\u0627\\u0633\\u062a\\u0644\\u0627\\u0645 \\u0645\\u0646 \\u0627\\u0644\\u0645\\u0637\\u0627\\u0631|" +
      "\\u0625\\u0631\\u062c\\u0627\\u0639 \\u0641\\u064a \\u0627\\u0644\\u0645\\u0637\\u0627\\u0631",
    "i",
  ),
];

@Injectable()
export class ContentService {
  constructor(
    private readonly content: ContentRepository,
    private readonly auth: AuthService,
    private readonly access: StaffAccessService,
  ) {}

  published() {
    return this.content.published();
  }

  async overview(token: string | undefined) {
    const session = await this.requirePermission(token, "content.edit");
    const overview = await this.content.overview();
    return {
      ...overview,
      permissions: {
        edit: true,
        publish: await this.access.allows(session, "content.publish"),
      },
    };
  }

  async saveDraft(token: string | undefined, rawKey: string, input: SaveSiteContentDto) {
    const session = await this.requirePermission(token, "content.edit");
    const key = parseKey(rawKey);
    const translations = normalizeTranslations(key, input.translations);
    assertSafeContent(translations);
    return this.content.saveDraft({
      actorId: session.user.id,
      key,
      reason: input.reason.trim(),
      translations,
    });
  }

  async publish(token: string | undefined, rawKey: string, input: PublishSiteContentDto) {
    const session = await this.requirePermission(token, "content.publish");
    const key = parseKey(rawKey);
    const draft = await this.content.findDraft(key);
    if (!draft || draft.translations.length !== 2) {
      throw new BadRequestException("A complete Arabic and English draft is required.");
    }
    assertSafeContent(draft.translations);
    return this.content.publish({
      actorId: session.user.id,
      key,
      reason: input.reason.trim(),
    });
  }

  private async requirePermission(
    token: string | undefined,
    permission: "content.edit" | "content.publish",
  ) {
    const session = await this.auth.getSession(token);
    await this.access.require(session, permission);
    return session;
  }
}

function parseKey(value: string): SiteContentKey {
  if (!siteContentKeys.includes(value as SiteContentKey)) {
    throw new BadRequestException("This site content section is not supported.");
  }
  return value as SiteContentKey;
}

function normalizeTranslations(
  key: SiteContentKey,
  translations: SaveSiteContentDto["translations"],
): SiteContentTranslation[] {
  const locales = new Set(translations.map((translation) => translation.locale));
  if (translations.length !== 2 || locales.size !== 2 || !locales.has("ar") || !locales.has("en")) {
    throw new BadRequestException("Arabic and English content are both required exactly once.");
  }
  const typed = translations.every((translation) => Boolean(translation.document));
  const legacy = translations.every((translation) => !translation.document);
  if (!typed && !legacy) {
    throw new BadRequestException("Arabic and English must use the same content schema.");
  }
  return translations.map((translation) => {
    if (translation.document) {
      const document = parseSiteContentDocument(key, translation.document);
      return projectTypedTranslation(translation.locale, document);
    }
    if (
      !translation.eyebrow ||
      !translation.title ||
      !translation.introduction ||
      !translation.statement ||
      !translation.items
    ) {
      throw new BadRequestException("The legacy content draft is incomplete.");
    }
    return {
      locale: translation.locale,
      eyebrow: translation.eyebrow.trim(),
      title: translation.title.trim(),
      introduction: translation.introduction.trim(),
      statement: translation.statement.trim(),
      items: translation.items.map((item) => ({
        title: item.title.trim(),
        body: item.body.trim(),
      })),
    };
  });
}

function projectTypedTranslation(
  locale: "ar" | "en",
  document: SiteContentDocument,
): SiteContentTranslation {
  if (document.kind === "HOME_HERO") {
    return {
      locale,
      eyebrow: document.eyebrow,
      title: document.title,
      introduction: document.description,
      statement: document.badge,
      items: [],
      schemaVersion: 2,
      document,
    };
  }
  if (document.kind === "HOME_PROCESS" || document.kind === "HOME_TRUST") {
    return {
      locale,
      eyebrow: document.eyebrow,
      title: document.title,
      introduction: document.description,
      statement: document.kind === "HOME_PROCESS" ? document.notice : document.description,
      items: document.items.map((item) => ({ title: item.title, body: item.description })),
      schemaVersion: 2,
      document,
    };
  }
  if (document.kind === "ABOUT" || document.kind === "HOW_IT_WORKS") {
    return {
      locale,
      eyebrow: document.eyebrow,
      title: document.title,
      introduction: document.introduction,
      statement: document.statement,
      items: document.sections.map((item) => ({ title: item.title, body: item.body })),
      schemaVersion: 2,
      document,
    };
  }
  if (document.kind === "FAQ") {
    return {
      locale,
      eyebrow: document.eyebrow,
      title: document.title,
      introduction: document.introduction,
      statement: document.introduction,
      items: document.items
        .filter((item) => item.published)
        .map((item) => ({ title: item.question, body: item.answer })),
      schemaVersion: 2,
      document,
    };
  }
  if (document.kind !== "CONTACT") {
    throw new BadRequestException("The content document could not be projected.");
  }
  return {
    locale,
    eyebrow: document.eyebrow,
    title: document.title,
    introduction: document.introduction,
    statement: document.address,
    items: [],
    schemaVersion: 2,
    document,
  };
}

function assertSafeContent(translations: SiteContentTranslation[]) {
  const text = translations
    .flatMap((translation) => [
      translation.eyebrow,
      translation.title,
      translation.introduction,
      translation.statement,
      translation.document ? JSON.stringify(translation.document) : "",
      ...translation.items.flatMap((item) => [item.title, item.body]),
    ])
    .join("\n");
  if (forbiddenContent.some((pattern) => pattern.test(text))) {
    throw new BadRequestException("The draft contains content that is not part of Rahal Egypt.");
  }
}
