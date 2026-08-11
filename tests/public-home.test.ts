import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { formatEgp, getPublicContent, publicVehicles } from "../apps/web/lib/public-content";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("Milestone 2 public home", () => {
  const component = read("apps/web/components/public-home.tsx");
  const availability = read("apps/web/components/availability-search.tsx");
  const motion = read("apps/web/components/experience-motion.tsx");
  const styles = read("apps/web/app/globals.css");

  it("shares navigation and valid language switching between locales", () => {
    const arabic = getPublicContent("ar");
    const english = getPublicContent("en");

    expect(arabic.dir).toBe("rtl");
    expect(english.dir).toBe("ltr");
    expect(arabic.languageHref).toBe("/en");
    expect(english.languageHref).toBe("/");
    expect(arabic.nav.map(([, href]) => href)).toEqual(english.nav.map(([, href]) => href));
  });

  it("uses one typed fleet and EGP formatting for both languages", () => {
    expect(publicVehicles).toHaveLength(3);
    expect(publicVehicles.every((vehicle) => vehicle.dailyRateEgp > 0)).toBe(true);
    expect(formatEgp(4500, "en")).toContain("EGP");
    expect(formatEgp(4500, "ar")).not.toContain("$");
  });

  it("loads the home and detail fleet from the deployed API with a safe local fallback", () => {
    const publicApi = read("apps/web/lib/public-api.ts");
    expect(component).toContain("await getPublicVehicles()");
    expect(publicApi).toContain("process.env.API_URL");
    expect(publicApi).toContain("export async function getPublicVehicles");
    expect(publicApi).toContain("return publicVehicles");
  });

  it("presents one lead vehicle with supporting fleet choices", () => {
    expect(component).toContain('vehicle.id === "graphite-suv"');
    expect(component).toContain('className="fleet-showcase"');
    expect(component).toContain('className="fleet-showcase__supporting"');
    expect(component).toContain("<VehicleCard featured");
    expect(component).toContain("<VehicleCard compact");
  });

  it("uses a local photographic gallery for every vehicle category", () => {
    expect(component).toContain("const categoryImages");
    expect(component).toContain('className="category-card__image"');
    expect(component).toContain('className="category-card__overlay"');
    expect(component).toContain('className="category-card__content"');
    expect(styles).toContain("grid-template-columns: repeat(12, minmax(0, 1fr))");
  });

  it("makes the reservation-request boundary explicit in the four-step journey", () => {
    expect(getPublicContent("en").processNotice).toContain("does not confirm");
    expect(getPublicContent("ar").processNotice).toContain("لا يعني");
    expect(component).toContain('className="process-notice"');
    expect(component).toContain('className="process-list__kicker"');
    expect(component).toContain('role="note"');
  });

  it("provides dedicated mobile interaction for trust, branch, and footer content", () => {
    const branchSurface = read("apps/web/components/public-branch-surface.tsx");
    expect(component).toContain('className="trust-card__visual"');
    expect(component).toContain('className="trust-card__visual-line"');
    expect(branchSurface).toContain('className="branch-facts"');
    expect(component).toContain("<PublicBranchSurface locale={locale} />");
    expect(component).toContain("footer-statement");
    expect(styles).toContain("scroll-snap-type: inline mandatory");
    expect(styles).toContain("overscroll-behavior-inline: contain");
    expect(styles).toContain("min-width: min(82vw, 330px)");
  });

  it("uses touch feedback instead of sticky hover motion on coarse pointers", () => {
    expect(styles).toContain("@media (pointer: coarse)");
    expect(styles).toContain(".category-card:active .category-card__image");
    expect(styles).toContain(".footer-statement > a:active");
    expect(styles).toContain("transition-duration: 580ms");
  });

  it("includes desktop and mobile navigation with accessible labels", () => {
    expect(component).toContain('className="desktop-navigation"');
    expect(component).toContain('className="mobile-menu"');
    expect(component).toContain("aria-label={content.menuLabel}");
    expect(component).toContain("aria-label={content.navigationLabel}");
  });

  it("requires both dates and generates relative date constraints", () => {
    expect(availability).toMatch(/name="pickup"[\s\S]*?required[\s\S]*?type="date"/);
    expect(availability).toMatch(/name="return"[\s\S]*?required[\s\S]*?type="date"/);
    expect(availability).toContain("dateInputValue(1)");
    expect(availability).toContain("dateInputValue(5)");
    expect(availability).toContain("formatLocalDate");
    expect(availability).toContain('"ar-EG"');
  });

  it("uses the official transparent Rahal mark and local photographic assets", () => {
    expect(component).toContain('src="/images/rahal-logo.png"');
    expect(component).toContain('className="rahal-logo__image"');
    expect(component).not.toContain("rahal-logo__crown");
    expect(component).not.toContain("car-silhouette");
    expect(component).not.toContain("brand-mark");

    for (const image of [
      "rahal-logo.png",
      "rahal-hero-gem.png",
      "rahal-hero-gem-clean.png",
      "silver-sedan.jpg",
      "black-suv.jpg",
      "white-sedan.jpg",
    ]) {
      const path = join(root, "apps/web/public/images", image);
      expect(existsSync(path)).toBe(true);
      expect(statSync(path).size).toBeGreaterThan(50_000);
    }
  });

  it("defines overflow protection and all target responsive ranges", () => {
    expect(styles).toContain("overflow-x: clip");
    expect(styles).toContain("@media (max-width: 1100px)");
    expect(styles).toContain("@media (max-width: 900px)");
    expect(styles).toContain("@media (max-width: 680px)");
    expect(styles).toContain("@media (min-width: 1600px)");
  });

  it("progressively enhances the home with accessible premium motion", () => {
    expect(component).toContain("<ExperienceMotion />");
    expect(component).toContain("data-tilt");
    expect(component).toContain("hero__edition");
    expect(motion).toContain("IntersectionObserver");
    expect(motion).toContain("MutationObserver");
    expect(motion).toContain("requestAnimationFrame(updateAmbientMotion)");
    expect(motion).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(motion).toContain('matchMedia("(pointer: fine)")');
    expect(styles).toContain("@keyframes rahal-hero-enter");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the optimized 3D drive scene decorative, adaptive, and idle-safe", () => {
    const driveScene = read("apps/web/components/cinematic-car-3d.tsx");
    const modelPath = join(root, "apps/web/public/models/rahal-drive-scene.rahal3d");

    expect(component).toContain("<CinematicDriveCar locale={locale} />");
    expect(component).toContain('src="/images/rahal-hero-gem-clean.png"');
    expect(driveScene).toContain('aria-hidden="true"');
    expect(driveScene).toContain('powerPreference: "high-performance"');
    expect(driveScene).toContain("smokeParticles");
    expect(driveScene).toContain("activeUntil");
    expect(driveScene).toContain("animationFrame = undefined");
    expect(driveScene).toContain("renderer.shadowMap.enabled = window.innerWidth >= 720");
    expect(driveScene).toContain("requestIdleCallback");
    expect(driveScene).toContain("RHL3D1");
    expect(styles).toContain(".hero__drive-car--ready");
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hero__drive-car[\s\S]*?display: none/,
    );
    expect(existsSync(modelPath)).toBe(true);
    expect(statSync(modelPath).size).toBeLessThan(8_000_000);
  });
});
