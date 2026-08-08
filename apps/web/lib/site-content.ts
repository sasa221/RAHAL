import type {
  PublishedSiteContent,
  SiteContentKey,
  SiteContentTranslation,
} from "@rahal/contracts";
import { getPublicContent, type PublicLocale } from "./public-content";

export function publishedTranslation(
  content: PublishedSiteContent,
  key: SiteContentKey,
  locale: PublicLocale,
): SiteContentTranslation | null {
  return (
    content.entries
      .find((entry) => entry.key === key)
      ?.translations.find((translation) => translation.locale === locale) ?? null
  );
}

export function homeContent(locale: PublicLocale, published: PublishedSiteContent) {
  const base = getPublicContent(locale);
  const hero = publishedTranslation(published, "HOME_HERO", locale);
  const process = publishedTranslation(published, "HOME_PROCESS", locale);
  const trust = publishedTranslation(published, "HOME_TRUST", locale);
  return {
    ...base,
    heroEyebrow: hero?.eyebrow ?? base.heroEyebrow,
    heroTitle: hero?.title ?? base.heroTitle,
    heroCopy: hero?.introduction ?? base.heroCopy,
    heroBadge: hero?.statement ?? base.heroBadge,
    processEyebrow: process?.eyebrow ?? base.processEyebrow,
    processTitle: process?.title ?? base.processTitle,
    processCopy: process?.introduction ?? base.processCopy,
    processNotice: process?.statement ?? base.processNotice,
    steps: process?.items.length
      ? process.items.map((item) => [item.title, item.body] as const)
      : base.steps,
    trustEyebrow: trust?.eyebrow ?? base.trustEyebrow,
    trustTitle: trust?.title ?? base.trustTitle,
    trustItems: trust?.items.length
      ? trust.items.map((item) => [item.title, item.body] as const)
      : base.trustItems,
  };
}
