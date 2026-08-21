import { expect, test } from "@playwright/test";
import { createPrismaClient } from "@rahal/database";
import { storageStatePath } from "./fixture-data";

const databaseUrl =
  process.env.RAHAL_E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://rahal:rahal_dev_password@127.0.0.1:5433/rahal?schema=public";

test("admin dashboard values match the E2E database and cards expose exact filters", async ({
  browser,
}, testInfo) => {
  const prisma = createPrismaClient(databaseUrl);
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
  });
  try {
    const now = new Date();
    const openStatuses = [
      "PENDING_REVIEW",
      "UNDER_REVIEW",
      "MORE_INFORMATION_REQUIRED",
      "PRE_APPROVED",
      "ALTERNATIVE_OFFERED",
    ] as const;
    const [open, confirmed, active, available, overdue, expiring, failed, reviews] =
      await Promise.all([
        prisma.reservation.count({ where: { status: { in: [...openStatuses] } } }),
        prisma.booking.count({ where: { status: "CONFIRMED" } }),
        prisma.booking.count({ where: { status: "ACTIVE" } }),
        prisma.vehicle.count({ where: { status: "AVAILABLE" } }),
        prisma.booking.count({ where: { status: "ACTIVE", returnAt: { lt: now } } }),
        prisma.reservation.count({
          where: {
            status: "PRE_APPROVED",
            preApprovalExpiresAt: {
              gt: now,
              lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.notificationDelivery.count({ where: { status: "FAILED" } }),
        prisma.review.count({ where: { status: "PENDING" } }),
      ]);
    const response = await context.request.get("/api/admin-operations/overview?locale=en");
    expect(response.status()).toBe(200);
    const metrics = (await response.json()).data.metrics as Array<{
      key: string;
      value: number;
      href: string;
    }>;
    expect(metrics).toEqual([
      { key: "OPEN_REQUESTS", value: open, href: "/admin/requests?filter=OPEN" },
      {
        key: "CONFIRMED_BOOKINGS",
        value: confirmed,
        href: "/admin/requests?filter=CONFIRMED",
      },
      { key: "ACTIVE_RENTALS", value: active, href: "/admin/requests?filter=ACTIVE" },
      { key: "AVAILABLE_VEHICLES", value: available, href: "/admin/fleet?status=AVAILABLE" },
      {
        key: "ATTENTION_REQUIRED",
        value: overdue + expiring + failed + reviews,
        href: "/admin/requests?filter=ATTENTION",
      },
    ]);

    const page = await context.newPage();
    await page.goto("/en/admin");
    for (const metric of metrics) {
      const card = page.locator(`[data-metric="${metric.key}"]`);
      await expect(card).toHaveAttribute("href", `/en${metric.href}`);
      await expect(card.locator("strong")).toHaveText(metric.value.toLocaleString("en-GB"));
    }
  } finally {
    await context.close();
    await prisma.$disconnect();
  }
});

test("dashboard cards navigate to their operational filter", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "admin"),
  });
  const page = await context.newPage();
  await page.goto("/en/admin");
  const routes: Record<string, RegExp> = {
    OPEN_REQUESTS: /\/en\/admin\/requests\?filter=OPEN/,
    CONFIRMED_BOOKINGS: /\/en\/admin\/requests\?filter=CONFIRMED/,
    ACTIVE_RENTALS: /\/en\/admin\/requests\?filter=ACTIVE/,
    AVAILABLE_VEHICLES: /\/en\/admin\/fleet\?status=AVAILABLE/,
    ATTENTION_REQUIRED: /\/en\/admin\/requests\?filter=ATTENTION/,
  };
  for (const [key, url] of Object.entries(routes)) {
    await page.goto("/en/admin");
    await page.locator(`[data-metric="${key}"]`).click();
    await expect(page).toHaveURL(url);
  }
  await context.close();
});
