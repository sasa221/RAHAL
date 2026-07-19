import { DriverPolicy, VehicleStatus } from "@rahal/database";
import { toPublicVehicle } from "./vehicles.repository";

describe("vehicle repository mapping", () => {
  it("converts database fields into the complete public fleet contract", () => {
    expect(
      toPublicVehicle({
        id: "demo-car",
        nameAr: "سيارة تجريبية",
        nameEn: "Demo Car",
        category: "Sedan",
        dailyRate: { toNumber: () => 2350 },
        weeklyRate: { toNumber: () => 14500 },
        minimumRentalDays: 2,
        seats: 5,
        luggage: 3,
        year: 2026,
        transmission: "AUTOMATIC",
        driverPolicy: DriverPolicy.OPTIONAL,
        fuelPolicyAr: "تُعاد بنفس مستوى الوقود.",
        fuelPolicyEn: "Return at the same fuel level.",
        mileageAllowancePerDay: 250,
        status: VehicleStatus.AVAILABLE,
        images: [
          {
            url: "/images/demo.jpg",
            altAr: "سيارة تجريبية",
            altEn: "Demo car",
          },
        ],
      }),
    ).toEqual({
      id: "demo-car",
      name: { ar: "سيارة تجريبية", en: "Demo Car" },
      category: { ar: "سيدان", en: "Sedan" },
      categoryKey: "sedan",
      image: "/images/demo.jpg",
      imageAlt: { ar: "سيارة تجريبية", en: "Demo car" },
      dailyRateEgp: 2350,
      weeklyRateEgp: 14500,
      minimumDays: 2,
      seats: 5,
      bags: 3,
      year: 2026,
      transmission: { ar: "أوتوماتيك", en: "Automatic" },
      driverPolicy: { ar: "السائق اختياري", en: "Optional driver" },
      driverPolicyKey: "optional",
      fuelPolicy: { ar: "تُعاد بنفس مستوى الوقود.", en: "Return at the same fuel level." },
      mileagePolicy: { ar: "250 كم يوميًا", en: "250 km per day" },
      status: "available",
    });
  });
});
