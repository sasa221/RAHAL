import { createPrismaClient, DriverChargeType, DriverPolicy, VehicleStatus } from "./index.js";

const prisma = createPrismaClient(
  process.env.DATABASE_URL ??
    "postgresql://rahal:rahal_dev_password@127.0.0.1:5433/rahal?schema=public",
);

const branchId = "demo-branch-cairo";

const vehicles = [
  [
    "silver-executive",
    "سيدان تنفيذية فضية",
    "Silver Executive Sedan",
    "Sedan",
    4500,
    28000,
    5,
    3,
    2026,
    DriverPolicy.OPTIONAL,
    "/images/silver-sedan.jpg",
  ],
  [
    "graphite-suv",
    "دفع رباعي جرافيت",
    "Graphite Family SUV",
    "SUV",
    5800,
    36000,
    7,
    5,
    2026,
    DriverPolicy.OPTIONAL,
    "/images/black-suv.jpg",
  ],
  [
    "white-compact",
    "سيدان اقتصادية بيضاء",
    "White Compact Sedan",
    "Economy",
    1900,
    11800,
    5,
    2,
    2025,
    DriverPolicy.UNAVAILABLE,
    "/images/white-sedan.jpg",
  ],
  [
    "midnight-sedan",
    "سيدان ليلية",
    "Midnight Business Sedan",
    "Sedan",
    3900,
    24200,
    5,
    3,
    2025,
    DriverPolicy.OPTIONAL,
    "/images/silver-sedan.jpg",
  ],
  [
    "family-seven",
    "عائلية سبعة مقاعد",
    "Seven-seat Family SUV",
    "SUV",
    5200,
    32200,
    7,
    5,
    2025,
    DriverPolicy.MANDATORY,
    "/images/black-suv.jpg",
  ],
  [
    "city-compact",
    "مدمجة للمدينة",
    "City Compact",
    "Economy",
    1700,
    10500,
    5,
    2,
    2024,
    DriverPolicy.UNAVAILABLE,
    "/images/white-sedan.jpg",
  ],
  [
    "executive-plus",
    "تنفيذية بلس",
    "Executive Plus Sedan",
    "Sedan",
    4900,
    30400,
    5,
    4,
    2026,
    DriverPolicy.MANDATORY,
    "/images/silver-sedan.jpg",
  ],
  [
    "touring-suv",
    "دفع رباعي للرحلات",
    "Touring SUV",
    "SUV",
    6100,
    37900,
    7,
    5,
    2026,
    DriverPolicy.OPTIONAL,
    "/images/black-suv.jpg",
  ],
] as const;

async function main() {
  await prisma.branch.upsert({
    where: { id: branchId },
    update: {
      nameAr: "فرع رحال القاهرة التجريبي",
      nameEn: "Rahal Cairo Demo Branch",
      addressAr: "عنوان تجريبي — القاهرة، مصر",
      addressEn: "Fictional address — Cairo, Egypt",
      phones: ["+20 000 000 0000"],
      whatsappNumbers: ["+20 000 000 0000"],
      workingHours: { saturdayToThursday: "09:00-21:00", friday: "14:00-21:00" },
      active: true,
    },
    create: {
      id: branchId,
      nameAr: "فرع رحال القاهرة التجريبي",
      nameEn: "Rahal Cairo Demo Branch",
      addressAr: "عنوان تجريبي — القاهرة، مصر",
      addressEn: "Fictional address — Cairo, Egypt",
      phones: ["+20 000 000 0000"],
      whatsappNumbers: ["+20 000 000 0000"],
      workingHours: { saturdayToThursday: "09:00-21:00", friday: "14:00-21:00" },
    },
  });

  for (const [
    id,
    nameAr,
    nameEn,
    category,
    dailyRate,
    weeklyRate,
    seats,
    luggage,
    year,
    driverPolicy,
    imageUrl,
  ] of vehicles) {
    await prisma.vehicle.upsert({
      where: { id },
      update: {
        branchId,
        slug: id,
        nameAr,
        nameEn,
        category,
        dailyRate,
        weeklyRate,
        seats,
        luggage,
        year,
        driverPolicy,
        status: VehicleStatus.AVAILABLE,
        active: true,
      },
      create: {
        id,
        branchId,
        slug: id,
        nameAr,
        nameEn,
        descriptionAr: "سيارة تجريبية خيالية لاختبار منصة رحال.",
        descriptionEn: "Fictional demo vehicle for testing the Rahal platform.",
        make: "Rahal Demo",
        model: nameEn,
        year,
        registrationNumber: `DEMO-RAHAL-${String(vehicles.findIndex((vehicle) => vehicle[0] === id) + 1).padStart(3, "0")}`,
        category,
        transmission: "AUTOMATIC",
        fuelType: "PETROL",
        seats,
        luggage,
        status: VehicleStatus.AVAILABLE,
        dailyRate,
        weeklyRate,
        minimumRentalDays: 2,
        driverPolicy,
        driverChargeType:
          driverPolicy === DriverPolicy.UNAVAILABLE ? null : DriverChargeType.PER_DAY,
        driverCharge: driverPolicy === DriverPolicy.UNAVAILABLE ? null : 700,
        driverIncludedHours: driverPolicy === DriverPolicy.UNAVAILABLE ? null : 10,
        driverExtraHourRate: driverPolicy === DriverPolicy.UNAVAILABLE ? null : 120,
        mileageAllowancePerDay: 250,
        extraKilometreRate: 8,
        depositAmount: 10000,
        fuelPolicyAr: "تُعاد السيارة بنفس مستوى الوقود.",
        fuelPolicyEn: "Return the vehicle at the same fuel level.",
        featured: id === "silver-executive" || id === "graphite-suv",
      },
    });

    await prisma.vehicleImage.deleteMany({ where: { vehicleId: id } });
    await prisma.vehicleImage.create({
      data: {
        vehicleId: id,
        storageKey: `demo/${id}/primary.jpg`,
        url: imageUrl,
        altAr: nameAr,
        altEn: nameEn,
        isPrimary: true,
      },
    });
  }

  const now = new Date();
  const startsAt = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  await prisma.vehicleBlock.deleteMany({
    where: { vehicleId: "white-compact", reason: { startsWith: "DEMO:" } },
  });
  await prisma.vehicleBlock.create({
    data: {
      vehicleId: "white-compact",
      type: "MAINTENANCE",
      startsAt,
      endsAt,
      reason: "DEMO: relative maintenance window",
      createdBy: "system-seed",
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error("RAHAL database seed failed.", error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
