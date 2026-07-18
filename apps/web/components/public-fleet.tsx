"use client";

import { useMemo, useState } from "react";
import {
  formatEgp,
  getPublicContent,
  localizedPath,
  publicVehicles,
  type PublicLocale,
} from "../lib/public-content";
import { Footer, Header, Icon, VehicleCard } from "./public-home";

type PublicFleetProps = {
  locale: PublicLocale;
  pickup?: string;
  returnDate?: string;
  requestedDriver?: string;
  requestedCategory?: string;
};

const fleetCopy = {
  ar: {
    eyebrow: "أسطول رحال التجريبي",
    title: "اختار العربية المناسبة لرحلتك",
    copy: "فلتر حسب احتياجك، راجع السعر التقديري، وافتح تفاصيل العربية وتقويم التوافر.",
    demo: "السيارات والأسعار المعروضة بيانات تجريبية لحين إضافة أسطول رحال الفعلي.",
    filters: "تصفية النتائج",
    category: "الفئة",
    allCategories: "كل الفئات",
    economy: "اقتصادية",
    sedan: "سيدان",
    suv: "دفع رباعي",
    seats: "عدد المقاعد",
    allSeats: "أي عدد",
    driver: "نظام السائق",
    allDrivers: "كل الأنظمة",
    optionalDriver: "السائق اختياري",
    selfDrive: "بدون سائق",
    maxPrice: "أقصى سعر يومي",
    anyPrice: "أي سعر",
    sort: "الترتيب",
    recommended: "الموصى بها",
    lowPrice: "السعر: الأقل أولًا",
    highPrice: "السعر: الأعلى أولًا",
    results: "سيارات مطابقة",
    clear: "مسح الفلاتر",
    emptyTitle: "لا توجد سيارات مطابقة",
    emptyCopy: "جرّب تغيير الفئة أو السعر أو نظام السائق.",
    selectedDates: "الفترة المختارة",
    branchOnly: "الاستلام والإرجاع من فرع رحال فقط",
  },
  en: {
    eyebrow: "Rahal demo fleet",
    title: "Choose the right car for your journey",
    copy: "Filter by what matters, review the estimate, then open vehicle details and availability.",
    demo: "Vehicles and prices are fictional demo data until the real Rahal fleet is added.",
    filters: "Filter results",
    category: "Category",
    allCategories: "All categories",
    economy: "Economy",
    sedan: "Sedan",
    suv: "SUV",
    seats: "Seats",
    allSeats: "Any seats",
    driver: "Driver policy",
    allDrivers: "All policies",
    optionalDriver: "Optional driver",
    selfDrive: "Self-drive only",
    maxPrice: "Maximum daily rate",
    anyPrice: "Any price",
    sort: "Sort by",
    recommended: "Recommended",
    lowPrice: "Price: low to high",
    highPrice: "Price: high to low",
    results: "matching vehicles",
    clear: "Clear filters",
    emptyTitle: "No matching vehicles",
    emptyCopy: "Try changing the category, price, or driver policy.",
    selectedDates: "Selected dates",
    branchOnly: "Pickup and return at the Rahal branch only",
  },
} as const;

function formatSelectedDate(value: string | undefined, locale: PublicLocale) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const validCategories = new Set(["economy", "sedan", "suv"]);

