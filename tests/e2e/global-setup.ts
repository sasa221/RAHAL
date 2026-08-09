import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { FullConfig } from "@playwright/test";
import type { createPrismaClient as CreatePrismaClientFactory } from "@rahal/database";
import { fixtureIds, sessionToken, storageStatePath, type E2eRole } from "./fixture-data";

const roles: E2eRole[] = ["customer", "sales", "rival-sales", "admin"];
type E2ePrismaClient = ReturnType<typeof CreatePrismaClientFactory>;

export default async function globalSetup(config: FullConfig) {
  if (process.env.RAHAL_E2E_BASE_URL) return;

  const { createPrismaClient } =
    (await import("../../packages/database/dist/src/index.js")) as typeof import("@rahal/database");

  const databaseUrl =
    process.env.RAHAL_E2E_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://rahal:rahal_dev_password@127.0.0.1:5433/rahal?schema=public";
  assertLocalDatabase(databaseUrl);

  const prisma = createPrismaClient(databaseUrl);
  try {
    const [vehicles, branch, salesRole] = await Promise.all([
      prisma.vehicle.findMany({
        where: {
          slug: {
            in: ["silver-executive", "graphite-suv", "white-compact", "family-seven"],
          },
        },
      }),
      prisma.branch.findUnique({ where: { id: "demo-branch-cairo" } }),
      prisma.staffRole.findUnique({ where: { id: "role-sales-agent" } }),
    ]);
    const vehicleBySlug = new Map(vehicles.map((vehicle) => [vehicle.slug, vehicle]));
    if (vehicleBySlug.size !== 4 || !branch || !salesRole) {
      throw new Error("Run the Rahal database seed before the authenticated browser suite.");
    }

    for (const project of config.projects) {
      const vehicle = vehicleBySlug.get(
        project.name.includes("mobile") ? "silver-executive" : "graphite-suv",
      )!;
      await prepareProjectFixtures(
        prisma,
        project.name,
        vehicle.id,
        vehicleBySlug.get("white-compact")!.id,
        vehicleBySlug.get("family-seven")!.id,
        branch.id,
        salesRole.id,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

function assertLocalDatabase(databaseUrl: string) {
  const url = new URL(databaseUrl);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    throw new Error(
      `Authenticated E2E fixtures refuse non-local databases (${url.hostname}). Use an isolated local PostgreSQL database.`,
    );
  }
}

async function prepareProjectFixtures(
  prisma: E2ePrismaClient,
  projectName: string,
  vehicleId: string,
  cancellationVehicleId: string,
  noShowVehicleId: string,
  branchId: string,
  salesRoleId: string,
) {
  const ids = fixtureIds(projectName);
  const now = new Date();
  const verifiedAt = new Date(now.getTime() - 60_000);
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  for (const [index, role] of roles.entries()) {
    const systemRole = role === "customer" ? "CUSTOMER" : role === "admin" ? "ADMIN" : "SALES";
    const userId = ids.users[role];
    const email = `${userId}@example.test`;
    const phone = `+20110000${projectName.includes("mobile") ? "1" : "2"}${index}0`;

    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email,
        phone,
        fullNameEn: `E2E ${role}`,
        systemRole,
        status: "ACTIVE",
        emailVerifiedAt: verifiedAt,
        phoneVerifiedAt: verifiedAt,
        mustChangePassword: false,
        staffRoleId: systemRole === "SALES" ? salesRoleId : null,
      },
      create: {
        id: userId,
        email,
        phone,
        passwordHash: "e2e-session-only-password-hash",
        fullNameEn: `E2E ${role}`,
        systemRole,
        status: "ACTIVE",
        emailVerifiedAt: verifiedAt,
        phoneVerifiedAt: verifiedAt,
        preferredLocale: "en",
        staffRoleId: systemRole === "SALES" ? salesRoleId : null,
      },
    });

    if (systemRole !== "CUSTOMER") {
      await prisma.staffMfaCredential.upsert({
        where: { userId },
        update: { enabledAt: verifiedAt },
        create: {
          id: `e2e-mfa-${userId}`,
          userId,
          secretCiphertext: "e2e-fixture-never-decrypted",
          enabledAt: verifiedAt,
        },
      });
    }

    const token = sessionToken(projectName, role);
    await prisma.session.upsert({
      where: { id: `e2e-session-${userId}` },
      update: {
        refreshTokenHash: sha256(token),
        status: "ACTIVE",
        mfaVerifiedAt: systemRole === "CUSTOMER" ? null : verifiedAt,
        expiresAt,
        revokedAt: null,
      },
      create: {
        id: `e2e-session-${userId}`,
        userId,
        refreshTokenHash: sha256(token),
        status: "ACTIVE",
        mfaVerifiedAt: systemRole === "CUSTOMER" ? null : verifiedAt,
        expiresAt,
        userAgent: "Rahal Playwright lifecycle audit",
      },
    });
    await writeStorageState(projectName, role, token, expiresAt);
  }

  await resetReservation(prisma, ids.reservationId);
  await resetReservation(prisma, ids.cancellationReservationId);
  await resetReservation(prisma, ids.noShowReservationId);

  const pickupAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const returnAt = new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000);
  await prisma.reservation.create({
    data: {
      id: ids.reservationId,
      reference: ids.reference,
      customerId: ids.users.customer,
      vehicleId,
      branchId,
      status: "PENDING_REVIEW",
      pickupAt,
      returnAt,
      driverRequested: false,
      vehicleRateSnapshot: "2200.00",
      estimatedTotal: "6600.00",
      customerNameSnapshot: "E2E Customer",
      customerEmailSnapshot: `${ids.users.customer}@example.test`,
      customerPhoneSnapshot: `+20110000${projectName.includes("mobile") ? "1" : "2"}00`,
      nationalitySnapshot: "Egyptian",
      customerCategorySnapshot: "EGYPTIAN",
      addressSnapshot: "Rahal E2E isolated test address",
      emergencyContactNameSnapshot: "E2E Contact",
      emergencyContactPhoneSnapshot: "+201100009999",
      customerDetailsCompletedAt: verifiedAt,
      termsVersion: "e2e-v1",
      termsAcceptedAt: verifiedAt,
      privacyConsentAt: verifiedAt,
      documentConsentAt: verifiedAt,
      operationalConsentAt: verifiedAt,
      submittedAt: now,
      events: {
        create: {
          toStatus: "PENDING_REVIEW",
          actorId: ids.users.customer,
          note: "Isolated authenticated E2E request fixture",
        },
      },
    },
  });

  const projectOffset = projectName.includes("mobile") ? 0 : 30;
  await createConfirmedFixture(prisma, {
    id: ids.cancellationReservationId,
    reference: ids.cancellationReference,
    customerId: ids.users.customer,
    salesId: ids.users.sales,
    vehicleId: cancellationVehicleId,
    branchId,
    pickupAt: new Date(now.getTime() + (60 + projectOffset) * 24 * 60 * 60 * 1000),
    returnAt: new Date(now.getTime() + (63 + projectOffset) * 24 * 60 * 60 * 1000),
    now,
  });
  await createConfirmedFixture(prisma, {
    id: ids.noShowReservationId,
    reference: ids.noShowReference,
    customerId: ids.users.customer,
    salesId: ids.users.sales,
    vehicleId: noShowVehicleId,
    branchId,
    pickupAt: new Date(now.getTime() - (20 + projectOffset) * 24 * 60 * 60 * 1000),
    returnAt: new Date(now.getTime() - (17 + projectOffset) * 24 * 60 * 60 * 1000),
    now,
  });
}

