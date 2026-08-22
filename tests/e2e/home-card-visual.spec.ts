import { expect, test } from "@playwright/test";

const homeLocales = [
  {
    name: "arabic",
    path: "/?home-card-evidence=1",
    requiredNames: ["سيدان تنفيذية فضية", "مدمجة للمدينة"],
  },
  {
    name: "english",
    path: "/en?home-card-evidence=1",
    requiredNames: ["Silver Executive Sedan", "City Compact"],
  },
] as const;

for (const locale of homeLocales) {
  test(`Home vehicle cards are rendered and readable (${locale.name})`, async ({
    page,
  }, testInfo) => {
    // The public shell keeps live notification requests open, so networkidle is
    // not a valid readiness signal. We assert the rendered cards below instead.
    await page.goto(locale.path, { waitUntil: "domcontentloaded" });

    const showcase = page.locator(".fleet-showcase");
    const supporting = showcase.locator(".fleet-showcase__supporting");
    const cards = showcase.locator(".vehicle-card--compact");
    await expect(showcase).toBeAttached();
    await expect(supporting).toBeAttached();
    await expect.poll(() => cards.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    await supporting.evaluate((element) =>
      element.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    // Leave room for the fixed public header so card headings are not covered.
    await page.evaluate(() => window.scrollBy(0, -96));

    await expect
      .poll(
        async () =>
          cards.evaluateAll((elements) =>
            elements.every((element) => {
              const rect = element.getBoundingClientRect();
              const style = window.getComputedStyle(element);
              const images = Array.from(element.querySelectorAll("img"));
              return (
                Number(style.opacity) === 1 &&
                rect.width > 0 &&
                rect.height > 0 &&
                images.length > 0 &&
                images.every((image) => image.complete && image.naturalWidth > 0)
              );
            }),
          ),
        { timeout: 15_000 },
      )
      .toBe(true);

    const cardText = await cards.allInnerTexts();
    const renderedText = cardText.join(" ");
    for (const requiredName of locale.requiredNames) expect(renderedText).toContain(requiredName);
    expect(renderedText).toMatch(/Automatic|أوتوماتيك/);
    expect(renderedText).toMatch(/5 seats|5 مقاعد/);
    expect(renderedText).toMatch(/EGP|ج\.م/);
    expect(renderedText).toMatch(/View details|عرض التفاصيل/);
    expect(renderedText).not.toMatch(/bags?|شنط|حقائب/i);

    // Keep the artifact focused on the cards rather than fixed shell overlays.
    await page.addStyleTag({
      content: `
        .site-header,
        .skip-link,
        .notification-trigger,
        .notification-drawer,
        .push-consent-layer,
        .workspace-install-layer { visibility: hidden !important; }
      `,
    });
    await supporting.screenshot({
      path: testInfo.outputPath(`home-cards-${locale.name}-${testInfo.project.name}.png`),
      animations: "disabled",
    });
  });
}
