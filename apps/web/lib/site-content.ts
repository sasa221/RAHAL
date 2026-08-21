import type {
  PublishedSiteContent,
  SiteContentKey,
  SiteContentTranslation,
} from "@rahal/contracts";
import { getPublicContent, localizedPath, type PublicLocale } from "./public-content";

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
  const heroDocument = hero?.document?.kind === "HOME_HERO" ? hero.document : null;
  const processDocument = process?.document?.kind === "HOME_PROCESS" ? process.document : null;
  const trustDocument = trust?.document?.kind === "HOME_TRUST" ? trust.document : null;
  return {
    ...base,
    heroEyebrow: heroDocument?.eyebrow ?? hero?.eyebrow ?? base.heroEyebrow,
    heroTitle: heroDocument?.title ?? hero?.title ?? base.heroTitle,
    heroCopy: heroDocument?.description ?? hero?.introduction ?? base.heroCopy,
    heroBadge: heroDocument?.badge ?? hero?.statement ?? base.heroBadge,
    heroPrimary: heroDocument?.primaryCta.label ?? base.heroPrimary,
    heroPrimaryHref: heroDocument?.primaryCta.href ?? localizedPath(locale, "/cars"),
    heroSecondary: heroDocument?.secondaryCta.label ?? base.heroSecondary,
    heroSecondaryHref: heroDocument?.secondaryCta.href ?? "#process",
    heroMedia: heroDocument?.media ?? null,
    heroVisible: heroDocument?.visible ?? true,
    processEyebrow: processDocument?.eyebrow ?? process?.eyebrow ?? base.processEyebrow,
    processTitle: processDocument?.title ?? process?.title ?? base.processTitle,
    processCopy: processDocument?.description ?? process?.introduction ?? base.processCopy,
    processNotice: processDocument?.notice ?? process?.statement ?? base.processNotice,
    steps: processDocument?.items.length
      ? processDocument.items.map((item) => [item.title, item.description] as const)
      : process?.items.length
        ? process.items.map((item) => [item.title, item.body] as const)
        : base.steps,
    trustEyebrow: trustDocument?.eyebrow ?? trust?.eyebrow ?? base.trustEyebrow,
    trustTitle: trustDocument?.title ?? trust?.title ?? base.trustTitle,
    trustItems: trustDocument?.items.length
      ? trustDocument.items.map((item) => [item.title, item.description] as const)
      : trust?.items.length
        ? trust.items.map((item) => [item.title, item.body] as const)
        : base.trustItems,
  };
}
