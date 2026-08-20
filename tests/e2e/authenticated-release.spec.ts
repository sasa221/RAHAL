import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { storageStatePath, type E2eRole } from "./fixture-data";

type WorkspaceRole = Extract<E2eRole, "customer" | "sales" | "admin">;

const routes = [
  ...localizedRoutes("customer", ["/account/profile", "/account/requests", "/account/security"]),
  ...localizedRoutes("sales", ["/sales", "/sales/communications", "/fleet"]),
  ...localizedRoutes("admin", [
    "/admin",
    "/admin/audit",
    "/admin/branches",
    "/admin/communications",
    "/admin/content",
    "/admin/customers",
    "/admin/documents",
    "/admin/fleet",
    "/admin/policies",
    "/admin/reports",
    "/admin/reviews",
    "/admin/staff",
  ]),
] as const;

const visualCapturePaths = new Set([
  "/en/account/requests",
  "/en/sales",
  "/en/admin",
  "/en/admin/communications",
  "/en/admin/customers",
]);

test.describe("authenticated workspace release audit", () => {
  test.skip(Boolean(process.env.RAHAL_E2E_BASE_URL), "Requires isolated local E2E sessions.");

  for (const route of routes) {
    test(`${route.path} is release-safe for ${route.role}`, async ({ browser }, testInfo) => {
      const context = await roleContext(browser, testInfo, route.role);
      const page = await context.newPage();
      const runtime = observeRuntimeErrors(page);

      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(400);
      await page.waitForLoadState("load");
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main.workspace-access")).toHaveCount(0);
      await page.waitForTimeout(350);

      await expectAuthenticatedPage(page, route.locale);
      expect(runtime.errors, `browser runtime errors on ${route.path}`).toEqual([]);
      expect(runtime.failedResponses, `failed HTTP responses on ${route.path}`).toEqual([]);

      if (process.env.RAHAL_E2E_VISUAL_CAPTURE && visualCapturePaths.has(route.path)) {
        await captureViewport(page, testInfo, route.role, route.path);
      }
      await context.close();
    });
  }

  test("administrator vehicle studio opens immediately above the fleet", async ({
    browser,
  }, testInfo) => {
    const context = await roleContext(browser, testInfo, "admin");
    const page = await context.newPage();
    await page.addInitScript(() => {
      sessionStorage.setItem("rahal:push-consent-decision", "deferred");
    });
    await page.goto("/admin/fleet", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "إضافة عربية جديدة" }).first().click();

    const dialog = page.getByRole("dialog", { name: "جهّز العربية الجديدة" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("صور العربية", { exact: true }).first()).toBeVisible();
    await expect(dialog.getByText("اختار صور من جهازك", { exact: true })).toBeVisible();
    await expect(dialog.locator('input[type="file"]')).toHaveCount(1);
    await expect(dialog.getByText("البيانات الأساسية", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "حفظ ونشر العربية" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);

    if (process.env.RAHAL_E2E_VISUAL_CAPTURE) {
      const file = resolve(
        "test-results",
        "visual-audit",
        testInfo.project.name,
        "admin-fleet-editor.png",
      );
      await mkdir(dirname(file), { recursive: true });
      await page.screenshot({ path: file, animations: "disabled" });
    }
    await context.close();
  });

  test("administrator can confirm one campaign recipient by name or phone search", async ({
    browser,
  }, testInfo) => {
    const context = await roleContext(browser, testInfo, "admin");
    const page = await context.newPage();
    await page.addInitScript(() => {
      sessionStorage.setItem("rahal:push-consent-decision", "deferred");
    });
    await page.goto("/admin/communications", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "مستخدم محدد" }).click();

    const search = page.getByRole("combobox", {
      name: "ابحث بالاسم أو البريد أو رقم الهاتف",
    });
    await search.fill("E2E customer");
    await page.locator("#campaign-recipient-results").getByRole("option").first().click();

    await expect(page.getByText("تم تحديد المستلم", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "تغيير المستلم" })).toBeVisible();
    await expect(page.getByRole("button", { name: "إرسال الحملة" })).toBeEnabled();
    await context.close();
  });
});

