import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ContentService } from "./content.service";

const validTranslations = [
  {
    locale: "ar" as const,
    eyebrow: "رحال من البداية",
    title: "اختيار واضح لكل رحلة",
    introduction: "مقدمة عربية مكتملة تشرح تجربة رحال بوضوح للعميل قبل أن يبدأ الطلب.",
    statement: "إرسال الطلب لا يعني تأكيد الحجز.",
    items: [{ title: "الاختيار", body: "راجع السيارة والسعر التقديري قبل إرسال الطلب." }],
  },
  {
    locale: "en" as const,
    eyebrow: "RAHAL FROM THE START",
    title: "A clear choice for every journey",
    introduction:
      "A complete English introduction that explains the Rahal experience before a request begins.",
    statement: "Submitting a request never confirms a booking.",
    items: [{ title: "Choose", body: "Review the vehicle and estimate before submitting." }],
  },
];

function setup(role = "ADMIN") {
  const repository = {
    published: vi.fn().mockResolvedValue({ entries: [] }),
    overview: vi.fn().mockResolvedValue({ entries: [], supportedKeys: [] }),
    saveDraft: vi.fn().mockResolvedValue({ key: "ABOUT" }),
    findDraft: vi.fn().mockResolvedValue({ key: "ABOUT", translations: validTranslations }),
    publish: vi.fn().mockResolvedValue({ key: "ABOUT", status: "PUBLISHED" }),
  };
  const auth = {
    getSession: vi.fn().mockResolvedValue({ user: { id: "admin-1", role } }),
  };
  const access = {
    require: vi.fn().mockImplementation(() => {
      if (role === "SALES" || role === "CUSTOMER") throw new ForbiddenException();
    }),
    allows: vi.fn().mockResolvedValue(role === "SUPER_ADMIN"),
  };
  return {
    service: new ContentService(repository as never, auth as never, access as never),
    repository,
    access,
  };
}

describe("ContentService", () => {
  it("keeps public published content readable without a session", async () => {
    const { service, repository } = setup();
    await expect(service.published()).resolves.toEqual({ entries: [] });
    expect(repository.published).toHaveBeenCalledOnce();
  });

  it("reports edit and publish capabilities separately", async () => {
    const { service } = setup("ADMIN");
    await expect(service.overview("session")).resolves.toMatchObject({
      permissions: { edit: true, publish: false },
    });
  });

  it("rejects customers and sales from content management", async () => {
    const { service } = setup("SALES");
    await expect(service.overview("session")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires one Arabic and one English draft", async () => {
    const { service } = setup();
    await expect(
      service.saveDraft("session", "ABOUT", {
        reason: "Create the first approved draft",
        translations: [validTranslations[0], validTranslations[0]],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("blocks forbidden legacy geography and services", async () => {
    const { service } = setup();
    await expect(
      service.saveDraft("session", "ABOUT", {
        reason: "Unsafe copied content",
        translations: [
          validTranslations[0],
          { ...validTranslations[1], introduction: "A complete Dubai concierge description." },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("normalizes and saves a supported bilingual section", async () => {
    const { service, repository } = setup();
    await service.saveDraft("session", "ABOUT", {
      reason: "  Update the public about page  ",
      translations: validTranslations,
    });
    expect(repository.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        key: "ABOUT",
        reason: "Update the public about page",
      }),
    );
  });

  it("publishes only an existing complete draft", async () => {
    const { service, repository } = setup();
    await service.publish("session", "ABOUT", { reason: "Approved by Rahal management" });
    expect(repository.publish).toHaveBeenCalledWith({
      actorId: "admin-1",
      key: "ABOUT",
      reason: "Approved by Rahal management",
    });
  });

  it("checks a separate permission when publishing", async () => {
    const { service, access, repository } = setup();
    access.require.mockRejectedValueOnce(new ForbiddenException());
    await expect(
      service.publish("session", "ABOUT", { reason: "Approved by Rahal management" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(access.require).toHaveBeenCalledWith(expect.anything(), "content.publish");
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it("accepts a typed bilingual hero and rejects an unsafe CTA", async () => {
    const { service, repository } = setup();
    const document = {
      kind: "HOME_HERO" as const,
      eyebrow: "Rahal Egypt",
      title: "The right car for every journey",
      description: "Choose your dates and send a request for review by the Rahal sales team.",
      badge: "Pickup and return at the Rahal branch only.",
      primaryCta: { label: "Browse cars", destinationType: "INTERNAL" as const, href: "/cars" },
      secondaryCta: {
        label: "How it works",
        destinationType: "SECTION" as const,
        href: "#process",
      },
      media: { type: "IMAGE" as const, url: "/images/rahal-hero-gem-clean.png", alt: "Rahal car" },
      visible: true,
    };
    await service.saveDraft("session", "HOME_HERO", {
      reason: "Create the typed home hero",
      translations: [
        {
          locale: "ar",
          document: { ...document, eyebrow: "رحال مصر", title: "السيارة المناسبة لكل رحلة" },
        },
        { locale: "en", document },
      ],
    });
    expect(repository.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: expect.arrayContaining([
          expect.objectContaining({
            schemaVersion: 2,
            document: expect.objectContaining({ kind: "HOME_HERO" }),
          }),
        ]),
      }),
    );

    await expect(
      service.saveDraft("session", "HOME_HERO", {
        reason: "Reject unsafe link",
        translations: [
          {
            locale: "ar",
            document: {
              ...document,
              primaryCta: { ...document.primaryCta, href: "javascript:alert(1)" },
            },
          },
          { locale: "en", document },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
