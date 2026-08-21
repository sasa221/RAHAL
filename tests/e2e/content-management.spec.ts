import { expect, test, type Browser, type TestInfo } from "@playwright/test";
import { storageStatePath } from "./fixture-data";

test.describe("typed content management", () => {
  test.skip(Boolean(process.env.RAHAL_E2E_BASE_URL), "Requires the isolated local E2E database.");

  test("edit and publish permissions stay separate", async ({ browser }, testInfo) => {
    const admin = await roleContext(browser, testInfo, "admin");
    const overview = await admin.request.get("/api/content/admin");
    expect(overview.status()).toBe(200);
    expect((await overview.json()).data.permissions).toEqual({ edit: true, publish: false });
    const denied = await admin.request.post("/api/content/admin/HOME_TRUST/publish", {
      data: { reason: "Administrator must not publish without the separate permission" },
    });
    expect(denied.status()).toBe(403);
    await admin.close();

    const superAdmin = await roleContext(browser, testInfo, "super-admin");
    const superOverview = await superAdmin.request.get("/api/content/admin");
    expect(superOverview.status()).toBe(200);
    expect((await superOverview.json()).data.permissions).toEqual({ edit: true, publish: true });
    await superAdmin.close();
  });

  test("a saved draft leaves the public snapshot unchanged until publication", async ({
    browser,
  }, testInfo) => {
    const context = await roleContext(browser, testInfo, "super-admin");
    const key = testInfo.project.name.startsWith("mobile") ? "HOME_PROCESS" : "HOME_TRUST";
    const marker = `E2E ${testInfo.project.name} published content`;
    const markerAr = `محتوى منشور ${testInfo.project.name}`;
    const before = await context.request.get("/api/content/public");
    expect(before.status()).toBe(200);
    const beforeEntry = findEntry(await before.json(), key);

    const save = await context.request.put(`/api/content/admin/${key}`, {
      data: {
        reason: "Verify typed draft and published snapshot separation",
        translations: [
          typedOrderedTranslation(key, "ar", markerAr),
          typedOrderedTranslation(key, "en", marker),
        ],
      },
    });
    expect(save.status()).toBe(200);
    const saved = (await save.json()).data;
    expect(saved.schemaVersion).toBe(2);
    expect(saved.translations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locale: "en",
          document: expect.objectContaining({ kind: key, title: marker }),
        }),
      ]),
    );

    const afterDraft = await context.request.get("/api/content/public");
    expect(afterDraft.status()).toBe(200);
    expect(findEntry(await afterDraft.json(), key)).toEqual(beforeEntry);

    const publish = await context.request.post(`/api/content/admin/${key}/publish`, {
      data: { reason: "Approve the bilingual E2E content for public verification" },
    });
    expect(publish.status()).toBe(201);
    expect((await publish.json()).data.publishedSchemaVersion).toBe(2);

    const page = await context.newPage();
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(marker, { exact: true })).toBeVisible();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(markerAr, { exact: true })).toBeVisible();
    await context.close();
  });

  for (const locale of ["ar", "en"] as const) {
    test(`${locale} content studio is usable in both viewports`, async ({ browser }, testInfo) => {
      const context = await roleContext(browser, testInfo, "super-admin");
      const page = await context.newPage();
      await page.goto(locale === "ar" ? "/admin/content" : "/en/admin/content", {
        waitUntil: "domcontentloaded",
      });
      await expect(page.locator(".content-studio__layout")).toBeVisible();
      await expect(page.locator(".content-studio__preview")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");

      if (locale === "en") {
        await page.getByRole("tab", { name: "English" }).click();
      }

      await page.getByRole("button", { name: locale === "ar" ? /الأسئلة الشائعة/ : /FAQ/ }).click();
      const add = page.getByRole("button", { name: locale === "ar" ? /إضافة عنصر/ : /Add item/ });
      const before = await page.locator(".content-studio__items article").count();
      await add.click();
      await expect(page.locator(".content-studio__items article")).toHaveCount(before + 1);
      await expect(
        page.getByRole("button", { name: locale === "ar" ? "حذف" : "Remove" }).last(),
      ).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      await context.close();
    });
  }
});

async function roleContext(browser: Browser, testInfo: TestInfo, role: "admin" | "super-admin") {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, role),
  });
  await context.addInitScript(() => {
    sessionStorage.setItem("rahal:push-consent-decision", "deferred");
    localStorage.setItem("rahal:marketing-consent-decision", "deferred");
  });
  return context;
}

function typedOrderedTranslation(
  kind: "HOME_PROCESS" | "HOME_TRUST",
  locale: "ar" | "en",
  title: string,
) {
  const common = {
    kind,
    eyebrow: locale === "ar" ? "رحال / تجربة واضحة" : "RAHAL / A CLEAR EXPERIENCE",
    title,
    description:
      locale === "ar"
        ? "خطوات واضحة تشرح للعميل دورة الطلب قبل زيارة فرع رحال."
        : "Clear steps explain the request lifecycle before visiting the Rahal branch.",
    items: [
      {
        id: "review",
        title: locale === "ar" ? "مراجعة الطلب" : "Request review",
        description:
          locale === "ar"
            ? "يراجع فريق المبيعات الطلب قبل التأكيد النهائي في الفرع."
            : "The sales team reviews every request before final branch confirmation.",
        icon: "shield",
      },
    ],
  };
  return {
    locale,
    document:
      kind === "HOME_PROCESS"
        ? {
            ...common,
            notice:
              locale === "ar"
                ? "إرسال الطلب لا يعني تأكيد الحجز."
                : "Submitting a request does not confirm a booking.",
          }
        : common,
  };
}

function findEntry(response: { data: { entries: Array<{ key: string }> } }, key: string) {
  return response.data.entries.find((entry) => entry.key === key) ?? null;
}
