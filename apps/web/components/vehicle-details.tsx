import Image from "next/image";
import {
  dateInputValue,
  formatEgp,
  getPublicContent,
  localizedPath,
  publicVehicles,
  type PublicLocale,
  type PublicVehicle,
} from "../lib/public-content";
import { Footer, Header, Icon } from "./public-home";

const detailsCopy = {
  ar: {
    back: "كل السيارات",
    available: "متاحة لتقديم طلب",
    review: "التوافر يحتاج مراجعة",
    daily: "السعر اليومي",
    weekly: "السعر الأسبوعي",
    estimate: "أقل تقدير للمدة المسموحة",
    estimateNote: "تقدير مبدئي قبل مراجعة المبيعات، ولا يشمل أي إضافات يحددها الفرع.",
    request: "ابدأ طلب الحجز",
    requestNotice: "إرسال الطلب لا يعني تأكيد الحجز",
    requestSteps: "المراجعة، الحضور للفرع، تسجيل العربون وتوقيع المستندات مطلوبة للتأكيد النهائي.",
    specifications: "مواصفات العربية",
    transmission: "ناقل الحركة",
    seats: "المقاعد",
    bags: "الحقائب",
    model: "الموديل",
    policies: "سياسات التأجير",
    driver: "نظام السائق",
    fuel: "سياسة الوقود",
    mileage: "حد الكيلومترات",
    minimum: "أقل مدة حجز",
    days: "أيام",
    availability: "تقويم التوافر التجريبي",
    availabilityCopy: "التقويم يوضح الحالة فقط ولا يعرض أي معلومات عن عملاء آخرين.",
    open: "متاح",
    unavailable: "غير متاح",
    branch: "الاستلام والإرجاع من فرع رحال فقط",
    private: "لا تظهر بيانات أو مستندات أي عميل داخل صفحة العربية.",
  },
  en: {
    back: "All vehicles",
    available: "Available to request",
    review: "Availability needs review",
    daily: "Daily rate",
    weekly: "Weekly rate",
    estimate: "Minimum-period estimate",
    estimateNote:
      "A preliminary estimate before sales review; branch-approved extras are not included.",
    request: "Start reservation request",
    requestNotice: "Submitting a request does not confirm a booking",
    requestSteps:
      "Sales review, branch attendance, deposit recording, and signed documents are required for final confirmation.",
    specifications: "Vehicle specifications",
    transmission: "Transmission",
    seats: "Seats",
    bags: "Bags",
    model: "Model",
    policies: "Rental policies",
    driver: "Driver policy",
    fuel: "Fuel policy",
    mileage: "Mileage allowance",
    minimum: "Minimum rental",
    days: "days",
    availability: "Demo availability calendar",
    availabilityCopy:
      "The calendar shows status only and never exposes information about other customers.",
    open: "Available",
    unavailable: "Unavailable",
    branch: "Pickup and return at the Rahal branch only",
    private: "No customer data or documents appear on a public vehicle page.",
  },
} as const;

function buildAvailability(locale: PublicLocale) {
  return Array.from({ length: 21 }, (_, index) => {
    const value = dateInputValue(index + 1);
    const date = new Date(`${value}T12:00:00`);
    return {
      value,
      day: new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
        weekday: "short",
      }).format(date),
      number: new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG").format(date.getDate()),
      available: index % 6 !== 4 && index % 7 !== 5,
    };
  });
}

