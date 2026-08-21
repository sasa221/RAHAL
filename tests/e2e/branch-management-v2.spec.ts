import { expect, test, type Browser, type TestInfo } from "@playwright/test";
import { storageStatePath } from "./fixture-data";

test.describe("structured branch management", () => {
  test.skip(Boolean(process.env.RAHAL_E2E_BASE_URL), "Requires isolated local E2E data.");

  test("server permissions separate viewing, creation, disabling, and deletion", async ({
    browser,
  }, testInfo) => {
    const sales = await roleContext(browser, testInfo, "sales");
    expect((await sales.request.get("/api/branches/admin")).status()).toBe(403);
    await sales.close();
    const admin = await roleContext(browser, testInfo, "admin");
    const adminOverview = await admin.request.get("/api/branches/admin");
    expect(adminOverview.status()).toBe(200);
    expect((await adminOverview.json()).data.permissions).toEqual({
      view: true,
      edit: true,
      create: true,
      disable: true,
      delete: false,
    });
    await admin.close();
    const superAdmin = await roleContext(browser, testInfo, "super-admin");
    const superOverview = await superAdmin.request.get("/api/branches/admin");
    const superData = (await superOverview.json()).data;
    expect(superData.permissions.delete).toBe(true);
    const linked = superData.branches.find(
      (branch: { dependencyCounts: { vehicles: number } }) => branch.dependencyCounts.vehicles > 0,
    );
    expect(linked).toBeTruthy();
    const deniedDelete = await superAdmin.request.delete(`/api/branches/admin/${linked.id}`, {
      data: { reason: "Verify linked branch protection" },
    });
    expect(deniedDelete.status()).toBe(409);
    expect(JSON.stringify(await deniedDelete.json())).toContain("Disable it instead");
    await superAdmin.close();
  });

  test("an active branch appears publicly with the exact manual wa.me link", async ({
    browser,
  }, testInfo) => {
    const context = await roleContext(browser, testInfo, "super-admin");
    const suffix = testInfo.project.name.startsWith("mobile") ? "mobile" : "desktop";
    const nameEn = `E2E Published Branch ${suffix}`;
    const whatsappNumber = suffix === "mobile" ? "+201099990001" : "+201099990002";
    const message = `Hello from ${suffix} Rahal branch`;
    const create = await context.request.post("/api/branches/admin", {
      data: branchPayload(nameEn, whatsappNumber, message),
    });
    expect(create.status()).toBe(201);
    const branch = (await create.json()).data;
    expect(branch.status).toBe("ACTIVE");
    const publicResponse = await context.request.get("/api/branches");
    expect(publicResponse.status()).toBe(200);
    expect((await publicResponse.json()).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: branch.id, nameEn, whatsappNumber })]),
    );
    const page = await context.newPage();
    await page.goto("/en/contact", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(nameEn, { exact: true }).first()).toBeVisible();
    const expected = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    await expect(page.locator(`a[href="${expected}"]`).first()).toBeVisible();
    await context.close();
  });

  for (const locale of ["ar", "en"] as const)
    test(`${locale} editor map and structured controls work`, async ({ browser }, testInfo) => {
      const context = await roleContext(browser, testInfo, "admin");
      const page = await context.newPage();
      await page.goto(locale === "ar" ? "/admin/branches" : "/en/admin/branches", {
        waitUntil: "domcontentloaded",
      });
      await page
        .getByRole("button", { name: locale === "ar" ? /إضافة فرع جديد/ : /Add new branch/ })
        .click();
      const dialog = page.getByRole("dialog", {
        name: locale === "ar" ? "إنشاء فرع" : "Create branch",
      });
      await expect(dialog).toBeVisible();
      const map = dialog.getByRole("application", {
        name: locale === "ar" ? "خريطة اختيار موقع الفرع" : "Branch location map",
      });
      await map.click({ position: { x: 190, y: 120 } });
      await expect(map.locator(".branch-map-picker__marker")).toBeVisible();
      await dialog
        .getByText(
          locale === "ar" ? "الإحداثيات — خيارات متقدمة" : "Coordinates — advanced options",
        )
        .click();
      await expect(dialog.getByLabel("Latitude")).not.toHaveValue("");
      await expect(dialog.getByLabel("Longitude")).not.toHaveValue("");
      await expect(
        dialog.getByText(locale === "ar" ? "ساعات العمل الأسبوعية" : "Weekly working hours"),
      ).toBeVisible();
      await expect(
        dialog.getByText(locale === "ar" ? "الإجازات والاستثناءات" : "Holidays and exceptions"),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await context.close();
    });
});

async function roleContext(
  browser: Browser,
  testInfo: TestInfo,
  role: "sales" | "admin" | "super-admin",
) {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, role),
  });
  await context.addInitScript(() => {
    sessionStorage.setItem("rahal:push-consent-decision", "deferred");
    localStorage.setItem("rahal:marketing-consent-decision", "deferred");
  });
  return context;
}

function branchPayload(nameEn: string, whatsappNumber: string, message: string) {
  const days = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  return {
    nameAr: `فرع رحال ${nameEn.split(" ").at(-1)}`,
    nameEn,
    governorateAr: "القاهرة",
    governorateEn: "Cairo",
    areaAr: "وسط البلد",
    areaEn: "Downtown",
    streetAr: "شارع رحال",
    streetEn: "Rahal Street",
    landmarkAr: "بجوار المتحف",
    landmarkEn: "Beside the museum",
    addressAr: "شارع رحال، وسط البلد، القاهرة، مصر",
    addressEn: "Rahal Street, Downtown, Cairo, Egypt",
    latitude: 30.0444,
    longitude: 31.2357,
    phones: [whatsappNumber],
    whatsappNumber,
    whatsappVisible: true,
    whatsappMessageAr: "مرحبًا بفريق رحال",
    whatsappMessageEn: message,
    email: `branch-${nameEn.endsWith("mobile") ? "mobile" : "desktop"}@example.test`,
    socialLinks: [{ id: "facebook", platform: "Facebook", url: "https://facebook.com/rahal" }],
    workingHours: {
      timezone: "Africa/Cairo",
      weekly: days.map((day) => ({
        day,
        closed: day === "FRIDAY",
        opensAt: day === "FRIDAY" ? null : "09:00",
        closesAt: day === "FRIDAY" ? null : "21:00",
      })),
      exceptions: [],
    },
    services: ["BRANCH_PICKUP", "BRANCH_RETURN"],
    status: "ACTIVE",
  };
}
