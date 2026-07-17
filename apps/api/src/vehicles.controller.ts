import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import type { ApiSuccess, DemoVehicle } from "@rahal/contracts";

const demoVehicles: DemoVehicle[] = [
  {
    id: "demo-mercedes-c",
    nameAr: "مرسيدس C-Class",
    nameEn: "Mercedes-Benz C-Class",
    categoryAr: "سيدان",
    categoryEn: "Sedan",
    dailyRateEgp: 4500,
    status: "AVAILABLE",
  },
  {
    id: "demo-bmw-x3",
    nameAr: "بي إم دبليو X3",
    nameEn: "BMW X3",
    categoryAr: "دفع رباعي",
    categoryEn: "SUV",
    dailyRateEgp: 5800,
    status: "AVAILABLE",
  },
  {
    id: "demo-toyota-corolla",
    nameAr: "تويوتا كورولا",
    nameEn: "Toyota Corolla",
    categoryAr: "اقتصادية",
    categoryEn: "Economy",
    dailyRateEgp: 1900,
    status: "CONFIRMED_BOOKING",
  },
];

@Controller("vehicles")
export class VehiclesController {
  @Get()
  list(): ApiSuccess<DemoVehicle[]> {
    return { data: demoVehicles, meta: { demo: true, total: demoVehicles.length } };
  }

  @Get(":id")
  get(@Param("id") id: string): ApiSuccess<DemoVehicle> {
    const vehicle = demoVehicles.find((item) => item.id === id);

    if (!vehicle) {
      throw new NotFoundException(`Vehicle '${id}' was not found.`);
    }

    return { data: vehicle, meta: { demo: true } };
  }
}
