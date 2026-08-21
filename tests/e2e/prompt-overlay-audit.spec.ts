import { expect, test, type Locator, type Page } from "@playwright/test";
import { createPrismaClient } from "@rahal/database";
import { fixtureIds, storageStatePath } from "./fixture-data";

const databaseUrl =
  process.env.RAHAL_E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://rahal:rahal_dev_password@127.0.0.1:5433/rahal?schema=public";

test.describe.configure({ mode: "serial" });

test("real marketing and push prompts stay inside the viewport without covering controls", async ({
  browser,
}, testInfo) => {
  const prisma = createPrismaClient(databaseUrl);
  const customerId = fixtureIds(testInfo.project.name).users.customer;
  await prisma.notificationPreference.upsert({
    where: { userId: customerId },
    create: { userId: customerId, marketingConsentDecidedAt: null },
    update: { marketingConsentDecidedAt: null },
  });
  await prisma.$disconnect();

  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "customer"),
  });
  const page = await context.newPage();
  await page.goto("/en/account/requests");
  const marketing = page.locator(".marketing-consent-card");
  await expect(marketing).toBeVisible();
  await expectInsideViewport(marketing, page);
  expect(await obstructedControls(page)).toEqual([]);
  await marketing.getByRole("button", { name: "No thanks" }).click();
  await expect(marketing).toBeHidden();
  await page.reload();
  const reminder = page.locator(".push-consent-reminder");
  await expect(reminder).toBeVisible();
  await expectInsideViewport(reminder, page);
  expect(await obstructedControls(page)).toEqual([]);
  await context.close();
});

test("notification dialog owns focus and closes with Escape", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "customer"),
  });
  const page = await context.newPage();
  await page.goto("/en/account/requests");
  const reminder = page.locator(".push-consent-reminder");
  await reminder.getByRole("button", { name: "Enable" }).click();
  const dialog = page.getByRole("dialog", { name: /notifications|phone first/i });
  await expect(dialog).toBeVisible();
  await expectInsideViewport(dialog, page);
  await expect(dialog.locator("button:focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await context.close();
});

async function expectInsideViewport(locator: Locator, page: Page) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

async function obstructedControls(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button, a, input, select, textarea")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && box.width && box.height;
      })
      .flatMap((element) => {
        const box = element.getBoundingClientRect();
        const bottomNavigation = document.querySelector<HTMLElement>(".portal-bottom-nav");
        const contentBottom = bottomNavigation?.getBoundingClientRect().top ?? innerHeight;
        if (box.top < 0 || box.left < 0 || box.bottom > contentBottom || box.right > innerWidth)
          return [];
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return top && (top === element || element.contains(top))
          ? []
          : [element.textContent?.trim()];
      }),
  );
}
