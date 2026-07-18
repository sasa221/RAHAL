"use client";

import { useState } from "react";
import {
  dateInputValue,
  getPublicContent,
  localizedPath,
  type PublicLocale,
  type PublicVehicle,
} from "../lib/public-content";
import { Footer, Header, Icon } from "./public-home";

const requestCopy = {
  ar: {
    title: "ابدأ طلب الحجز",
    copy: "راجع اختيار العربية وحدد المواعيد ونظام السائق. هذه معاينة للخطوة الأولى ولا ترسل بيانات حقيقية.",
    step: "الخطوة 1 من 6: المواعيد",
    vehicle: "العربية المختارة",
    pickup: "تاريخ الاستلام",
    return: "تاريخ الإرجاع",
    driver: "نظام السائق",
    optional: "أحدد لاحقًا مع المبيعات",
    withDriver: "أرغب في سائق",
    selfDrive: "بدون سائق",
    branch: "مكان الاستلام والإرجاع",
    branchValue: "فرع رحال فقط",
    review: "راجع الاختيارات",
    summary: "مراجعة الخطوة الأولى",
    notSubmitted: "لم يتم إرسال الطلب بعد",
    next: "الخطوات التالية ستشمل الحساب، بيانات العميل، رفع المستندات الآمن، الموافقة على الشروط والمراجعة النهائية.",
    notice:
      "الطلب لا يصبح حجزًا مؤكدًا إلا بعد مراجعة المبيعات والحضور للفرع وتسجيل العربون وتوقيع المستندات.",
    back: "العودة إلى تفاصيل العربية",
  },
  en: {
    title: "Start reservation request",
    copy: "Review the selected vehicle, dates, and driver option. This is a step-one preview and sends no real data.",
    step: "Step 1 of 6: rental dates",
    vehicle: "Selected vehicle",
    pickup: "Pickup date",
    return: "Return date",
    driver: "Driver option",
    optional: "Decide later with sales",
    withDriver: "I would like a driver",
    selfDrive: "Without driver",
    branch: "Pickup and return location",
    branchValue: "Rahal branch only",
    review: "Review selections",
    summary: "Step-one review",
    notSubmitted: "The request has not been submitted",
    next: "Next steps will cover the account, customer details, secure documents, consent, and final review.",
    notice:
      "A request becomes confirmed only after sales review, branch attendance, deposit recording, and signed documents.",
    back: "Back to vehicle details",
  },
} as const;

function formatReservationDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function ReservationStart({
  locale,
  vehicle,
}: {
  locale: PublicLocale;
  vehicle: PublicVehicle;
}) {
  const content = getPublicContent(locale);
  const copy = requestCopy[locale];
  const minimumDate = dateInputValue(1);
  const [pickup, setPickup] = useState(dateInputValue(2));
  const [returnDate, setReturnDate] = useState(dateInputValue(vehicle.minimumDays + 2));
  const [driver, setDriver] = useState(
    vehicle.driverPolicyKey === "self-drive" ? "self-drive" : "later",
  );
  const [reviewing, setReviewing] = useState(false);
  const alternateHref = `${localizedPath(locale === "ar" ? "en" : "ar", "/reservation")}?vehicle=${vehicle.id}`;

  return (
    <div className="public-site public-inner-page" dir={content.dir} lang={content.htmlLang}>
      <a className="skip-link" href="#reservation-main">
        {content.skip}
      </a>
      <Header locale={locale} languageHref={alternateHref} />

      <main className="reservation-page" id="reservation-main">
        <div className="container reservation-page__intro">
          <span className="eyebrow">{copy.step}</span>
          <h1>{copy.title}</h1>
          <p>{copy.copy}</p>
          <div className="reservation-progress" aria-label={copy.step}>
            {Array.from({ length: 6 }, (_, index) => (
              <span className={index === 0 ? "is-active" : ""} key={index} />
            ))}
          </div>
        </div>

        <div className="container reservation-layout">
          <form
            className="reservation-form"
            onSubmit={(event) => {
              event.preventDefault();
              setReviewing(true);
            }}
          >
            <div className="reservation-form__vehicle">
              <span>{copy.vehicle}</span>
              <strong>{vehicle.name[locale]}</strong>
              <small>{vehicle.driverPolicy[locale]}</small>
            </div>
            <div className="reservation-form__dates">
              <label className="field">
                <span>{copy.pickup}</span>
                <input
                  lang={content.htmlLang}
                  min={minimumDate}
                  onChange={(event) => {
                    setPickup(event.target.value);
                    setReviewing(false);
                  }}
                  required
                  type="date"
                  value={pickup}
                />
                <small className="field__localized">{formatReservationDate(pickup, locale)}</small>
              </label>
              <label className="field">
                <span>{copy.return}</span>
                <input
                  lang={content.htmlLang}
                  min={pickup || minimumDate}
                  onChange={(event) => {
                    setReturnDate(event.target.value);
                    setReviewing(false);
                  }}
                  required
                  type="date"
                  value={returnDate}
                />
                <small className="field__localized">
                  {formatReservationDate(returnDate, locale)}
                </small>
              </label>
            </div>
            <label className="field">
              <span>{copy.driver}</span>
              <select
                disabled={vehicle.driverPolicyKey === "self-drive"}
                onChange={(event) => {
                  setDriver(event.target.value);
                  setReviewing(false);
                }}
                value={driver}
              >
                {vehicle.driverPolicyKey === "self-drive" ? (
                  <option value="self-drive">{copy.selfDrive}</option>
                ) : (
                  <>
                    <option value="later">{copy.optional}</option>
                    <option value="with-driver">{copy.withDriver}</option>
                    <option value="self-drive">{copy.selfDrive}</option>
                  </>
                )}
              </select>
            </label>
            <label className="field">
              <span>{copy.branch}</span>
              <input disabled value={copy.branchValue} />
            </label>
            <button className="button button--gold" type="submit">
              {copy.review}
              <Icon name="arrow" size={18} />
            </button>
          </form>

          <aside className="reservation-assurance">
            <Icon name="shield" size={26} />
            <h2>{reviewing ? copy.summary : copy.notSubmitted}</h2>
            {reviewing ? (
              <dl>
                <div>
                  <dt>{copy.pickup}</dt>
                  <dd>{pickup}</dd>
                </div>
                <div>
                  <dt>{copy.return}</dt>
                  <dd>{returnDate}</dd>
                </div>
                <div>
                  <dt>{copy.driver}</dt>
                  <dd>
                    {driver === "with-driver"
                      ? copy.withDriver
                      : driver === "self-drive"
                        ? copy.selfDrive
                        : copy.optional}
                  </dd>
                </div>
              </dl>
            ) : null}
            <p>{copy.next}</p>
            <div className="reservation-assurance__notice">{copy.notice}</div>
            <a href={`${localizedPath(locale, "/cars")}/${vehicle.id}`}>{copy.back}</a>
          </aside>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