export function VehicleDetails({
  locale,
  vehicle,
}: {
  locale: PublicLocale;
  vehicle: PublicVehicle;
}) {
  const content = getPublicContent(locale);
  const copy = detailsCopy[locale];
  const availability = buildAvailability(locale);
  const gallery = [vehicle, ...publicVehicles.filter((item) => item.id !== vehicle.id)];
  const requestHref = `${localizedPath(locale, "/reservation")}?vehicle=${vehicle.id}`;
  const alternateHref = `${localizedPath(locale === "ar" ? "en" : "ar", "/cars")}/${vehicle.id}`;

  return (
    <div className="public-site public-inner-page" dir={content.dir} lang={content.htmlLang}>
      <a className="skip-link" href="#vehicle-main">
        {content.skip}
      </a>
      <Header locale={locale} languageHref={alternateHref} />

      <main className="vehicle-details" id="vehicle-main">
        <div className="container">
          <nav className="breadcrumbs" aria-label={locale === "ar" ? "مسار الصفحة" : "Breadcrumb"}>
            <a href={localizedPath(locale)}>{locale === "ar" ? "الرئيسية" : "Home"}</a>
            <span aria-hidden="true">/</span>
            <a href={localizedPath(locale, "/cars")}>{copy.back}</a>
            <span aria-hidden="true">/</span>
            <span>{vehicle.name[locale]}</span>
          </nav>

          <div className="vehicle-details__heading">
            <div>
              <span className="eyebrow">{vehicle.category[locale]}</span>
              <h1>{vehicle.name[locale]}</h1>
            </div>
            <span className={`status-badge status-badge--${vehicle.status}`}>
              <span aria-hidden="true" />
              {vehicle.status === "available" ? copy.available : copy.review}
            </span>
          </div>

          <div className="vehicle-details__layout">
            <div>
              <div className="vehicle-gallery__main">
                <Image
                  alt={vehicle.imageAlt[locale]}
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 66vw"
                  src={vehicle.image}
                />
              </div>
              <div
                className="vehicle-gallery__thumbs"
                aria-label={locale === "ar" ? "صور العربية" : "Vehicle images"}
              >
                {gallery.map((image, index) => (
                  <div className={index === 0 ? "is-active" : ""} key={image.id}>
                    <Image alt="" fill sizes="180px" src={image.image} />
                  </div>
                ))}
              </div>
            </div>

            <aside className="request-summary" id="request-summary">
              <div className="request-summary__rates">
                <div>
                  <span>{copy.daily}</span>
                  <strong>{formatEgp(vehicle.dailyRateEgp, locale)}</strong>
                </div>
                <div>
                  <span>{copy.weekly}</span>
                  <strong>{formatEgp(vehicle.weeklyRateEgp, locale)}</strong>
                </div>
              </div>
              <div className="request-summary__estimate">
                <span>{copy.estimate}</span>
                <strong>{formatEgp(vehicle.dailyRateEgp * vehicle.minimumDays, locale)}</strong>
                <small>{copy.estimateNote}</small>
              </div>
              <div className="request-summary__branch">
                <Icon name="pin" size={18} />
                {copy.branch}
              </div>
              <a className="button button--gold" href={requestHref}>
                {copy.request}
                <Icon name="arrow" size={18} />
              </a>
              <div className="request-summary__notice">
                <Icon name="shield" size={19} />
                <div>
                  <strong>{copy.requestNotice}</strong>
                  <p>{copy.requestSteps}</p>
                </div>
              </div>
            </aside>
          </div>

          <section className="details-section" aria-labelledby="specifications-title">
            <div className="details-section__heading">
              <span className="eyebrow">RAHAL</span>
              <h2 id="specifications-title">{copy.specifications}</h2>
            </div>
            <div className="specification-grid">
              <article>
                <Icon name="clock" />
                <span>{copy.transmission}</span>
                <strong>{vehicle.transmission[locale]}</strong>
              </article>
              <article>
                <Icon name="users" />
                <span>{copy.seats}</span>
                <strong>{vehicle.seats}</strong>
              </article>
              <article>
                <Icon name="document" />
                <span>{copy.bags}</span>
                <strong>{vehicle.bags}</strong>
              </article>
              <article>
                <Icon name="car" />
                <span>{copy.model}</span>
                <strong>{vehicle.year}</strong>
              </article>
            </div>
          </section>

          <section className="details-section" aria-labelledby="policies-title">
            <div className="details-section__heading">
              <span className="eyebrow">
                {locale === "ar" ? "واضحة قبل الطلب" : "Clear before requesting"}
              </span>
              <h2 id="policies-title">{copy.policies}</h2>
            </div>
            <div className="policy-grid">
              <article>
                <Icon name="users" />
                <h3>{copy.driver}</h3>
                <p>{vehicle.driverPolicy[locale]}</p>
              </article>
              <article>
                <Icon name="car" />
                <h3>{copy.fuel}</h3>
                <p>{vehicle.fuelPolicy[locale]}</p>
              </article>
              <article>
                <Icon name="clock" />
                <h3>{copy.mileage}</h3>
                <p>{vehicle.mileagePolicy[locale]}</p>
              </article>
              <article>
                <Icon name="calendar" />
                <h3>{copy.minimum}</h3>
                <p>
                  {vehicle.minimumDays} {copy.days}
                </p>
              </article>
            </div>
          </section>

          <section
            className="details-section availability-calendar"
            aria-labelledby="availability-calendar-title"
          >
            <div className="details-section__heading details-section__heading--split">
              <div>
                <span className="eyebrow">
                  {locale === "ar" ? "بدون بيانات شخصية" : "No personal data"}
                </span>
                <h2 id="availability-calendar-title">{copy.availability}</h2>
                <p>{copy.availabilityCopy}</p>
              </div>
              <div className="calendar-legend">
                <span>
                  <i className="is-open" />
                  {copy.open}
                </span>
                <span>
                  <i className="is-unavailable" />
                  {copy.unavailable}
                </span>
              </div>
            </div>
            <div className="calendar-grid">
              {availability.map((day) => (
                <div className={day.available ? "is-open" : "is-unavailable"} key={day.value}>
                  <span>{day.day}</span>
                  <strong>{day.number}</strong>
                </div>
              ))}
            </div>
            <div className="privacy-note">
              <Icon name="shield" size={18} />
              {copy.private}
            </div>
          </section>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