export function PublicFleet({
  locale,
  pickup,
  returnDate,
  requestedDriver,
  requestedCategory,
}: PublicFleetProps) {
  const content = getPublicContent(locale);
  const copy = fleetCopy[locale];
  const [category, setCategory] = useState(
    requestedCategory && validCategories.has(requestedCategory) ? requestedCategory : "all",
  );
  const [seats, setSeats] = useState("all");
  const [driver, setDriver] = useState(
    requestedDriver === "with-driver"
      ? "optional"
      : requestedDriver === "self"
        ? "self-drive"
        : "all",
  );
  const [maxPrice, setMaxPrice] = useState("all");
  const [sort, setSort] = useState("recommended");

  const vehicles = useMemo(() => {
    const filtered = publicVehicles.filter((vehicle) => {
      if (category !== "all" && vehicle.categoryKey !== category) return false;
      if (seats !== "all" && vehicle.seats < Number(seats)) return false;
      if (driver !== "all" && vehicle.driverPolicyKey !== driver) return false;
      if (maxPrice !== "all" && vehicle.dailyRateEgp > Number(maxPrice)) return false;
      return true;
    });

    return [...filtered].sort((first, second) => {
      if (sort === "price-low") return first.dailyRateEgp - second.dailyRateEgp;
      if (sort === "price-high") return second.dailyRateEgp - first.dailyRateEgp;
      return Number(second.status === "available") - Number(first.status === "available");
    });
  }, [category, driver, maxPrice, seats, sort]);

  const selectedPickup = formatSelectedDate(pickup, locale);
  const selectedReturn = formatSelectedDate(returnDate, locale);
  const detailsQuery = new URLSearchParams(
    Object.entries({ pickup, return: returnDate, driver: requestedDriver }).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  ).toString();

  function clearFilters() {
    setCategory("all");
    setSeats("all");
    setDriver("all");
    setMaxPrice("all");
    setSort("recommended");
  }

  return (
    <div className="public-site public-inner-page" dir={content.dir} lang={content.htmlLang}>
      <a className="skip-link" href="#fleet-results">
        {content.skip}
      </a>
      <Header
        locale={locale}
        languageHref={localizedPath(locale === "ar" ? "en" : "ar", "/cars")}
      />

      <main>
        <section className="inner-hero">
          <div className="container inner-hero__content">
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.copy}</p>
            <div className="inner-hero__notes">
              <span>
                <Icon name="pin" size={17} />
                {copy.branchOnly}
              </span>
              <span>
                <Icon name="shield" size={17} />
                {copy.demo}
              </span>
            </div>
          </div>
        </section>

        <section className="fleet-browser section" id="fleet-results">
          <div className="container fleet-browser__layout">
            <aside className="fleet-filters" aria-label={copy.filters}>
              <div className="fleet-filters__heading">
                <Icon name="car" />
                <h2>{copy.filters}</h2>
              </div>

              <label className="field">
                <span>{copy.category}</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="all">{copy.allCategories}</option>
                  <option value="economy">{copy.economy}</option>
                  <option value="sedan">{copy.sedan}</option>
                  <option value="suv">{copy.suv}</option>
                </select>
              </label>

              <label className="field">
                <span>{copy.seats}</span>
                <select value={seats} onChange={(event) => setSeats(event.target.value)}>
                  <option value="all">{copy.allSeats}</option>
                  <option value="5">5+</option>
                  <option value="7">7+</option>
                </select>
              </label>

              <label className="field">
                <span>{copy.driver}</span>
                <select value={driver} onChange={(event) => setDriver(event.target.value)}>
                  <option value="all">{copy.allDrivers}</option>
                  <option value="optional">{copy.optionalDriver}</option>
                  <option value="self-drive">{copy.selfDrive}</option>
                </select>
              </label>

              <label className="field">
                <span>{copy.maxPrice}</span>
                <select value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}>
                  <option value="all">{copy.anyPrice}</option>
                  {[2500, 5000, 6000].map((price) => (
                    <option key={price} value={price}>
                      {formatEgp(price, locale)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="button button--outline fleet-filters__clear"
                onClick={clearFilters}
                type="button"
              >
                {copy.clear}
              </button>
            </aside>

            <div className="fleet-results">
              <div className="fleet-results__toolbar">
                <div>
                  <strong>{vehicles.length}</strong> {copy.results}
                  {selectedPickup && selectedReturn ? (
                    <small>
                      {copy.selectedDates}: {selectedPickup} — {selectedReturn}
                    </small>
                  ) : null}
                </div>
                <label>
                  <span>{copy.sort}</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value)}>
                    <option value="recommended">{copy.recommended}</option>
                    <option value="price-low">{copy.lowPrice}</option>
                    <option value="price-high">{copy.highPrice}</option>
                  </select>
                </label>
              </div>

              {vehicles.length ? (
                <div className="vehicle-grid vehicle-grid--listing">
                  {vehicles.map((vehicle) => (
                    <VehicleCard
                      detailsQuery={detailsQuery}
                      key={vehicle.id}
                      locale={locale}
                      vehicle={vehicle}
                    />
                  ))}
                </div>
              ) : (
                <div className="fleet-empty">
                  <Icon name="car" size={32} />
                  <h2>{copy.emptyTitle}</h2>
                  <p>{copy.emptyCopy}</p>
                  <button className="button button--dark" onClick={clearFilters} type="button">
                    {copy.clear}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