async function resetReservation(prisma: E2ePrismaClient, reservationId: string) {
  const previousBooking = await prisma.booking.findUnique({
    where: { reservationId },
    select: { id: true },
  });
  await prisma.notification.deleteMany({ where: { reservationId } });
  await prisma.notificationEvent.deleteMany({
    where: {
      aggregateId: { in: [reservationId, ...(previousBooking ? [previousBooking.id] : [])] },
    },
  });
  await prisma.contractAccessLog.deleteMany({ where: { contract: { reservationId } } });
  await prisma.contract.deleteMany({ where: { reservationId } });
  await prisma.booking.deleteMany({ where: { reservationId } });
  await prisma.reservation.deleteMany({ where: { id: reservationId } });
}

async function createConfirmedFixture(
  prisma: E2ePrismaClient,
  input: {
    id: string;
    reference: string;
    customerId: string;
    salesId: string;
    vehicleId: string;
    branchId: string;
    pickupAt: Date;
    returnAt: Date;
    now: Date;
  },
) {
  await prisma.reservation.create({
    data: {
      id: input.id,
      reference: input.reference,
      customerId: input.customerId,
      assignedSalesId: input.salesId,
      vehicleId: input.vehicleId,
      branchId: input.branchId,
      status: "CONFIRMED",
      pickupAt: input.pickupAt,
      returnAt: input.returnAt,
      driverRequested: false,
      vehicleRateSnapshot: "1900.00",
      estimatedTotal: "5700.00",
      finalTotal: "5700.00",
      customerNameSnapshot: "E2E Customer",
      customerEmailSnapshot: `${input.customerId}@example.test`,
      customerPhoneSnapshot: "+201100008888",
      nationalitySnapshot: "Egyptian",
      customerCategorySnapshot: "EGYPTIAN",
      submittedAt: input.now,
      confirmedAt: input.now,
      events: {
        create: {
          toStatus: "CONFIRMED",
          actorId: input.salesId,
          note: "Isolated terminal booking-operation E2E fixture",
        },
      },
      booking: {
        create: {
          id: `e2e-booking-${input.id}`,
          reference: `BKG-${input.reference}`,
          customerId: input.customerId,
          vehicleId: input.vehicleId,
          branchId: input.branchId,
          status: "CONFIRMED",
          pickupAt: input.pickupAt,
          returnAt: input.returnAt,
          confirmedAt: input.now,
        },
      },
    },
  });
}

async function writeStorageState(
  projectName: string,
  role: E2eRole,
  token: string,
  expiresAt: Date,
) {
  const file = resolve(storageStatePath(projectName, role));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(
    file,
    JSON.stringify({
      cookies: [
        {
          name: "rahal_session",
          value: token,
          domain: "127.0.0.1",
          path: "/api",
          expires: Math.floor(expiresAt.getTime() / 1000),
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
