import { expect, test } from "@playwright/test";
import { storageStatePath } from "./fixture-data";

test("dashboard exposes loading and recoverable error states", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  let releaseOverview!: () => void;
  const overviewHeld = new Promise<void>((resolve) => {
    releaseOverview = resolve;
  });
  await page.route("**/api/admin-operations/overview*", async (route) => {
    await overviewHeld;
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.goto("/en/admin", { waitUntil: "commit" });
  await expect(page.locator(".workspace-state--loading")).toBeVisible();
  releaseOverview();
  await expect(page.locator(".workspace-state--error")).toBeVisible();
  await expect(page.locator(".workspace-state--error").getByRole("button")).toHaveText("Try again");
  await context.close();
});

test("request filters distinguish no results from an empty queue", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
  });
  const page = await context.newPage();
  await page.goto("/en/admin/requests?filter=NO_SHOW");
  const state = page.locator(".workspace-state--no-results");
  await expect(state).toBeVisible();
  await state.getByRole("button", { name: "Show all requests" }).click();
  await expect(page.locator(".sales-request-card").first()).toBeVisible();
  await context.close();
});

test("fleet invalid status has a clear-filter action", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
  });
  const page = await context.newPage();
  await page.goto("/en/admin/fleet?status=NOT_A_STATUS");
  const state = page.locator(".workspace-state--no-results");
  await expect(state).toBeVisible();
  await state.getByRole("button", { name: "Show all vehicles" }).click();
  await expect(state).toBeHidden();
  await expect(page.locator(".fleet-calendar-row")).not.toHaveCount(0);
  await context.close();
});

test("no-permission screen gives a safe route back", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "customer"),
  });
  const page = await context.newPage();
  await page.goto("/en/admin");
  await expect(page.locator("main.workspace-access")).toBeVisible();
  await expect(page.locator("main.workspace-access").getByRole("link").first()).toBeVisible();
  await context.close();
});
