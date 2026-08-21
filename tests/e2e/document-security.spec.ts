import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { createPrismaClient } from "@rahal/database";
import { fixtureIds, fixtureKey, storageStatePath } from "./fixture-data";

const databaseUrl =
  process.env.RAHAL_E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://rahal:rahal_dev_password@127.0.0.1:5433/rahal?schema=public";

test("protected document operations enforce ownership, permissions, audit and safe projections", async ({
  browser,
}, testInfo) => {
  const prisma = createPrismaClient(databaseUrl);
  const ids = fixtureIds(testInfo.project.name);
  const key = fixtureKey(testInfo.project.name);
  const base = await prisma.reservation.findUniqueOrThrow({ where: { id: ids.reservationId } });
  const reviewReservationId = `e2e-document-review-${key}`;
  const draftId = `e2e-document-draft-${key}`;
  const documentId = `e2e-protected-document-${key}`;
  const objectName = "11111111-1111-4111-8111-111111111111.png";
  const storageKey = `reservations/${reviewReservationId}/${objectName}`;
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

  await prisma.reservation.upsert({
    where: { id: reviewReservationId },
    update: { assignedSalesId: ids.users.sales, status: "UNDER_REVIEW" },
    create: {
      id: reviewReservationId,
      reference: `RAHAL-E2E-DOC-${key.toUpperCase()}`,
      customerId: ids.users.customer,
      assignedSalesId: ids.users.sales,
      vehicleId: base.vehicleId,
      branchId: base.branchId,
      status: "UNDER_REVIEW",
      pickupAt: base.pickupAt,
      returnAt: base.returnAt,
      driverRequested: false,
      vehicleRateSnapshot: base.vehicleRateSnapshot,
      estimatedTotal: base.estimatedTotal,
      submittedAt: new Date(),
    },
  });
  await prisma.reservationDocument.upsert({
    where: { id: documentId },
    update: { status: "UPLOADED", deletedAt: null, storageKey },
    create: {
      id: documentId,
      reservationId: reviewReservationId,
      type: "NATIONAL_ID_FRONT",
      status: "UPLOADED",
      storageKey,
      originalName: "full-identity-name-must-never-leak.png",
      mimeType: "image/png",
      sizeBytes: png.length,
    },
  });
  const objectPath = resolve(".private-storage", "e2e", storageKey);
  await mkdir(resolve(objectPath, ".."), { recursive: true });
  await writeFile(objectPath, png);

  const sales = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "sales"),
  });
  const rival = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "rival-sales"),
  });
  const customer = await browser.newContext({
    storageState: storageStatePath(testInfo.project.name, "customer"),
  });
  const endpoint = `/api/reservations/sales/${reviewReservationId}/documents/${documentId}/access`;
  const body = { reason: "Reviewing the protected document for eligibility" };

  expect((await customer.request.post(endpoint, { data: body })).status()).toBe(403);
  expect((await rival.request.post(endpoint, { data: body })).status()).toBe(403);
  const preview = await sales.request.post(endpoint, { data: body });
  expect(preview.status()).toBe(201);
  expect(preview.headers()["cache-control"]).toContain("no-store");
  expect(preview.headers()["content-disposition"]).toBe(
    "inline; filename=rahal-protected-document",
  );
  expect(preview.headers()["content-disposition"]).not.toContain("full-identity");
  expect(await preview.body()).toEqual(png);
  expect((await sales.request.get(endpoint)).status()).toBe(404);

  const audit = await prisma.documentAccessLog.findMany({ where: { documentId } });
  expect(audit).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ actorId: ids.users.sales, succeeded: true }),
      expect.objectContaining({ actorId: ids.users["rival-sales"], succeeded: false }),
    ]),
  );

  await prisma.reservation.upsert({
    where: { id: draftId },
    update: { status: "DRAFT", documentConsentAt: new Date() },
    create: {
      id: draftId,
      reference: `RAHAL-E2E-DRAFT-DOC-${key.toUpperCase()}`,
      customerId: ids.users.customer,
      vehicleId: base.vehicleId,
      branchId: base.branchId,
      status: "DRAFT",
      pickupAt: base.pickupAt,
      returnAt: base.returnAt,
      driverRequested: true,
      vehicleRateSnapshot: base.vehicleRateSnapshot,
      estimatedTotal: base.estimatedTotal,
      customerCategorySnapshot: "EGYPTIAN",
      customerDetailsCompletedAt: new Date(),
      documentConsentAt: new Date(),
    },
  });
  const invalid = await customer.request.post(
    `/api/reservations/drafts/${draftId}/documents/NATIONAL_ID_FRONT`,
    {
      multipart: {
        file: { name: "identity.png", mimeType: "image/png", buffer: Buffer.from("not-png") },
      },
    },
  );
  expect(invalid.status()).toBe(400);
  const uploaded = await customer.request.post(
    `/api/reservations/drafts/${draftId}/documents/NATIONAL_ID_FRONT`,
    { multipart: { file: { name: "identity-private.png", mimeType: "image/png", buffer: png } } },
  );
  expect(uploaded.status()).toBe(201);
  const payload = (await uploaded.json()) as {
    data: { requirements: Array<{ document?: { id: string } }> };
  };
  expect(JSON.stringify(payload)).not.toContain("identity-private.png");
  expect(JSON.stringify(payload)).not.toContain("storageKey");
  const uploadedId = payload.data.requirements.find((item) => item.document)?.document?.id;
  expect(uploadedId).toBeTruthy();
  const removed = await customer.request.delete(
    `/api/reservations/drafts/${draftId}/documents/${uploadedId}`,
  );
  expect(removed.status()).toBe(200);
  await expect
    .poll(() =>
      prisma.reservationEvent.count({
        where: {
          reservationId: draftId,
          note: "Customer removed a private document from the draft.",
        },
      }),
    )
    .toBeGreaterThan(0);

  await Promise.all([sales.close(), rival.close(), customer.close()]);
  await prisma.$disconnect();
});
