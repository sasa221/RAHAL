import { expect, test } from "@playwright/test";
import { storageStatePath } from "./fixture-data";

test("dashboard cards are keyboard reachable and activate their exact filter", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
  });
  const page = await context.newPage();
  await page.goto("/en/admin");
  const card = page.locator('[data-metric="OPEN_REQUESTS"]');
  await card.focus();
  await expect(card).toBeFocused();
  const outline = await card.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/admin\/requests\?filter=OPEN/);
  await context.close();
});

test("Arabic and English workspaces preserve direction and avoid horizontal overflow", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
  });
  const page = await context.newPage();
  for (const [path, direction] of [
    ["/admin", "rtl"],
    ["/en/admin", "ltr"],
  ] as const) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("dir", direction);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator(".portal-page-guide")).toBeVisible();
  }
  await context.close();
});
