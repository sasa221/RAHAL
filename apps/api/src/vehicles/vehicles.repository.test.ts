import { VehicleStatus } from "@rahal/database";
import { toDemoVehicle } from "./vehicles.repository";

describe("vehicle repository mapping", () => {
  it("converts database decimals and preserves safe public fields", () => {
    expect(
      toDemoVehicle({
        id: "demo-car",
        nameAr: "سيارة تجريبية",
        nameEn: "Demo Car",
        category: "Sedan",
        dailyRate: { toNumber: () => 2350 },
        status: VehicleStatus.AVAILABLE,
      }),
    ).toEqual({
      id: "demo-car",
      nameAr: "سيارة تجريبية",
      nameEn: "Demo Car",
      categoryAr: "Sedan",
      categoryEn: "Sedan",
      dailyRateEgp: 2350,
      status: "AVAILABLE",
    });
  });
});
