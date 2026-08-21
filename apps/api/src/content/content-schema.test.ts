import { BadRequestException } from "@nestjs/common";
import type { SiteContentDocument, SiteContentKey } from "@rahal/contracts";
import { describe, expect, it } from "vitest";
import { parseSiteContentDocument } from "./content-schema";

const base = {
  eyebrow: "Rahal Egypt",
  title: "A considered journey with Rahal",
};

const documents: Record<SiteContentKey, SiteContentDocument> = {
  HOME_HERO: {
    kind: "HOME_HERO",
    ...base,
    description: "Choose a vehicle and send a request for review by the Rahal sales team.",
    badge: "Pickup and return take place at the Rahal branch.",
    primaryCta: { label: "Browse cars", destinationType: "INTERNAL", href: "/cars" },
    secondaryCta: { label: "See process", destinationType: "SECTION", href: "#process" },
    media: { type: "IMAGE", url: "/images/rahal-hero-gem-clean.png", alt: "Rahal car" },
    visible: true,
  },
  HOME_PROCESS: {
    kind: "HOME_PROCESS",
    ...base,
    description: "A clear request process from vehicle choice through branch confirmation.",
    notice: "A submitted request is not a confirmed booking.",
    items: [
      {
        id: "choose",
        title: "Choose",
        description: "Select dates and a suitable Rahal vehicle.",
        icon: "car",
      },
    ],
  },
  HOME_TRUST: {
    kind: "HOME_TRUST",
    ...base,
    description: "Clear standards protect every customer request and branch handover.",
    items: [
      {
        id: "review",
        title: "Sales review",
        description: "Every request is reviewed before branch confirmation.",
        icon: "shield",
      },
    ],
  },
  ABOUT: editorial("ABOUT"),
  HOW_IT_WORKS: editorial("HOW_IT_WORKS"),
  FAQ: {
    kind: "FAQ",
    ...base,
    introduction: "Answers to the most common questions before sending a rental request.",
    items: [
      {
        id: "confirmation",
        question: "Is my request confirmed?",
        answer: "No. A sales employee reviews it before branch confirmation.",
        category: "Requests",
        published: true,
      },
    ],
  },
  CONTACT: {
    kind: "CONTACT",
    ...base,
    introduction: "Contact the Rahal branch team for help with an existing request.",
    phones: ["+201001234567"],
    email: "contact@rahal.example",
    address: "Rahal branch, Cairo, Egypt",
    workingHours: "Saturday to Thursday, 9 AM to 9 PM",
    socialLinks: [{ id: "facebook", platform: "Facebook", url: "https://facebook.com/rahal" }],
    whatsapp: { number: "+201001234567", message: "Hello Rahal team", visible: true },
  },
};

describe("typed site content schemas", () => {
  for (const [key, document] of Object.entries(documents) as Array<
    [SiteContentKey, SiteContentDocument]
  >) {
    it(`accepts the independent ${key} schema`, () => {
      expect(parseSiteContentDocument(key, document)).toEqual(document);
    });
  }

  it("rejects a document from a different section", () => {
    expect(() => parseSiteContentDocument("FAQ", documents.HOME_HERO)).toThrow(BadRequestException);
  });

  it.each([
    ["INTERNAL", "https://example.com"],
    ["SECTION", "/cars"],
    ["EXTERNAL", "javascript:alert(1)"],
  ] as const)("validates %s CTA destinations", (destinationType, href) => {
    const hero = documents.HOME_HERO as Extract<SiteContentDocument, { kind: "HOME_HERO" }>;
    expect(() =>
      parseSiteContentDocument("HOME_HERO", {
        ...hero,
        primaryCta: { ...hero.primaryCta, destinationType, href },
      }),
    ).toThrow(BadRequestException);
  });
});

function editorial(kind: "ABOUT" | "HOW_IT_WORKS"): SiteContentDocument {
  return {
    kind,
    ...base,
    introduction: "Rahal is a bilingual rental platform built around a clear branch workflow.",
    statement: "Every request remains subject to sales review and branch confirmation.",
    sections: [
      {
        id: "branch",
        title: "At the branch",
        body: "Complete the deposit and signed documents at the Rahal branch.",
        imageUrl: null,
      },
    ],
    cta: { label: "Browse cars", destinationType: "INTERNAL", href: "/cars" },
  };
}
