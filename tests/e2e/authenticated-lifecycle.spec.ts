import { expect, test, type Browser, type BrowserContext, type TestInfo } from "@playwright/test";
import { fixtureIds, storageStatePath, type E2eRole } from "./fixture-data";

test.describe("authenticated reservation lifecycle", () => {
  test.skip(Boolean(process.env.RAHAL_E2E_BASE_URL), "Requires isolated local E2E fixtures.");
  test.describe.configure({ mode: "serial" });

  test("customer sees the submitted request and cannot enter staff areas", async ({
    browser,
  }, testInfo) => {
    const ids = fixtureIds(testInfo.project.name);
    const context = await roleContext(browser, testInfo, "customer");
    const page = await context.newPage();

    await page.goto("/en/account/requests");
    await expect(page.getByText(ids.reference).first()).toBeVisible();

    const forbiddenApi = await page.request.get("/api/reservations/sales/queue?locale=en");
    expect(forbiddenApi.status()).toBe(403);

    await page.goto("/en/sales");
    await expect(
      page.getByRole("heading", { name: "This workspace is not assigned to your account" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to your workspace" })).toHaveAttribute(
      "href",
      "/en/account/requests",
    );
    await page.goto("/en/admin");
    await expect(pageHeading(page)).toContainText("This workspace is not assigned to your account");
    await context.close();
  });

  test("one sales employee claims the request and the second employee is locked out", async ({
    browser,
  }, testInfo) => {
    const ids = fixtureIds(testInfo.project.name);
    const owner = await roleContext(browser, testInfo, "sales");
    const ownerPage = await owner.newPage();
    await ownerPage.goto("/en/sales");
    await expect(ownerPage.getByText(ids.reference).first()).toBeVisible();

    const claim = await ownerPage.request.post(
      `/api/reservations/sales/${ids.reservationId}/claim?locale=en`,
    );
    expect([200, 201]).toContain(claim.status());
    expect((await claim.json()).data.status).toBe("UNDER_REVIEW");

    const rival = await roleContext(browser, testInfo, "rival-sales");
    const rivalPage = await rival.newPage();
    const rivalReview = await rivalPage.request.get(
      `/api/reservations/sales/${ids.reservationId}?locale=en`,
    );
    expect(rivalReview.status()).toBe(403);

    await ownerPage.goto("/en/admin");
    await expect(pageHeading(ownerPage)).toContainText(
      "This workspace is not assigned to your account",
    );
    await expect(ownerPage.getByRole("link", { name: "Return to your workspace" })).toHaveAttribute(
      "href",
      "/en/sales",
    );

    await owner.close();
    await rival.close();
  });

  test("sales requests information and the customer sends a secure reply", async ({
    browser,
  }, testInfo) => {
    const ids = fixtureIds(testInfo.project.name);
    const sales = await roleContext(browser, testInfo, "sales");
    const salesPage = await sales.newPage();
    const decision = await salesPage.request.post(
      `/api/reservations/sales/${ids.reservationId}/decision`,
      {
        data: {
          action: "REQUEST_INFORMATION",
          note: "Please confirm the preferred branch arrival time.",
        },
      },
    );
    expect([200, 201]).toContain(decision.status());
    expect((await decision.json()).data.status).toBe("MORE_INFORMATION_REQUIRED");
    await sales.close();

    const customer = await roleContext(browser, testInfo, "customer");
    const customerPage = await customer.newPage();
    const detail = await customerPage.request.get(
      `/api/reservations/customer/requests/${ids.reservationId}?locale=en`,
    );
    expect(detail.status()).toBe(200);
    expect((await detail.json()).data.status).toBe("MORE_INFORMATION_REQUIRED");

    const response = await customerPage.request.post(
      `/api/reservations/customer/requests/${ids.reservationId}/respond`,
      { data: { message: "I can attend the Rahal branch at 10:30 AM." } },
    );
    expect([200, 201]).toContain(response.status());
    expect((await response.json()).data.status).toBe("UNDER_REVIEW");
    await customer.close();
  });

  test("assigned sales pre-approves and admin retains oversight", async ({ browser }, testInfo) => {
    const ids = fixtureIds(testInfo.project.name);
    const sales = await roleContext(browser, testInfo, "sales");
    const salesPage = await sales.newPage();
    const decision = await salesPage.request.post(
      `/api/reservations/sales/${ids.reservationId}/decision`,
      {
        data: {
          action: "PRE_APPROVE",
          note: "Identity details reviewed; branch attendance remains required.",
        },
      },
    );
    expect([200, 201]).toContain(decision.status());
    expect((await decision.json()).data.status).toBe("PRE_APPROVED");
    await sales.close();

    const admin = await roleContext(browser, testInfo, "admin");
    const adminPage = await admin.newPage();
    await adminPage.goto("/en/admin");
    await expect(
      adminPage.getByRole("heading", { name: "Every moving part, one clear command view." }),
    ).toBeVisible();
    const adminReview = await adminPage.request.get(
      `/api/reservations/sales/${ids.reservationId}?locale=en`,
    );
    expect(adminReview.status()).toBe(200);
    expect((await adminReview.json()).data.status).toBe("PRE_APPROVED");

    await adminPage.goto("/en/account/requests");
    await expect(pageHeading(adminPage)).toContainText(
      "This workspace is not assigned to your account",
    );
    await adminPage.goto("/en/sales");
    await expect(pageHeading(adminPage)).toContainText(
      "This workspace is not assigned to your account",
    );
    await admin.close();
  });
});

async function roleContext(
  browser: Browser,
  testInfo: TestInfo,
  role: E2eRole,
): Promise<BrowserContext> {
  return browser.newContext({ storageState: storageStatePath(testInfo.project.name, role) });
}

function pageHeading(page: Awaited<ReturnType<BrowserContext["newPage"]>>) {
  return page.getByRole("heading", { level: 1 });
}
