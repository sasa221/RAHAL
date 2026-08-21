import { BadRequestException } from "@nestjs/common";
import type {
  SiteContentCta,
  SiteContentDocument,
  SiteContentKey,
  SiteContentOrderedItem,
} from "@rahal/contracts";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+[1-9]\d{7,14}$/;

export function parseSiteContentDocument(key: SiteContentKey, value: unknown): SiteContentDocument {
  const source = object(value, "content document");
  if (source.kind !== key) fail("Content schema does not match the selected section.");

  if (key === "HOME_HERO") {
    return {
      kind: key,
      eyebrow: text(source.eyebrow, "small heading", 2, 100),
      title: text(source.title, "title", 4, 180),
      description: text(source.description, "description", 20, 1_500),
      badge: text(source.badge, "badge", 3, 300),
      primaryCta: cta(source.primaryCta),
      secondaryCta: cta(source.secondaryCta),
      media: media(source.media),
      visible: boolean(source.visible, "visibility"),
    };
  }
  if (key === "HOME_PROCESS" || key === "HOME_TRUST") {
    const items = orderedItems(source.items, key === "HOME_PROCESS" ? 8 : 6);
    if (!items.length) fail("At least one ordered item is required.");
    return {
      kind: key,
      eyebrow: text(source.eyebrow, "small heading", 2, 100),
      title: text(source.title, "title", 4, 180),
      description: text(source.description, "description", 20, 1_500),
      ...(key === "HOME_PROCESS"
        ? { notice: text(source.notice, "notice", 5, 500), items }
        : { items }),
    } as SiteContentDocument;
  }
  if (key === "ABOUT" || key === "HOW_IT_WORKS") {
    const sections = array(source.sections, "sections", 1, 12).map((item, index) => {
      const row = object(item, `section ${index + 1}`);
      return {
        id: id(row.id, index),
        title: text(row.title, "section title", 2, 160),
        body: text(row.body, "section body", 10, 2_000),
        imageUrl: optionalUrl(row.imageUrl),
      };
    });
    return {
      kind: key,
      eyebrow: text(source.eyebrow, "small heading", 2, 100),
      title: text(source.title, "title", 4, 180),
      introduction: text(source.introduction, "introduction", 20, 1_500),
      statement: text(source.statement, "statement", 5, 1_000),
      sections,
      cta: source.cta == null ? null : cta(source.cta),
    };
  }
  if (key === "FAQ") {
    const items = array(source.items, "questions", 1, 30).map((item, index) => {
      const row = object(item, `question ${index + 1}`);
      return {
        id: id(row.id, index),
        question: text(row.question, "question", 4, 240),
        answer: text(row.answer, "answer", 10, 2_000),
        category: text(row.category, "category", 2, 80),
        published: boolean(row.published, "question publication status"),
      };
    });
    return {
      kind: key,
      eyebrow: text(source.eyebrow, "small heading", 2, 100),
      title: text(source.title, "title", 4, 180),
      introduction: text(source.introduction, "introduction", 20, 1_500),
      items,
    };
  }

  const phones = array(source.phones, "phones", 1, 8).map((item) => {
    const value = text(item, "phone", 8, 20).replace(/[\s()-]/g, "");
    if (!phonePattern.test(value)) fail("Phone numbers must use international format.");
    return value;
  });
  const socialLinks = array(source.socialLinks, "social links", 0, 10).map((item, index) => {
    const row = object(item, `social link ${index + 1}`);
    return {
      id: id(row.id, index),
      platform: text(row.platform, "platform", 2, 40),
      url: externalUrl(row.url, "social link"),
    };
  });
  const whatsapp = object(source.whatsapp, "WhatsApp contact");
  const whatsappNumber = text(whatsapp.number, "WhatsApp number", 8, 20).replace(/[\s()-]/g, "");
  if (!phonePattern.test(whatsappNumber)) fail("WhatsApp number must use international format.");
  const email = text(source.email, "email", 5, 254).toLowerCase();
  if (!emailPattern.test(email)) fail("A valid contact email is required.");
  return {
    kind: "CONTACT",
    eyebrow: text(source.eyebrow, "small heading", 2, 100),
    title: text(source.title, "title", 4, 180),
    introduction: text(source.introduction, "introduction", 20, 1_500),
    phones,
    email,
    address: text(source.address, "address", 8, 500),
    workingHours: text(source.workingHours, "working hours", 3, 500),
    socialLinks,
    whatsapp: {
      number: whatsappNumber,
      message: text(whatsapp.message, "WhatsApp opener", 2, 500),
      visible: boolean(whatsapp.visible, "WhatsApp visibility"),
    },
  };
}

function cta(value: unknown): SiteContentCta {
  const source = object(value, "CTA");
  const destinationType = source.destinationType;
  if (!["INTERNAL", "EXTERNAL", "SECTION"].includes(String(destinationType))) {
    fail("CTA destination type is invalid.");
  }
  const href = text(source.href, "CTA link", 1, 500);
  if (destinationType === "INTERNAL" && (!href.startsWith("/") || href.startsWith("//"))) {
    fail("Internal CTA links must start with one slash.");
  }
  if (destinationType === "SECTION" && !/^#[A-Za-z][\w-]*$/.test(href)) {
    fail("Section CTA links must use a valid #section identifier.");
  }
  if (destinationType === "EXTERNAL") externalUrl(href, "CTA link");
  return { label: text(source.label, "CTA label", 2, 80), destinationType, href } as SiteContentCta;
}

function media(value: unknown) {
  const source = object(value, "media");
  if (!["IMAGE", "VIDEO", "THREE_D"].includes(String(source.type))) fail("Media type is invalid.");
  return {
    type: source.type as "IMAGE" | "VIDEO" | "THREE_D",
    url: internalOrExternalUrl(source.url, "media URL"),
    alt: text(source.alt, "media alternative text", 2, 180),
  };
}

function orderedItems(value: unknown, max: number): SiteContentOrderedItem[] {
  return array(value, "ordered items", 1, max).map((item, index) => {
    const row = object(item, `item ${index + 1}`);
    return {
      id: id(row.id, index),
      title: text(row.title, "item title", 2, 160),
      description: text(row.description, "item description", 10, 2_000),
      icon: text(row.icon, "item icon", 2, 50),
    };
  });
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} is required.`);
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    fail(`${label} must contain between ${min} and ${max} items.`);
  }
  return value;
}

function text(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") fail(`${label} is required.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) fail(`${label} has an invalid length.`);
  return normalized;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(`${label} must be true or false.`);
  return value;
}

function id(value: unknown, index: number) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value)
    ? value
    : `item-${index + 1}`;
}

function optionalUrl(value: unknown) {
  if (value == null || value === "") return null;
  return internalOrExternalUrl(value, "image URL");
}

function internalOrExternalUrl(value: unknown, label: string) {
  const url = text(value, label, 1, 1_000);
  return url.startsWith("/") && !url.startsWith("//") ? url : externalUrl(url, label);
}

function externalUrl(value: unknown, label: string) {
  const url = text(value, label, 8, 1_000);
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) fail(`${label} must use HTTP or HTTPS.`);
  } catch {
    fail(`${label} is invalid.`);
  }
  return url;
}

function fail(message: string): never {
  throw new BadRequestException(message);
}
