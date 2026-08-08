import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  { path: "/", lang: "ar-EG", dir: "rtl" },
  { path: "/en", lang: "en-EG", dir: "ltr" },
  { path: "/cars", lang: "ar-EG", dir: "rtl" },
  { path: "/en/cars", lang: "en-EG", dir: "ltr" },
  { path: "/about", lang: "ar-EG", dir: "rtl" },
  { path: "/en/about", lang: "en-EG", dir: "ltr" },
  { path: "/how-it-works", lang: "ar-EG", dir: "rtl" },
  { path: "/en/how-it-works", lang: "en-EG", dir: "ltr" },
  { path: "/faq", lang: "ar-EG", dir: "rtl" },
  { path: "/en/faq", lang: "en-EG", dir: "ltr" },
  { path: "/contact", lang: "ar-EG", dir: "rtl" },
  { path: "/en/contact", lang: "en-EG", dir: "ltr" },
  { path: "/terms", lang: "ar-EG", dir: "rtl" },
  { path: "/en/terms", lang: "en-EG", dir: "ltr" },
  { path: "/privacy", lang: "ar-EG", dir: "rtl" },
  { path: "/en/privacy", lang: "en-EG", dir: "ltr" },
  { path: "/cancellation", lang: "ar-EG", dir: "rtl" },
  { path: "/en/cancellation", lang: "en-EG", dir: "ltr" },
  { path: "/auth", lang: "ar-EG", dir: "rtl" },
  { path: "/en/auth", lang: "en-EG", dir: "ltr" },
] as const;

const protectedRoutes = [
  "/account/profile",
  "/account/requests",
  "/account/security",
  "/sales",
  "/admin",
  "/en/account/profile",
  "/en/account/requests",
  "/en/account/security",
  "/en/sales",
  "/en/admin",
] as const;

const forbiddenCopy = ["aed", "dubai", "airport pickup", "pay online", "rahal elite"] as const;

function observeRuntimeErrors(page: Page) {
  const errors: string[] = [];
  const failedResponses: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !/^Failed to load resource: the server responded with a status of 401/.test(message.text())
    ) {
      errors.push(message.text());
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && response.status() !== 401) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return { errors, failedResponses };
}

async function expectReleaseSafePage(page: Page, lang: "ar-EG" | "en-EG", dir: "rtl" | "ltr") {
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
  await expect(page.locator("html")).toHaveAttribute("dir", dir);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page).toHaveTitle(/\S+/);

  const audit = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const missingImageAlt = [...document.querySelectorAll("img")]
      .filter((image) => !image.hasAttribute("alt"))
      .map((image) => image.getAttribute("src") ?? "unknown");
    const unnamedButtons = [...document.querySelectorAll("button")]
      .filter((button) => {
        const style = window.getComputedStyle(button);
        if (style.display === "none" || style.visibility === "hidden") return false;
        return !(
          button.textContent?.trim() ||
          button.getAttribute("aria-label") ||
          button.getAttribute("aria-labelledby") ||
          button.getAttribute("title")
        );
      })
      .map((button) => button.outerHTML.slice(0, 160));

    return {
      overflow: Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth,
      missingImageAlt,
      unnamedButtons,
      bodyText: body.innerText.toLowerCase(),
    };
  });

  expect(audit.overflow, "page must not scroll horizontally").toBeLessThanOrEqual(1);
  expect(audit.missingImageAlt, "every image needs an alt attribute").toEqual([]);
  expect(audit.unnamedButtons, "every visible button needs an accessible name").toEqual([]);
  for (const phrase of forbiddenCopy) expect(audit.bodyText).not.toContain(phrase);
}

for (const route of publicRoutes) {
  test(`${route.path} is release-safe`, async ({ page }) => {
    const runtime = observeRuntimeErrors(page);
    const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState("load");
    await expectReleaseSafePage(page, route.lang, route.dir);
    expect(runtime.errors, `browser runtime errors on ${route.path}`).toEqual([]);
    expect(runtime.failedResponses, `failed HTTP responses on ${route.path}`).toEqual([]);
  });
}

test("mobile navigation opens, exposes links, and closes", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile-only interaction");
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  const menu = page.locator(".mobile-menu > summary");
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.locator(".mobile-menu nav a").first()).toBeVisible();
  await menu.click();
  await expect(page.locator(".mobile-menu nav a").first()).not.toBeVisible();
});

for (const path of protectedRoutes) {
  test(`${path} rejects an anonymous browser`, async ({ page }) => {
    const runtime = observeRuntimeErrors(page);
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(400);
    await expect(
      page.locator("main.workspace-access, main.account-security-standalone"),
    ).toBeVisible();
    await expect(page.locator('a[href$="/auth"]')).toBeVisible();
    expect(runtime.errors, `browser runtime errors on ${path}`).toEqual([]);
    expect(runtime.failedResponses, `failed HTTP responses on ${path}`).toEqual([]);
  });
}

test("reduced-motion users do not receive long-running decorative motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  const longAnimations = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => {
        const timing = animation.effect?.getComputedTiming();
        return timing && (timing.iterations === Infinity || Number(timing.duration) > 500);
      })
      .map((animation) => {
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.target as HTMLElement | null;
        const timing = effect?.getComputedTiming();
        return {
          target: target
            ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ""}.${[
                ...target.classList,
              ].join(".")}`
            : "unknown",
          duration: Number(timing?.duration ?? 0),
          iterations: timing?.iterations ?? 0,
        };
      }),
  );
  expect(longAnimations).toEqual([]);
});
