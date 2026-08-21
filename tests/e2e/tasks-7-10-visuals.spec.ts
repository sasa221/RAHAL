import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "@playwright/test";
import { storageStatePath, type E2eRole } from "./fixture-data";

const phase = process.env.RAHAL_SCREENSHOT_PHASE === "before" ? "before" : "after";
const screens: Array<{ role: E2eRole; name: string; path: string }> = [
  { role: "admin", name: "admin-dashboard", path: "/en/admin" },
  { role: "sales", name: "sales-operations", path: "/en/sales" },
  { role: "customer", name: "customer-requests", path: "/en/account/requests" },
];

for (const screen of screens) {
  test(`${screen.name} ${phase} visual`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      storageState: storageStatePath(testInfo.project.name, screen.role),
    });
    const page = await context.newPage();
    await page.goto(screen.path, { waitUntil: "domcontentloaded" });
    await page.locator("main").first().waitFor();
    await page.waitForTimeout(1_000);
    await page.evaluate(() => document.fonts.ready);
    const folder = resolve("artifacts", "task-7-10", phase);
    await mkdir(folder, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: false,
      path: resolve(folder, `${screen.name}-${testInfo.project.name}.png`),
    });
    await context.close();
  });
}
