import { expect, test } from "@playwright/test";
import { storageStatePath } from "./fixture-data";

test("profile validation, request locking and failure preserve the entered value", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "customer"),
  });
  const page = await context.newPage();
  let requests = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/account/profile", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    requests += 1;
    await held;
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.goto("/en/account/profile");

  const name = page.getByLabel("English name");
  const save = page.locator(".account-profile-form button[type=submit]");
  await name.fill("A");
  await save.click();
  expect(requests).toBe(0);

  await name.fill("Network Safe Customer");
  await save.dblclick();
  await expect(save).toBeDisabled();
  expect(requests).toBe(1);
  release();
  await expect(page.locator(".account-profile-notice.is-error")).toContainText(
    "The changes could not be saved",
  );
  await expect(name).toHaveValue("Network Safe Customer");
  await context.close();
});

test("administrator report export creates a real CSV download", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await page.goto("/en/admin/reports");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^rahal-operational-report-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(await download.createReadStream()).toBeTruthy();
  await context.close();
});

test("vehicle dialog owns focus, validates and closes with Escape", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
  });
  const page = await context.newPage();
  await page.goto("/en/admin/fleet");
  await page.getByRole("button", { name: "Add a new vehicle" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Prepare the new vehicle" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await dialog.getByRole("button", { name: "Save and publish vehicle" }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await context.close();
});

test("request and fleet filters change the actual result URL and can be cleared", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
  });
  const page = await context.newPage();
  await page.goto("/en/admin/requests?filter=NO_SHOW");
  const noResults = page.locator(".workspace-state--no-results");
  await expect(noResults).toBeVisible();
  await noResults.getByRole("button", { name: "Show all requests" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/requests$/);

  await page.goto("/en/admin/fleet?status=NOT_A_STATUS");
  await page
    .locator(".workspace-state--no-results")
    .getByRole("button", { name: "Show all vehicles" })
    .click();
  await expect(page).toHaveURL(/\/en\/admin\/fleet$/);
  await context.close();
});