function localizedRoutes(role: WorkspaceRole, paths: string[]) {
  return paths.flatMap((path) => [
    { role, path, locale: "ar" as const },
    { role, path: `/en${path}`, locale: "en" as const },
  ]);
}

async function roleContext(browser: Browser, testInfo: TestInfo, role: WorkspaceRole) {
  return browser.newContext({ storageState: storageStatePath(testInfo.project.name, role) });
}

function observeRuntimeErrors(page: Page) {
  const errors: string[] = [];
  const failedResponses: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return { errors, failedResponses };
}

async function expectAuthenticatedPage(page: Page, locale: "ar" | "en") {
  await expect(page.locator("html")).toHaveAttribute("lang", locale === "ar" ? "ar-EG" : "en-EG");
  await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page).toHaveTitle(/\S+/);

  const audit = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const visible = (element: Element) => {
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return (
        style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0
      );
    };
    const missingImageAlt = [...document.querySelectorAll("img")]
      .filter((image) => !image.hasAttribute("alt"))
      .map((image) => image.getAttribute("src") ?? "unknown");
    const unnamedButtons = [...document.querySelectorAll("button")]
      .filter((button) => visible(button))
      .filter(
        (button) =>
          !button.textContent?.trim() &&
          !button.getAttribute("aria-label") &&
          !button.getAttribute("aria-labelledby") &&
          !button.getAttribute("title"),
      )
      .map((button) => button.outerHTML.slice(0, 180));
    const unnamedFields = [...document.querySelectorAll("input, select, textarea")]
      .filter((field) => visible(field))
      .filter((field) => {
        const id = field.getAttribute("id");
        const labelled = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        return !(
          labelled ||
          field.closest("label") ||
          field.getAttribute("aria-label") ||
          field.getAttribute("aria-labelledby") ||
          field.getAttribute("title") ||
          field.getAttribute("placeholder")
        );
      })
      .map((field) => field.outerHTML.slice(0, 180));

    return {
      overflow: Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth,
      missingImageAlt,
      unnamedButtons,
      unnamedFields,
    };
  });

  expect(audit.overflow, "workspace must not scroll horizontally").toBeLessThanOrEqual(1);
  expect(audit.missingImageAlt, "every workspace image needs alt text").toEqual([]);
  expect(audit.unnamedButtons, "every visible workspace button needs a name").toEqual([]);
  expect(audit.unnamedFields, "every visible workspace field needs a name").toEqual([]);
}

async function captureViewport(
  page: Page,
  testInfo: TestInfo,
  role: WorkspaceRole,
  routePath: string,
) {
  const pushDialog = page.getByRole("dialog", { name: /Stay with your request/i });
  if (await pushDialog.isVisible().catch(() => false)) {
    await pushDialog.getByRole("button", { name: "Not now" }).click();
  }
  if (
    await page
      .locator(".marketing-consent-card")
      .isVisible()
      .catch(() => false)
  ) {
    await expect(page.locator(".push-consent-reminder")).toBeHidden();
  }
  await page.locator(".push-consent-reminder").evaluateAll((reminders) => {
    for (const reminder of reminders) reminder.style.display = "none";
  });
  await page.locator(".marketing-consent-card").evaluateAll((cards) => {
    for (const card of cards) card.style.display = "none";
  });

  const slug = routePath.replace(/^\/en\//, "").replaceAll("/", "-");
  const file = resolve(
    "test-results",
    "visual-audit",
    testInfo.project.name,
    `${role}-${slug}.png`,
  );
  await mkdir(dirname(file), { recursive: true });
  await page.screenshot({ path: file, animations: "disabled" });
}
