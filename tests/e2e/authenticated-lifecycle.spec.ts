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

    await adminPage.goto(`/en/admin/requests?request=${ids.reservationId}`);
    await expect(adminPage.locator("main.workspace-access")).toHaveCount(0);
    await expect(adminPage.getByText(ids.reference).first()).toBeVisible();

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

  test("admin and super admin can open admin requests while sales and customer are rejected", async ({
    browser,
  }, testInfo) => {
    const ids = fixtureIds(testInfo.project.name);
    for (const role of ["admin", "super-admin"] as const) {
      const context = await roleContext(browser, testInfo, role);
      const page = await context.newPage();
      await page.goto(`/en/admin/requests?request=${ids.reservationId}`);
      await expect(page.locator("main.workspace-access")).toHaveCount(0);
      await expect(page.getByText(ids.reference).first()).toBeVisible();
      await context.close();
    }

    for (const role of ["sales", "customer"] as const) {
      const context = await roleContext(browser, testInfo, role);
      const page = await context.newPage();
      await page.goto(`/en/admin/requests?request=${ids.reservationId}`);
      await expect(
        page.getByRole("heading", { name: "This workspace is not assigned to your account" }),
      ).toBeVisible();
      const api = await page.request.get(`/api/reservations/sales/${ids.reservationId}?locale=en`);
      expect(api.status()).toBe(role === "sales" ? 200 : 403);
      await context.close();
    }
  });

  test("branch contract, attendance, and deposit unlock final confirmation", async ({
    browser,
  }, testInfo) => {
    const ids = fixtureIds(testInfo.project.name);
    const sales = await roleContext(browser, testInfo, "sales");
    const page = await sales.newPage();

    const contract = await page.request.post(
      `/api/reservations/sales/${ids.reservationId}/signed-contract`,
      {
        multipart: {
          file: {
            name: "rahal-e2e-signed-contract.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from("%PDF-1.4\n% Rahal isolated E2E contract\n%%EOF\n"),
          },
        },
      },
    );
    expect([200, 201]).toContain(contract.status());
    expect((await contract.json()).data.status).toBe("SIGNED");

    const branch = await page.request.post(
      `/api/reservations/sales/${ids.reservationId}/branch-checklist`,
      {
        data: {
          customerAttended: true,
          depositAmountEgp: 10_000,
          receiptNumber: `E2E-${testInfo.project.name}`,
          note: "Recorded at the physical Rahal branch for the isolated lifecycle test.",
        },
      },
    );
    expect([200, 201]).toContain(branch.status());
    expect((await branch.json()).data.status).toBe("PRE_APPROVED");

    const confirmation = await page.request.post(
      `/api/reservations/sales/${ids.reservationId}/confirm`,
    );
    expect([200, 201]).toContain(confirmation.status());
    const confirmed = (await confirmation.json()).data;
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.booking.reference).toBe(`BKG-${ids.reference}`);
    await sales.close();

    const customer = await roleContext(browser, testInfo, "customer");
    const customerPage = await customer.newPage();
    const detail = await customerPage.request.get(
      `/api/reservations/customer/requests/${ids.reservationId}?locale=en`,
    );
    expect(detail.status()).toBe(200);
    expect((await detail.json()).data).toMatchObject({
      status: "CONFIRMED",
      branchProgress: { bookingReference: `BKG-${ids.reference}` },
    });
    const earlyReview = await customerPage.request.post(
      `/api/reviews/customer/${ids.reservationId}`,
      { data: { rating: 5, comment: "This review must wait until the rental is completed." } },
    );
    expect(earlyReview.status()).toBe(409);
    await customer.close();
  });

  test("sales records delivery, return, and completion visible to the customer", async ({
    browser,
  }, testInfo) => {
    const ids = fixtureIds(testInfo.project.name);
    const sales = await roleContext(browser, testInfo, "sales");
    const page = await sales.newPage();

    const delivery = await bookingOperation(page, ids.reservationId, {
      action: "DELIVER",
      odometerKm: 42_120,
      fuelLevelPercent: 85,
      note: "Vehicle delivered at the physical Rahal branch in clean condition.",
    });
    expect(delivery.status).toBe("ACTIVE");

    const vehicleReturn = await bookingOperation(page, ids.reservationId, {
      action: "RETURN",
      odometerKm: 42_310,
      fuelLevelPercent: 60,
      note: "Vehicle returned to the physical Rahal branch for final inspection.",
    });
    expect(vehicleReturn.status).toBe("ACTIVE");

    const completion = await bookingOperation(page, ids.reservationId, {
      action: "COMPLETE",
      note: "Rental completed after the branch return inspection was recorded.",
    });
    expect(completion.status).toBe("COMPLETED");
    await sales.close();

    const customer = await roleContext(browser, testInfo, "customer");
    const customerPage = await customer.newPage();
    await customerPage.goto("/en/account/requests");
    await expect(customerPage.getByText(ids.reference).first()).toBeVisible();
    await expect(customerPage.getByText("Completed").first()).toBeVisible();

    const detail = await customerPage.request.get(
      `/api/reservations/customer/requests/${ids.reservationId}?locale=en`,
    );
    expect((await detail.json()).data).toMatchObject({
      status: "COMPLETED",
      branchProgress: { bookingReference: `BKG-${ids.reference}` },
      rentalProgress: {
        deliveredAt: expect.any(String),
        returnedAt: expect.any(String),
        completedAt: expect.any(String),
      },
    });
    const review = await customerPage.request.post(`/api/reviews/customer/${ids.reservationId}`, {
      data: {
        rating: 5,
        comment: "The completed Rahal rental workflow was clear and professionally handled.",
      },
    });
    expect([200, 201]).toContain(review.status());
    expect((await review.json()).data.status).toBe("PENDING");
    await customer.close();
  });

  test("cancellation and no-show remain distinct terminal outcomes", async ({
    browser,
  }, testInfo) => {
    const ids = fixtureIds(testInfo.project.name);
    const sales = await roleContext(browser, testInfo, "sales");
    const salesPage = await sales.newPage();

    const cancellation = await bookingOperation(salesPage, ids.cancellationReservationId, {
      action: "CANCEL",
      note: "Booking cancelled by authorized branch staff after the customer request.",
    });
    expect(cancellation.status).toBe("CANCELLED");

    const noShow = await bookingOperation(salesPage, ids.noShowReservationId, {
      action: "NO_SHOW",
      note: "Customer did not attend the Rahal branch after the scheduled pickup time.",
    });
    expect(noShow.status).toBe("NO_SHOW");
    await sales.close();

    const customer = await roleContext(browser, testInfo, "customer");
    const customerPage = await customer.newPage();
    const [cancelledDetail, noShowDetail] = await Promise.all([
      customerPage.request.get(
        `/api/reservations/customer/requests/${ids.cancellationReservationId}?locale=en`,
      ),
      customerPage.request.get(
        `/api/reservations/customer/requests/${ids.noShowReservationId}?locale=en`,
      ),
    ]);
    expect((await cancelledDetail.json()).data.status).toBe("CANCELLED");
    expect((await noShowDetail.json()).data.status).toBe("NO_SHOW");

    await customerPage.goto("/en/account/requests");
    await expect(customerPage.getByText(ids.cancellationReference).first()).toBeVisible();
    await expect(customerPage.getByText(ids.noShowReference).first()).toBeVisible();
    await customer.close();
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

async function bookingOperation(
  page: Awaited<ReturnType<BrowserContext["newPage"]>>,
  reservationId: string,
  data: {
    action: "DELIVER" | "RETURN" | "COMPLETE" | "CANCEL" | "NO_SHOW";
    odometerKm?: number;
    fuelLevelPercent?: number;
    note: string;
  },
) {
  const response = await page.request.post(`/api/reservations/sales/${reservationId}/operations`, {
    data,
  });
  expect([200, 201]).toContain(response.status());
  return (await response.json()).data as { status: string };
}
