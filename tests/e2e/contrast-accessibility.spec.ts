import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { storageStatePath, type E2eRole } from "./fixture-data";

const lightSurfaceChecks = [
  {
    path: "/cars",
    selectors: [
      ".fleet-filter-panel .field > span",
      ".fleet-filter-panel select",
      ".fleet-listing-card__heading h2",
      ".fleet-listing-card__rate strong",
      ".fleet-listing-card__specs",
      ".fleet-listing-card__footer strong",
      ".fleet-listing-card__footer small",
    ],
  },
  {
    path: "/en/cars",
    selectors: [
      ".fleet-filter-panel .field > span",
      ".fleet-filter-panel select",
      ".fleet-listing-card__heading h2",
      ".fleet-listing-card__rate strong",
      ".fleet-listing-card__specs",
      ".fleet-listing-card__footer strong",
      ".fleet-listing-card__footer small",
    ],
  },
  { path: "/reservation?vehicle=silver-executive&driver=self", selectors: ["input", "select"] },
  {
    path: "/en/reservation?vehicle=silver-executive&driver=self",
    selectors: ["input", "select"],
  },
] as const;

const workspaceChecks: Array<{ path: string; role: E2eRole; readySelector: string }> = [
  { path: "/account/requests", role: "customer", readySelector: ".customer-request-card" },
  { path: "/sales", role: "sales", readySelector: ".sales-layout" },
  { path: "/admin", role: "admin", readySelector: ".ops-metrics > a" },
  { path: "/en/account/requests", role: "customer", readySelector: ".customer-request-card" },
  { path: "/en/sales", role: "sales", readySelector: ".sales-layout" },
  { path: "/en/admin", role: "admin", readySelector: ".ops-metrics > a" },
];

test.describe("WCAG contrast contract", () => {
  for (const entry of lightSurfaceChecks) {
    test(`${entry.path} essential text and controls meet contrast`, async ({ page }) => {
      await open(page, entry.path);
      if (entry.path.endsWith("/cars")) {
        await page.locator(".fleet-listing-card").first().waitFor();
      }
      await expectContrast(page, [...entry.selectors]);
    });
  }

  for (const entry of workspaceChecks) {
    test(`${entry.role} controls meet contrast on ${entry.path}`, async ({ browser }, testInfo) => {
      const context = await roleContext(browser, testInfo, entry.role);
      const page = await context.newPage();
      await openAuthenticatedWorkspace(page, entry.path, entry.readySelector);
      await expectContrast(page, ["input", "select", "textarea"]);
      await context.close();
    });
  }

  test("image-led screens retain protective overlays", async ({ page }) => {
    for (const entry of [
      { path: "/", selector: ".hero__overlay" },
      { path: "/cars/silver-executive", selector: ".vehicle-cinematic__overlay" },
      {
        path: "/reservation?vehicle=silver-executive&driver=self",
        selector: ".reservation-stage__overlay",
      },
    ]) {
      await open(page, entry.path);
      const overlay = page.locator(entry.selector);
      await expect(overlay).toBeVisible();
      await expect
        .poll(() => overlay.evaluate((node) => getComputedStyle(node).backgroundImage))
        .toContain("linear-gradient");
    }
  });

  for (const entry of [
    {
      path: "/account/requests",
      role: "customer" as const,
      hero: ".customer-requests-hero",
      readySelector: ".customer-request-card",
      requiredSelectors: [
        ".customer-requests-hero .portal-primary-action",
        ".portal-metrics article:nth-child(1)",
        ".portal-metrics article:nth-child(2)",
        ".portal-metrics article:nth-child(3)",
        ".portal-metrics article:nth-child(4)",
      ],
    },
    {
      path: "/sales",
      role: "sales" as const,
      hero: ".sales-hero",
      readySelector: ".sales-request-card",
      requiredSelectors: [".sales-request-card"],
    },
    {
      path: "/admin",
      role: "admin" as const,
      hero: ".ops-hero",
      readySelector: ".ops-metrics > a",
      requiredSelectors: [".ops-metrics > a:nth-child(1)", ".ops-metrics > a:nth-child(2)"],
    },
  ]) {
    test(`${entry.role} mobile workspace reveals operational data above the fold`, async ({
      browser,
    }, testInfo) => {
      test.skip(!testInfo.project.name.includes("mobile"), "Mobile density contract.");
      const context = await roleContext(browser, testInfo, entry.role);
      const page = await context.newPage();
      await openAuthenticatedWorkspace(page, entry.path, entry.readySelector);

      const hero = page.locator(entry.hero).first();
      const title = hero.locator("h1");
      for (const selector of entry.requiredSelectors) {
        await expect(page.locator(selector).first()).toBeVisible();
      }

      const measurements = await page.evaluate(
        ({ heroSelector, requiredSelectors }) => {
          const heroNode = document.querySelector(heroSelector)!;
          const titleNode = heroNode.querySelector("h1")!;
          const headerBottom =
            document.querySelector(".portal-topbar")?.getBoundingClientRect().bottom ?? 0;
          const contentBottom =
            document.querySelector(".portal-bottom-nav")?.getBoundingClientRect().top ??
            window.innerHeight;
          const titleStyle = getComputedStyle(titleNode);
          const lineHeight = Number.parseFloat(titleStyle.lineHeight);
          return {
            heroHeight: heroNode.getBoundingClientRect().height,
            titleLines: titleNode.getBoundingClientRect().height / lineHeight,
            scrollY: window.scrollY,
            required: requiredSelectors.map((selector) => {
              const rect = document.querySelector(selector)!.getBoundingClientRect();
              return {
                selector,
                top: rect.top,
                bottom: rect.bottom,
                visibleHeight: Math.max(0, Math.min(rect.bottom, contentBottom) - rect.top),
              };
            }),
            headerBottom,
            contentBottom,
          };
        },
        { heroSelector: entry.hero, requiredSelectors: entry.requiredSelectors },
      );

      expect(measurements.scrollY).toBe(0);
      expect(measurements.heroHeight).toBeLessThanOrEqual(entry.role === "admin" ? 70 : 115);
      expect(measurements.titleLines).toBeLessThanOrEqual(2.1);
      for (const item of measurements.required) {
        expect(item.top, `${item.selector} starts behind the header`).toBeGreaterThanOrEqual(
          measurements.headerBottom,
        );
        if (entry.role === "sales") {
          expect(
            item.visibleHeight,
            `${item.selector} does not reveal enough real request content`,
          ).toBeGreaterThanOrEqual(110);
        } else {
          expect(
            item.bottom,
            `${item.selector} is not fully above the bottom navigation`,
          ).toBeLessThanOrEqual(measurements.contentBottom);
        }
      }
      await expect(title).toBeVisible();
      await context.close();
    });
  }
});

