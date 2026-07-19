import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { localizedPath, publicVehicles } from "../apps/web/lib/public-content";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("public multi-page experience", () => {
  const fleet = read("apps/web/components/public-fleet.tsx");
  const details = read("apps/web/components/vehicle-details.tsx");
  const reservation = read("apps/web/components/reservation-start.tsx");

  it("defines valid localized public paths", () => {
    expect(localizedPath("ar")).toBe("/");
    expect(localizedPath("en")).toBe("/en");
    expect(localizedPath("ar", "/cars")).toBe("/cars");
    expect(localizedPath("en", "/cars")).toBe("/en/cars");
  });

  it("uses shared components for Arabic and English fleet routes", () => {
    const arabicRoute = read("apps/web/app/cars/page.tsx");
    const englishRoute = read("apps/web/app/en/cars/page.tsx");

    expect(arabicRoute).toMatch(/<PublicFleet\s+locale="ar"/);
    expect(englishRoute).toMatch(/<PublicFleet\s+locale="en"/);
    expect(fleet).toContain("publicVehicles.filter");
    expect(fleet).toContain("setCategory");
    expect(fleet).toContain("setDriver");
    expect(fleet).toContain("setMaxPrice");
    expect(fleet).toContain("requestedCategory");
    expect(fleet).toContain("requestedDriver");
    expect(fleet).toContain("detailsQuery");
    expect(fleet).toContain("FleetListingCard");
    expect(fleet).toContain("aria-pressed={category === value}");
    expect(fleet).toContain("filtersOpen");
    expect(fleet).toContain("Pickup and return at the Rahal branch only");
    expect(fleet).toContain("Every request is reviewed by sales");
    expect(fleet).toContain("Egyptian pounds");
    expect(fleet).not.toContain("Book now");
    expect(fleet).not.toContain("online payment");
  });

  it("creates localized detail routes for every typed demo vehicle", () => {
    for (const route of [
      "apps/web/app/cars/[slug]/page.tsx",
      "apps/web/app/en/cars/[slug]/page.tsx",
    ]) {
      expect(existsSync(join(root, route))).toBe(true);
      expect(read(route)).toContain("generateStaticParams");
      expect(read(route)).toContain("publicVehicles.find");
    }

    expect(publicVehicles).toHaveLength(3);
    expect(publicVehicles.every((vehicle) => vehicle.weeklyRateEgp > 0)).toBe(true);
    expect(publicVehicles.every((vehicle) => vehicle.minimumDays >= 2)).toBe(true);
    expect(publicVehicles.every((vehicle) => vehicle.fuelPolicy.ar.length > 0)).toBe(true);
  });

  it("keeps availability relative and customer information private", () => {
    expect(details).toContain("dateInputValue(index + 1)");
    expect(details).toContain("buildAvailability(locale)");
    expect(details).toContain("No customer data or documents");
    expect(details).not.toContain("customerId");
    expect(details).not.toContain("identityNumber");
    expect(details).toContain("requestParams.set");
    expect(details).toContain("setSelectedImage");
    expect(details).toContain("aria-pressed={selectedImage.id === image.id}");
    expect(details).toContain("vehicle-gallery__assurances");
    expect(details).toContain("mobile-request-bar");
    expect(details).toContain("<ExperienceMotion />");
    expect(details).toContain("vehicle-cinematic__image");
    expect(details).toContain("request-experience");
    expect(details).toContain("data-reveal");
    expect(details).toContain("The deposit is recorded at the branch");
    expect(details).not.toContain("online payment");
  });

  it("provides a non-persistent first reservation step with branch-only confirmation copy", () => {
    const arabicRoute = read("apps/web/app/reservation/page.tsx");
    const englishRoute = read("apps/web/app/en/reservation/page.tsx");

    expect(arabicRoute).toMatch(/<ReservationStart\s+locale="ar"/);
    expect(englishRoute).toMatch(/<ReservationStart\s+locale="en"/);
    expect(reservation).toContain("event.preventDefault()");
    expect(reservation).toContain("sends no real data");
    expect(reservation).toContain("deposit recording");
    expect(reservation).not.toContain('type="file"');
    expect(reservation).toContain("requestedPickup");
    expect(reservation).toContain("requestedReturn");
    expect(reservation).toContain("addDays(pickup || minimumDate, vehicle.minimumDays)");
  });
});
