"use client";

import Image from "next/image";
import { useState } from "react";
import {
  dateInputValue,
  formatEgp,
  getPublicContent,
  localizedPath,
  publicVehicles,
  type PublicLocale,
  type PublicVehicle,
} from "../lib/public-content";
import { ExperienceMotion } from "./experience-motion";
import { Footer, Header, Icon } from "./public-home";

const detailsCopy = {
  ar: {
    home: "الرئيسية",
    back: "كل السيارات",
    available: "متاحة لتقديم طلب",
    review: "التوافر يحتاج مراجعة",
    daily: "السعر اليومي",
    weekly: "السعر الأسبوعي",
    estimate: "أقل تقدير للمدة المسموحة",
    estimateNote: "تقدير مبدئي قبل مراجعة المبيعات، ولا يشمل أي إضافات يحددها الفرع.",
    request: "ابدأ طلب الحجز",
    requestNotice: "إرسال الطلب لا يعني تأكيد الحجز",
    requestSteps: "المراجعة والحضور للفرع وتسجيل العربون وتوقيع المستندات مطلوبة للتأكيد النهائي.",
    specifications: "العربية في أرقام",
    specificationsCopy: "المواصفات الأساسية اللي تساعدك تقارن اختيارك قبل إرسال الطلب.",
    transmission: "ناقل الحركة",
    seats: "المقاعد",
    bags: "الحقائب",
    model: "الموديل",
    policies: "كل التفاصيل قبل الطلب",
    policiesCopy: "سياسات واضحة من البداية، والتأكيد النهائي يتم مع فريق المبيعات داخل الفرع.",
    driver: "نظام السائق",
    fuel: "سياسة الوقود",
    mileage: "حد الكيلومترات",
    minimum: "أقل مدة حجز",
    days: "أيام",
    availability: "نظرة على التوافر",
    availabilityCopy: "التقويم توضيحي للحالة فقط، ولا يعرض أي معلومات عن عملاء آخرين.",
    open: "متاح",
    unavailable: "غير متاح",
    branch: "الاستلام والإرجاع من فرع رحال فقط",
    private: "لا تظهر بيانات أو مستندات أي عميل داخل صفحة العربية.",
    salesReview: "فريق المبيعات يراجع كل طلب",
    egpOnly: "الأسعار بالجنيه المصري فقط",
    gallery: "صور العربية",
    showImage: "عرض صورة",
    selectedImage: "الصورة المختارة",
    from: "من",
    perDay: "في اليوم",
    priceNote: "العربون يسجل داخل الفرع.",
    clearBefore: "واضحة قبل الطلب",
    noPersonalData: "بدون بيانات شخصية",
    heroCopy: "راحة محسوبة، حضور واضح، وتفاصيل تعرفها قبل ما تبدأ طلبك.",
    requestEyebrow: "طلب واضح من البداية",
    requestTitle: "اختيارك جاهز للمراجعة.",
    requestCopy:
      "راجع التقدير، وبعدها ابعت الطلب لفريق المبيعات عشان يتأكد من التوافر ويتواصل معك.",
    explore: "اكتشف التفاصيل",
  },
  en: {
    home: "Home",
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
    specifications: "The vehicle in numbers",
    specificationsCopy: "The essentials you need to compare your choice before sending a request.",
    transmission: "Transmission",
    seats: "Seats",
    bags: "Bags",
    model: "Model",
    policies: "Every detail before requesting",
    policiesCopy:
      "Clear policies from the start, with final confirmation handled by the sales team at the branch.",
    driver: "Driver policy",
    fuel: "Fuel policy",
    mileage: "Mileage allowance",
    minimum: "Minimum rental",
    days: "days",
    availability: "A view of availability",
    availabilityCopy:
      "The calendar illustrates status only and never exposes information about other customers.",
    open: "Available",
    unavailable: "Unavailable",
    branch: "Pickup and return at the Rahal branch only",
    private: "No customer data or documents appear on a public vehicle page.",
    salesReview: "Every request is reviewed by sales",
    egpOnly: "Rates are shown in Egyptian pounds only",
    gallery: "Vehicle gallery",
    showImage: "Show image",
    selectedImage: "Selected image",
    from: "From",
    perDay: "per day",
    priceNote: "The deposit is recorded at the branch.",
    clearBefore: "Clear before requesting",
    noPersonalData: "No personal data",
    heroCopy: "Considered comfort, confident presence, and every detail clear before you request.",
    requestEyebrow: "A CLEAR REQUEST FROM THE START",
    requestTitle: "Your selection, ready for review.",
    requestCopy:
      "Review the estimate, then send your request to the sales team to confirm availability and contact you.",
    explore: "Explore the details",
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
  pickup,
  returnDate,
  requestedDriver,
}: {
  locale: PublicLocale;
  vehicle: PublicVehicle;
  pickup?: string;
  returnDate?: string;
  requestedDriver?: string;
}) {
  const content = getPublicContent(locale);
  const copy = detailsCopy[locale];
  const availability = buildAvailability(locale);
  const gallery = [vehicle, ...publicVehicles.filter((item) => item.id !== vehicle.id)];
  const [selectedImage, setSelectedImage] = useState(vehicle);
  const selectionParams = new URLSearchParams();
  if (pickup) selectionParams.set("pickup", pickup);
  if (returnDate) selectionParams.set("return", returnDate);
  if (requestedDriver) selectionParams.set("driver", requestedDriver);
  const selectionQuery = selectionParams.toString();
  const requestParams = new URLSearchParams(selectionParams);
  requestParams.set("vehicle", vehicle.id);
  const requestHref = `${localizedPath(locale, "/reservation")}?${requestParams.toString()}`;
  const alternateHref = `${localizedPath(locale === "ar" ? "en" : "ar", "/cars")}/${vehicle.id}${selectionQuery ? `?${selectionQuery}` : ""}`;
  const fleetHref = `${localizedPath(locale, "/cars")}${selectionQuery ? `?${selectionQuery}` : ""}`;

  return (
    <div
      className="public-site public-inner-page vehicle-detail-page"
      dir={content.dir}
      lang={content.htmlLang}
    >
      <ExperienceMotion />
      <a className="skip-link" href="#vehicle-main">
        {content.skip}
      </a>
      <Header locale={locale} languageHref={alternateHref} />

      <main className="vehicle-details" id="vehicle-main">
        <section className="vehicle-cinematic vehicle-gallery__main">
          <Image
            alt={selectedImage.imageAlt[locale]}
            className="vehicle-cinematic__image"
            fill
            priority
            sizes="100vw"
            src={selectedImage.image}
          />
          <span className="vehicle-cinematic__overlay" aria-hidden="true" />
          <span className="vehicle-cinematic__grain" aria-hidden="true" />
          <span className="vehicle-cinematic__grid" aria-hidden="true" />

          <div className="container vehicle-cinematic__inner">
            <nav
              className="breadcrumbs"
              aria-label={locale === "ar" ? "مسار الصفحة" : "Breadcrumb"}
            >
              <a href={localizedPath(locale)}>{copy.home}</a>
              <span aria-hidden="true">/</span>
              <a href={fleetHref}>{copy.back}</a>
              <span aria-hidden="true">/</span>
              <span>{vehicle.name[locale]}</span>
            </nav>

            <div className="vehicle-cinematic__content">
              <div className="vehicle-cinematic__kicker">
                <span className="eyebrow">{vehicle.category[locale]} / RAHAL</span>
                <span className={`status-badge status-badge--${vehicle.status}`}>
                  <span aria-hidden="true" />
                  {vehicle.status === "available" ? copy.available : copy.review}
                </span>
              </div>
              <h1>{vehicle.name[locale]}</h1>
              <p>{copy.heroCopy}</p>
              <div className="vehicle-cinematic__action">
                <p>
                  <small>{copy.from}</small>
                  <strong>{formatEgp(vehicle.dailyRateEgp, locale)}</strong>
                  <span>{copy.perDay}</span>
                </p>
                <a href={requestHref}>
                  {copy.request}
                  <Icon name="arrow" size={18} />
                </a>
              </div>
            </div>

            <div className="vehicle-gallery__thumbs" aria-label={copy.gallery}>
              {gallery.map((image, index) => (
                <button
                  aria-label={`${copy.showImage}: ${image.name[locale]}`}
                  aria-pressed={selectedImage.id === image.id}
                  className={selectedImage.id === image.id ? "is-active" : ""}
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  type="button"
                >
                  <Image alt="" fill sizes="130px" src={image.image} />
                  <span aria-hidden="true">0{index + 1}</span>
                </button>
              ))}
            </div>

            <span className="vehicle-gallery__caption">
              {copy.selectedImage} / {selectedImage.name[locale]}
            </span>
            <a className="vehicle-cinematic__scroll" href="#vehicle-story">
              <span aria-hidden="true" />
              {copy.explore}
            </a>
          </div>
        </section>

        <section className="vehicle-story" id="vehicle-story" data-reveal>
          <div className="container vehicle-gallery__assurances">
            <span>
              <Icon name="pin" size={18} />
              {copy.branch}
            </span>
            <span>
              <Icon name="shield" size={18} />
              {copy.salesReview}
            </span>
            <span>
              <Icon name="check" size={18} />
              {copy.egpOnly}
            </span>
          </div>
        </section>

        <div className="container">
          <section className="request-experience" id="request-summary" data-reveal>
            <div className="request-experience__intro">
              <span className="eyebrow">{copy.requestEyebrow}</span>
              <h2>{copy.requestTitle}</h2>
              <p>{copy.requestCopy}</p>
              <div className="request-summary__notice">
                <Icon name="shield" size={19} />
                <div>
                  <strong>{copy.requestNotice}</strong>
                  <p>{copy.requestSteps}</p>
                </div>
              </div>
            </div>

            <div className="request-experience__price">
              <span>RAHAL / REQUEST</span>
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
              <a className="button button--gold" href={requestHref}>
                {copy.request}
                <Icon name="arrow" size={18} />
              </a>
              <small className="request-summary__payment-note">{copy.priceNote}</small>
            </div>
          </section>

          <section
            className="details-section details-section--specs"
            aria-labelledby="specifications-title"
            data-reveal
          >
            <div className="details-section__heading details-section__heading--editorial">
              <div>
                <span className="eyebrow">RAHAL / SPECIFICATION</span>
                <h2 id="specifications-title">{copy.specifications}</h2>
              </div>
              <p>{copy.specificationsCopy}</p>
            </div>
            <div className="specification-grid">
              {[
                ["01", "clock", copy.transmission, vehicle.transmission[locale]],
                ["02", "users", copy.seats, String(vehicle.seats)],
                ["03", "document", copy.bags, String(vehicle.bags)],
                ["04", "car", copy.model, String(vehicle.year)],
              ].map(([number, icon, label, value]) => (
                <article key={String(label)}>
                  <span className="specification-grid__number">{number}</span>
                  <Icon name={icon as "clock" | "users" | "document" | "car"} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section
            className="details-section details-section--policies"
            aria-labelledby="policies-title"
            data-reveal
          >
            <div className="details-section__heading details-section__heading--editorial">
              <div>
                <span className="eyebrow">{copy.clearBefore}</span>
                <h2 id="policies-title">{copy.policies}</h2>
              </div>
              <p>{copy.policiesCopy}</p>
            </div>
            <div className="policy-grid">
              {[
                ["01", "users", copy.driver, vehicle.driverPolicy[locale]],
                ["02", "car", copy.fuel, vehicle.fuelPolicy[locale]],
                ["03", "clock", copy.mileage, vehicle.mileagePolicy[locale]],
                ["04", "calendar", copy.minimum, `${vehicle.minimumDays} ${copy.days}`],
              ].map(([number, icon, title, description]) => (
                <article key={String(title)}>
                  <span className="policy-grid__number">{number}</span>
                  <Icon name={icon as "users" | "car" | "clock" | "calendar"} />
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section
            className="details-section availability-calendar"
            aria-labelledby="availability-calendar-title"
            data-reveal
          >
            <div className="details-section__heading details-section__heading--split">
              <div>
                <span className="eyebrow">{copy.noPersonalData}</span>
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

      <div className="mobile-request-bar">
        <p>
          <small>{copy.from}</small>
          <strong>{formatEgp(vehicle.dailyRateEgp, locale)}</strong>
        </p>
        <a href={requestHref}>{copy.request}</a>
      </div>

      <Footer locale={locale} />
    </div>
  );
}
