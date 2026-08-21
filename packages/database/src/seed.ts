import {
  createPrismaClient,
  CustomerCategory,
  DocumentType,
  DriverChargeType,
  DriverPolicy,
  VehicleStatus,
} from "./index.js";

const prisma = createPrismaClient(
  process.env.DATABASE_URL ??
    "postgresql://rahal:rahal_dev_password@127.0.0.1:5433/rahal?schema=public",
);

const branchId = "demo-branch-cairo";
const consentVersion = "DEV-2026-07-19";

const documentRequirements = [
  [
    "egyptian-id-front",
    CustomerCategory.EGYPTIAN,
    DocumentType.NATIONAL_ID_FRONT,
    false,
    "وجه بطاقة الرقم القومي",
    "National ID front",
  ],
  [
    "egyptian-id-back",
    CustomerCategory.EGYPTIAN,
    DocumentType.NATIONAL_ID_BACK,
    false,
    "ظهر بطاقة الرقم القومي",
    "National ID back",
  ],
  [
    "egyptian-license-front",
    CustomerCategory.EGYPTIAN,
    DocumentType.DRIVING_LICENSE_FRONT,
    true,
    "وجه رخصة القيادة",
    "Driving licence front",
  ],
  [
    "egyptian-license-back",
    CustomerCategory.EGYPTIAN,
    DocumentType.DRIVING_LICENSE_BACK,
    true,
    "ظهر رخصة القيادة",
    "Driving licence back",
  ],
  [
    "foreign-passport",
    CustomerCategory.FOREIGN,
    DocumentType.PASSPORT,
    false,
    "جواز السفر",
    "Passport",
  ],
  [
    "foreign-license-front",
    CustomerCategory.FOREIGN,
    DocumentType.DRIVING_LICENSE_FRONT,
    true,
    "وجه رخصة القيادة",
    "Driving licence front",
  ],
  [
    "foreign-license-back",
    CustomerCategory.FOREIGN,
    DocumentType.DRIVING_LICENSE_BACK,
    true,
    "ظهر رخصة القيادة",
    "Driving licence back",
  ],
] as const;

const consentPolicies = [
  {
    policyKey: "RENTAL_TERMS",
    titleAr: "ملخص شروط الطلب — نسخة تطويرية",
    titleEn: "Request terms summary — development version",
    bodyAr:
      "إرسال الطلب لا يؤكد الحجز. التأكيد النهائي يحتاج مراجعة المبيعات والحضور للفرع وتسجيل العربون وتوقيع المستندات.",
    bodyEn:
      "Submitting a request does not confirm a booking. Final confirmation requires sales review, branch attendance, deposit recording, and signed documents.",
  },
  {
    policyKey: "PRIVACY",
    titleAr: "ملخص الخصوصية — نسخة تطويرية",
    titleEn: "Privacy summary — development version",
    bodyAr:
      "تستخدم رحال بيانات الحساب والطلب لتشغيل ومراجعة طلب التأجير، مع تقييد الوصول حسب الدور والصلاحيات.",
    bodyEn:
      "Rahal uses account and request data to operate and review the rental request, with access restricted by role and permission.",
  },
  {
    policyKey: "DOCUMENT_PROCESSING",
    titleAr: "معالجة المستندات — نسخة تطويرية",
    titleEn: "Document processing — development version",
    bodyAr:
      "تُرفع المستندات المطلوبة لاحقًا إلى تخزين خاص، ولا تظهر أرقام الهوية الكاملة في الشاشات العادية.",
    bodyEn:
      "Required documents will be uploaded later to private storage, and full identity numbers are not shown in normal screens.",
  },
  {
    policyKey: "RESERVATION_PROCESS",
    titleAr: "إجراءات الطلب — نسخة تطويرية",
    titleEn: "Request process — development version",
    bodyAr: "الاستلام والإرجاع من فرع رحال فقط، والأسعار بالجنيه المصري، ولا يوجد دفع إلكتروني.",
    bodyEn:
      "Pickup and return are at the Rahal branch only, prices are in EGP, and no online payment is supported.",
  },
] as const;

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

