import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { storageStatePath, type E2eRole } from "./fixture-data";

const phase = process.env.RAHAL_CONTRAST_PHASE === "before" ? "before" : "after";
const publicScreens = [
  { name: "home", path: "/" },
  { name: "cars", path: "/cars" },
  { name: "vehicle-detail", path: "/cars/silver-executive" },
  { name: "reservation", path: "/reservation?vehicle=silver-executive&driver=self" },
] as const;
const workspaceScreens: Array<{
  name: string;
  path: string;
  role: E2eRole;
  readySelector: string;
}> = [
  {
    name: "customer-dashboard",
    path: "/account/requests",
    role: "customer",
    readySelector: ".customer-request-card",
  },
  {
    name: "sales-dashboard",
    path: "/sales",
    role: "sales",
    readySelector: ".sales-request-card",
  },
  {
    name: "admin-dashboard",
    path: "/admin",
    role: "admin",
    readySelector: ".ops-metrics > a",
  },
];

test.describe("contrast visual audit", () => {
  test.skip(
    !process.env.RAHAL_CONTRAST_CAPTURE,
    "Run explicitly when before/after visual artifacts are requested.",
  );
  for (const screen of publicScreens) {
    test(`${screen.name} ${phase}`, async ({ page }, testInfo) => {
      await openStablePage(page, screen.path);
      await capture(page, testInfo, screen.name);
    });
  }

  for (const screen of workspaceScreens) {
    test(`${screen.name} ${phase}`, async ({ browser }, testInfo) => {
      const context = await roleContext(browser, testInfo, screen.role);
      const page = await context.newPage();
      await openAuthenticatedWorkspace(page, screen.path, screen.readySelector);
      await capture(page, testInfo, screen.name);
      await context.close();
    });
  }
});

async function roleContext(browser: Browser, testInfo: TestInfo, role: E2eRole) {
  return browser.newContext({ storageState: storageStatePath(testInfo.project.name, role) });
}

async function openStablePage(page: Page, path: string) {
  await page.addInitScript(() => {
    sessionStorage.setItem("rahal:push-consent-decision", "deferred");
  });
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBeLessThan(400);
  await page.locator("main").first().waitFor();
  if (path === "/cars") {
    await page.locator(".fleet-listing-card").first().waitFor({ timeout: 15_000 });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
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
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("main.workspace-loading")).toHaveCount(0);
  await expect(page.locator("main.workspace-access")).toHaveCount(0);
  await expect(
    page.locator(readySelector).first(),
    `Operational content did not finish loading on ${path}`,
  ).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const folder = resolve("artifacts", "contrast-audit", phase);
  await mkdir(folder, { recursive: true });
  await page.screenshot({
    animations: "disabled",
    path: resolve(folder, `${name}-${testInfo.project.name}-viewport.png`),
  });
  if (name === "cars") {
    const card = page.locator(".fleet-listing-card").first();
    await card.evaluate((node) => node.scrollIntoView({ behavior: "instant", block: "center" }));
    await page.waitForTimeout(120);
    await page.screenshot({
      animations: "disabled",
      path: resolve(folder, `${name}-${testInfo.project.name}-cards.png`),
    });
    await page.evaluate(() => window.scrollTo({ top: 0 }));
  }
  await page.evaluate(async () => {
    const distance = Math.max(500, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += distance) {
      window.scrollTo({ top: y });
      await new Promise((resolveScroll) => window.setTimeout(resolveScroll, 45));
    }
    window.scrollTo({ top: 0 });
  });
  await page.waitForTimeout(150);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: resolve(folder, `${name}-${testInfo.project.name}.png`),
  });
}
