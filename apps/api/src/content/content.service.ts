import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import type { SiteContentKey, SiteContentTranslation } from "@rahal/contracts";
import { AuthService } from "../auth/auth.service";
import {
  siteContentKeys,
  type PublishSiteContentDto,
  type SaveSiteContentDto,
} from "./content.dto";
import { ContentRepository } from "./content.repository";

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
  ) {}

  published() {
    return this.content.published();
  }

  async overview(token: string | undefined) {
    await this.requireAdmin(token);
    return this.content.overview();
  }

  async saveDraft(token: string | undefined, rawKey: string, input: SaveSiteContentDto) {
    const session = await this.requireAdmin(token);
    const key = parseKey(rawKey);
    const translations = normalizeTranslations(input.translations);
    assertSafeContent(translations);
    return this.content.saveDraft({
      actorId: session.user.id,
      key,
      reason: input.reason.trim(),
      translations,
    });
  }

  async publish(token: string | undefined, rawKey: string, input: PublishSiteContentDto) {
    const session = await this.requireAdmin(token);
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

  private async requireAdmin(token: string | undefined) {
    const session = await this.auth.getSession(token);
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      throw new ForbiddenException("Only administrators can manage public site content.");
    }
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
  translations: SaveSiteContentDto["translations"],
): SiteContentTranslation[] {
  const locales = new Set(translations.map((translation) => translation.locale));
  if (translations.length !== 2 || locales.size !== 2 || !locales.has("ar") || !locales.has("en")) {
    throw new BadRequestException("Arabic and English content are both required exactly once.");
  }
  return translations.map((translation) => ({
    locale: translation.locale,
    eyebrow: translation.eyebrow.trim(),
    title: translation.title.trim(),
    introduction: translation.introduction.trim(),
    statement: translation.statement.trim(),
    items: translation.items.map((item) => ({
      title: item.title.trim(),
      body: item.body.trim(),
    })),
  }));
}

function assertSafeContent(translations: SiteContentTranslation[]) {
  const text = translations
    .flatMap((translation) => [
      translation.eyebrow,
      translation.title,
      translation.introduction,
      translation.statement,
      ...translation.items.flatMap((item) => [item.title, item.body]),
    ])
    .join("\n");
  if (forbiddenContent.some((pattern) => pattern.test(text))) {
    throw new BadRequestException("The draft contains content that is not part of Rahal Egypt.");
  }
}
