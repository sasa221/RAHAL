import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { SaveManagedVehicleDto } from "./vehicle-admin.dto";

const validVehicle = {
  branchId: "branch-1",
  nameAr: "سيارة رحال",
  nameEn: "Rahal car",
  make: "Rahal",
  model: "R1",
  year: 2026,
  registrationNumber: "RHL 2026",
  category: "sedan",
  transmission: "AUTOMATIC",
  fuelType: "PETROL",
  seats: 5,
  dailyRateEgp: 2500,
  minimumRentalDays: 1,
  driverPolicy: "OPTIONAL",
  active: true,
  featured: false,
  images: [{ url: "/images/silver-sedan.jpg", altEn: "Silver sedan" }],
};

describe("SaveManagedVehicleDto imagery", () => {
  it("accepts a bounded local primary image", async () => {
    const errors = await validate(plainToInstance(SaveManagedVehicleDto, validVehicle));
    expect(errors).toEqual([]);
  });

  it("requires at least one image", async () => {
    const errors = await validate(
      plainToInstance(SaveManagedVehicleDto, { ...validVehicle, images: [] }),
    );
    expect(errors.some((error) => error.property === "images")).toBe(true);
  });

  it("rejects insecure remote image URLs", async () => {
    const errors = await validate(
      plainToInstance(SaveManagedVehicleDto, {
        ...validVehicle,
        images: [{ url: "http://example.com/car.jpg" }],
      }),
    );
    expect(errors.some((error) => error.property === "images")).toBe(true);
  });
});
