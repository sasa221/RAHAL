"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  formatEgp,
  getPublicContent,
  localizedPath,
  publicVehicles,
  type PublicLocale,
  type PublicVehicle,
} from "../lib/public-content";
import { Footer, Header, Icon } from "./public-home";
import { ExperienceMotion } from "./experience-motion";

type PublicFleetProps = {
  locale: PublicLocale;
  pickup?: string;
  returnDate?: string;
  requestedDriver?: string;
  requestedCategory?: string;
};

const fleetCopy = {
  ar: {
    eyebrow: "أسطول رحال",
    title: "اختيار يليق بكل مشوار.",
    copy: "قارن المساحة والسعر ونظام السائق، ثم افتح تفاصيل العربية قبل إرسال طلبك للمراجعة.",
    demo: "الأسطول والأسعار الحالية بيانات عرض مؤقتة لحين إضافة سيارات رحال الفعلية.",
    filters: "فلتر الأسطول",
    filterHint: "ضيّق الاختيارات حسب احتياج رحلتك",
    showFilters: "عرض الفلاتر",
    hideFilters: "إخفاء الفلاتر",
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
    results: "سيارات مناسبة لاختيارك",
    clear: "مسح الاختيارات",
    emptyTitle: "مفيش عربية مطابقة للاختيارات دي",
    emptyCopy: "جرّب تغيّر الفئة أو السعر أو نظام السائق.",
    selectedDates: "الفترة المختارة",
    branchOnly: "الاستلام والإرجاع من فرع رحال فقط",
    currency: "كل الأسعار بالجنيه المصري",
    requestOnly: "الطلب يخضع لمراجعة المبيعات",
    from: "من",
    bags: "شنط",
    minimum: "أقل مدة",
    days: "أيام",
    compareNote: "السعر تقديري لليوم ولا يشمل عربون الفرع.",
  },
  en: {
    eyebrow: "THE RAHAL FLEET",
    title: "A considered car for every journey.",
    copy: "Compare space, price, and driver policy, then explore the full vehicle details before submitting a request for review.",
    demo: "The current fleet and prices are temporary display data until Rahal's real vehicles are added.",
    filters: "Filter the fleet",
    filterHint: "Narrow the selection around your journey",
    showFilters: "Show filters",
    hideFilters: "Hide filters",
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
    results: "vehicles selected for you",
    clear: "Clear selections",
    emptyTitle: "No vehicle matches these selections",
    emptyCopy: "Try changing the category, rate, or driver policy.",
    selectedDates: "Selected dates",
    branchOnly: "Pickup and return at the Rahal branch only",
    currency: "Every rate is shown in Egyptian pounds",
    requestOnly: "Every request is reviewed by sales",
    from: "From",
    bags: "bags",
    minimum: "Minimum",
    days: "days",
    compareNote: "The daily estimate excludes the branch deposit.",
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

function FleetListingCard({
  detailsQuery,
  locale,
  vehicle,
}: {
  detailsQuery: string;
  locale: PublicLocale;
  vehicle: PublicVehicle;
}) {
  const content = getPublicContent(locale);
  const copy = fleetCopy[locale];
  const detailsHref = `${localizedPath(locale, `/cars/${vehicle.id}`)}${
    detailsQuery ? `?${detailsQuery}` : ""
  }`;

  return (
    <article className="fleet-listing-card" data-reveal data-tilt>
      <a className="fleet-listing-card__visual" href={detailsHref} tabIndex={-1}>
        <Image
          alt={vehicle.imageAlt[locale]}
          fill
          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 40vw"
          src={vehicle.image}
        />
        <span
          className={`fleet-listing-card__status fleet-listing-card__status--${vehicle.status}`}
        >
          {vehicle.status === "available" ? content.available : content.review}
        </span>
        <span className="fleet-listing-card__index" aria-hidden="true">
          {vehicle.categoryKey === "economy" ? "01" : vehicle.categoryKey === "sedan" ? "02" : "03"}
        </span>
      </a>

      <div className="fleet-listing-card__body">
        <div className="fleet-listing-card__heading">
          <div>
            <span>{vehicle.category[locale]}</span>
            <h2>{vehicle.name[locale]}</h2>
          </div>
          <p className="fleet-listing-card__rate">
            <small>{copy.from}</small>
            <strong>{formatEgp(vehicle.dailyRateEgp, locale)}</strong>
            <span>/ {content.perDay}</span>
          </p>
        </div>

        <div
          className="fleet-listing-card__specs"
          aria-label={locale === "ar" ? "مواصفات العربية" : "Vehicle specifications"}
        >
          <span>
            <Icon name="users" size={17} />
            {vehicle.seats} {content.seats}
          </span>
          <span>
            <Icon name="car" size={17} />
            {vehicle.bags} {copy.bags}
          </span>
          <span>
            <Icon name="check" size={17} />
            {vehicle.transmission[locale]}
          </span>
        </div>

        <div className="fleet-listing-card__footer">
          <div>
            <strong>{vehicle.driverPolicy[locale]}</strong>
            <small>
              {copy.minimum} {vehicle.minimumDays} {copy.days} · {copy.compareNote}
            </small>
          </div>
          <a className="fleet-listing-card__link" href={detailsHref}>
            {content.viewDetails}
            <Icon name="arrow" size={18} />
          </a>
        </div>
      </div>
    </article>
  );
}

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fleetVehicles, setFleetVehicles] = useState<PublicVehicle[]>(publicVehicles);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFleet() {
      try {
        const response = await fetch("/api/vehicles", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = (await response.json()) as { data?: PublicVehicle[] };
        if (payload.data?.length) setFleetVehicles(payload.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    void loadFleet();
    return () => controller.abort();
  }, []);

  const vehicles = useMemo(() => {
    const filtered = fleetVehicles.filter((vehicle) => {
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
  }, [category, driver, fleetVehicles, maxPrice, seats, sort]);

  const selectedPickup = formatSelectedDate(pickup, locale);
  const selectedReturn = formatSelectedDate(returnDate, locale);
  const detailsQuery = new URLSearchParams(
    Object.entries({ pickup, return: returnDate, driver: requestedDriver }).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  ).toString();

  const categories = [
    ["all", copy.allCategories],
    ["economy", copy.economy],
    ["sedan", copy.sedan],
    ["suv", copy.suv],
  ] as const;

  function clearFilters() {
    setCategory("all");
    setSeats("all");
    setDriver("all");
    setMaxPrice("all");
    setSort("recommended");
  }

  return (
    <div
      className="public-site public-inner-page fleet-page"
      dir={content.dir}
      lang={content.htmlLang}
    >
      <ExperienceMotion />
      <a className="skip-link" href="#fleet-results">
        {content.skip}
      </a>
      <Header
        locale={locale}
        languageHref={localizedPath(locale === "ar" ? "en" : "ar", "/cars")}
      />

      <main>
        <section className="fleet-page-hero" data-scroll-scene>
          <div className="container fleet-page-hero__grid">
            <div className="fleet-page-hero__content">
              <span className="eyebrow">{copy.eyebrow}</span>
              <h1>{copy.title}</h1>
              <p>{copy.copy}</p>
              <div className="fleet-page-hero__facts">
                <span>
                  <Icon name="pin" size={18} />
                  {copy.branchOnly}
                </span>
                <span>
                  <Icon name="shield" size={18} />
                  {copy.requestOnly}
                </span>
              </div>
            </div>
            <div className="fleet-page-hero__visual" aria-hidden="true">
              <Image
                alt=""
                fill
                priority
                sizes="(max-width: 800px) 100vw, 46vw"
                src="/images/black-suv.jpg"
              />
              <span>RAHAL / 01</span>
            </div>
          </div>
          <div className="fleet-page-hero__ticker" aria-hidden="true">
            <span>EGP</span>
            <span>EGYPT</span>
            <span>BRANCH PICKUP</span>
            <span>SALES REVIEW</span>
          </div>
        </section>

        <section className="fleet-browser" data-scroll-scene id="fleet-results">
          <div className="container">
            <div className="fleet-category-chips" aria-label={copy.category}>
              {categories.map(([value, label]) => (
                <button
                  aria-pressed={category === value}
                  key={value}
                  onClick={() => setCategory(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="fleet-filter-heading">
              <div>
                <span>{copy.filters}</span>
                <small>{copy.filterHint}</small>
              </div>
              <button
                aria-expanded={filtersOpen}
                className="fleet-filter-toggle"
                onClick={() => setFiltersOpen((current) => !current)}
                type="button"
              >
                <Icon name="car" size={19} />
                {filtersOpen ? copy.hideFilters : copy.showFilters}
              </button>
            </div>

            <div className={`fleet-filter-panel${filtersOpen ? " fleet-filter-panel--open" : ""}`}>
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

              <button className="fleet-filter-panel__clear" onClick={clearFilters} type="button">
                {copy.clear}
              </button>
            </div>

            <div className="fleet-results__toolbar">
              <div>
                <p>
                  <strong>{String(vehicles.length).padStart(2, "0")}</strong>
                  <span>{copy.results}</span>
                </p>
                {selectedPickup && selectedReturn ? (
                  <small>
                    {copy.selectedDates}: {selectedPickup} — {selectedReturn}
                  </small>
                ) : (
                  <small>{copy.currency}</small>
                )}
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
              <div className="fleet-listing-grid">
                {vehicles.map((vehicle) => (
                  <FleetListingCard
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

            <p className="fleet-browser__disclaimer">
              <Icon name="shield" size={17} />
              {copy.demo}
            </p>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