async function roleContext(browser: Browser, testInfo: TestInfo, role: E2eRole) {
  return browser.newContext({ storageState: storageStatePath(testInfo.project.name, role) });
}

async function open(page: Page, path: string) {
  await page.addInitScript(() => {
    sessionStorage.setItem("rahal:push-consent-decision", "deferred");
  });
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);
  await page.locator("main").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function openAuthenticatedWorkspace(page: Page, path: string, readySelector: string) {
  await page.addInitScript(() => {
    sessionStorage.setItem("rahal:push-consent-decision", "deferred");
  });
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);

  await expect(
    page.locator(".portal-shell"),
    `Authenticated workspace did not replace the access loader on ${path}`,
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main.workspace-loading")).toHaveCount(0);
  await expect(page.locator("main.workspace-access")).toHaveCount(0);
  await expect(
    page.locator(readySelector).first(),
    `Operational content did not finish loading on ${path}`,
  ).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
}

async function expectContrast(page: Page, selectors: string[]) {
  const failures = await page.evaluate((requestedSelectors) => {
    type Rgb = [number, number, number];
    const parse = (value: string): Rgb | null => {
      const parts = value.match(/[\d.]+/g)?.map(Number);
      if (!parts || parts.length < 3 || (parts.length > 3 && parts[3] === 0)) return null;
      return [parts[0]!, parts[1]!, parts[2]!];
    };
    const luminance = ([r, g, b]: Rgb) => {
      const channel = (part: number) => {
        const value = part / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const ratio = (foreground: Rgb, background: Rgb) => {
      const first = luminance(foreground);
      const second = luminance(background);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    };
    const backgroundFor = (element: Element): Rgb => {
      let current: Element | null = element;
      while (current) {
        const color = parse(getComputedStyle(current).backgroundColor);
        if (color) return color;
        current = current.parentElement;
      }
      return [255, 255, 255];
    };
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    return requestedSelectors.flatMap((selector) =>
      [...document.querySelectorAll(selector)]
        .filter(visible)
        .filter((element) => !(element instanceof HTMLInputElement && element.type === "hidden"))
        .filter((element) => !(element as HTMLInputElement | HTMLSelectElement).disabled)
        .flatMap((element) => {
          const style = getComputedStyle(element);
          const foreground = parse(style.color);
          if (!foreground) return [`${selector}: color could not be parsed`];
          const measured = ratio(foreground, backgroundFor(element));
          const fontSize = Number.parseFloat(style.fontSize);
          const fontWeight = Number.parseInt(style.fontWeight, 10) || 400;
          const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
          const required = large ? 3 : 4.5;
          return measured + 0.01 < required
            ? [`${selector}: ${measured.toFixed(2)}:1 (requires ${required}:1)`]
            : [];
        }),
    );
  }, selectors);

  expect(failures, "essential text/control contrast failures").toEqual([]);
}