const staffPermissions = [
  ["perm-reservations-view", "reservations.view", "Reservations", "View reservation queues"],
  ["perm-reservations-review", "reservations.review", "Reservations", "Review requests"],
  ["perm-documents-view", "documents.view", "Documents", "View protected documents"],
  ["perm-documents-review", "documents.review", "Documents", "Decide document reviews"],
  ["perm-deposits-record", "deposits.record", "Branch", "Record branch deposits"],
  ["perm-bookings-confirm", "bookings.confirm", "Bookings", "Confirm eligible bookings"],
  ["perm-bookings-operate", "bookings.operate", "Bookings", "Record delivery and return"],
  ["perm-fleet-view", "fleet.view", "Fleet", "View the private fleet calendar"],
  ["perm-fleet-manage", "fleet.manage", "Fleet", "Manage fleet blocks"],
  ["perm-vehicles-manage", "vehicles.manage", "Fleet", "Manage vehicle registry"],
  ["perm-content-edit", "content.edit", "Content", "Edit public website content drafts"],
  ["perm-content-publish", "content.publish", "Content", "Publish public website content"],
  ["perm-branches-view", "branches.view", "Branches", "View branch management"],
  ["perm-branches-edit", "branches.edit", "Branches", "Edit branch details"],
  ["perm-branches-create", "branches.create", "Branches", "Create branch drafts"],
  ["perm-branches-disable", "branches.disable", "Branches", "Disable active branches"],
  ["perm-branches-delete", "branches.delete", "Branches", "Delete unreferenced branches"],
  ["perm-staff-manage", "staff.manage", "Administration", "Manage staff accounts"],
  ["perm-audit-view", "audit.view", "Administration", "View audit records"],
  [
    "perm-notifications-send",
    "notifications.send",
    "Notifications",
    "Create customer notification campaigns",
  ],
] as const;

const defaultSalesPermissionKeys = [
  "reservations.view",
  "reservations.review",
  "documents.view",
  "documents.review",
  "deposits.record",
  "bookings.confirm",
  "bookings.operate",
  "fleet.view",
  "notifications.send",
] as const;

async function main() {
  for (const [id, key, category, description] of staffPermissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {
        category,
        description,
        isCritical: [
          "documents.view",
          "documents.review",
          "bookings.confirm",
          "staff.manage",
          "audit.view",
        ].includes(key),
      },
      create: {
        id,
        key,
        category,
        description,
        isCritical: [
          "documents.view",
          "documents.review",
          "bookings.confirm",
          "staff.manage",
          "audit.view",
        ].includes(key),
      },
    });
  }
  const salesRole = await prisma.staffRole.upsert({
    where: { name: "Sales Agent" },
    update: { description: "Default operational sales role", isSystem: true },
    create: {
      id: "role-sales-agent",
      name: "Sales Agent",
      description: "Default operational sales role",
      isSystem: true,
    },
  });
  const defaultPermissions = await prisma.permission.findMany({
    where: { key: { in: [...defaultSalesPermissionKeys] } },
    select: { id: true },
  });
  await prisma.staffRolePermission.deleteMany({ where: { staffRoleId: salesRole.id } });
  await prisma.staffRolePermission.createMany({
    data: defaultPermissions.map(({ id }) => ({ staffRoleId: salesRole.id, permissionId: id })),
    skipDuplicates: true,
  });
  await prisma.user.updateMany({
    where: { systemRole: "SALES", staffRoleId: null },
    data: { staffRoleId: salesRole.id },
  });

  for (const [
    key,
    customerCategory,
    documentType,
    requiresSelfDrive,
    labelAr,
    labelEn,
  ] of documentRequirements) {
    await prisma.documentRequirementRule.upsert({
      where: { key },
      update: {
        customerCategory,
        documentType,
        requiresSelfDrive,
        labelAr,
        labelEn,
        allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxSizeBytes: 8 * 1024 * 1024,
        active: true,
      },
      create: {
        key,
        customerCategory,
        documentType,
        requiresSelfDrive,
        labelAr,
        labelEn,
        allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxSizeBytes: 8 * 1024 * 1024,
        active: true,
        sortOrder: documentRequirements.findIndex((rule) => rule[0] === key),
      },
    });
  }

  for (const policy of consentPolicies) {
    for (const locale of ["ar", "en"] as const) {
      await prisma.policyVersion.upsert({
        where: {
          policyKey_version_locale: {
            policyKey: policy.policyKey,
            version: consentVersion,
            locale,
          },
        },
        update: {
          title: locale === "ar" ? policy.titleAr : policy.titleEn,
          body: locale === "ar" ? policy.bodyAr : policy.bodyEn,
          retiredAt: null,
        },
        create: {
          policyKey: policy.policyKey,
          version: consentVersion,
          locale,
          title: locale === "ar" ? policy.titleAr : policy.titleEn,
          body: locale === "ar" ? policy.bodyAr : policy.bodyEn,
          effectiveAt: new Date("2026-07-19T00:00:00.000Z"),
        },
      });
    }
  }

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
