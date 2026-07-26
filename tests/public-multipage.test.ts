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
  const auth = read("apps/web/components/auth-access.tsx");

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
    expect(fleet).toContain("useState<PublicVehicle[]>(publicVehicles)");
    expect(fleet).toContain('fetch("/api/vehicles"');
    expect(fleet).toContain("fleetVehicles.filter");
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
      expect(read(route)).toContain("getPublicVehicle(slug)");
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

  it("persists a safe first-step draft without claiming a confirmed booking", () => {
    const arabicRoute = read("apps/web/app/reservation/page.tsx");
    const englishRoute = read("apps/web/app/en/reservation/page.tsx");

    expect(arabicRoute).toMatch(/<ReservationStart\s+locale="ar"/);
    expect(englishRoute).toMatch(/<ReservationStart\s+locale="en"/);
    expect(reservation).toContain("event.preventDefault()");
    expect(reservation).toContain('fetch("/api/reservations/drafts"');
    expect(reservation).toContain("/customer-details`");
    expect(reservation).toContain("/consent-policies/${locale}");
    expect(reservation).toContain("/consents`");
    expect(reservation).toContain('credentials: "include"');
    expect(reservation).toContain("This is only a draft");
    expect(reservation).toContain("It is not a submitted request or a confirmed booking");
    expect(reservation).toContain("deposit recording");
    expect(reservation).toContain('type="file"');
    expect(reservation).toContain("allowedMimeTypes");
    expect(reservation).toContain("No permanent URL or identity number");
    expect(reservation).not.toContain("identityNumber");
    expect(reservation).not.toContain("passportNumber");
    expect(reservation).toContain("emailMasked");
    expect(reservation).toContain("phoneMasked");
    expect(reservation).toContain("marketingAccepted");
    expect(reservation).toContain("developmentOnly");
    expect(reservation).toContain('type="checkbox"');
    expect(reservation).toContain("requestedPickup");
    expect(reservation).toContain("requestedReturn");
    expect(reservation).toContain("addDays(pickup || minimumDate, vehicle.minimumDays)");
    expect(reservation).toContain("<ExperienceMotion />");
    expect(reservation).toContain("reservation-stage__visual");
    expect(reservation).toContain("reservation-form__options");
    expect(reservation).toContain('aria-live="polite"');
    expect(reservation).toContain("/review`");
    expect(reservation).toContain("/submit`");
    expect(reservation).toContain('status: "PENDING_REVIEW"');
    expect(reservation).toContain("This is not a confirmed booking yet");
    expect(reservation).toContain("There is no online payment");
    expect(reservation).toContain("APPROVED_POLICY_REQUIRED");
    expect(reservation).not.toContain("storageKey");
  });

  it("provides shared bilingual account access without exposing protected identity data", () => {
    const arabicRoute = read("apps/web/app/auth/page.tsx");
    const englishRoute = read("apps/web/app/en/auth/page.tsx");
    const home = read("apps/web/components/public-home.tsx");
    const accountEntry = read("apps/web/components/account-entry-link.tsx");
    const nextConfig = read("apps/web/next.config.ts");

    expect(arabicRoute).toMatch(/<AuthAccess\s+locale="ar"/);
    expect(englishRoute).toMatch(/<AuthAccess\s+locale="en"/);
    expect(auth).toContain('/api/auth/${mode === "login" ? "login" : "register"}');
    expect(auth).toContain('credentials: "include"');
    expect(auth).toContain('autoComplete={mode === "login" ? "current-password" : "new-password"}');
    expect(auth).toContain('minLength={mode === "register" ? 8 : 1}');
    expect(auth).toContain("At least 8 characters");
    expect(auth).toContain('className="auth-success auth-panel"');
    expect(auth).not.toContain('className="auth-success" aria-live="polite" data-reveal');
    expect(auth).toContain('document.getElementById("auth-workspace")?.scrollIntoView');
    expect(auth).toContain('pattern="\\+?[1-9][0-9]{7,14}"');
    expect(auth).toContain("Phone and email verification are required");
    expect(auth).not.toContain("identityNumber");
    expect(auth).not.toContain('type="file"');
    expect(home).toContain("AccountEntryLink");
    expect(accountEntry).toContain('localizedPath(locale, "/auth")');
    expect(accountEntry).toContain('session.user.role === "CUSTOMER"');
    expect(home).not.toContain('aria-disabled="true"');
    expect(nextConfig).toContain('source: "/api/:path*"');
    expect(nextConfig).toContain("devIndicators: false");
    expect(auth).toContain('fetch("/api/auth/verification/request"');
    expect(auth).toContain('fetch("/api/auth/verification/confirm"');
    expect(auth).toContain('fetch("/api/auth/session"');
    expect(auth).toContain('method: "DELETE"');
    expect(auth).toContain("Sign out");
    expect(auth).toContain('className="auth-success__actions"');
    expect(auth).toContain('autoComplete="one-time-code"');
    expect(auth).not.toContain("developmentCode");
    expect(auth).not.toContain("Local development code");
    expect(auth).toContain("verificationUnavailable");
  });
});
