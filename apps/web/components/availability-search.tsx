"use client";

import { useState } from "react";
import { dateInputValue, getPublicContent, type PublicLocale } from "../lib/public-content";

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="icon" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="17" rx="2" />
      </g>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="icon" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="m9 18 6-6-6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function formatLocalDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function AvailabilitySearch({ locale }: { locale: PublicLocale }) {
  const content = getPublicContent(locale);
  const minimumDate = dateInputValue(1);
  const [pickupDate, setPickupDate] = useState(dateInputValue(2));
  const [returnDate, setReturnDate] = useState(dateInputValue(5));

  return (
    <section className="availability-wrap" aria-labelledby="availability-title">
      <form className="availability-form" action="#fleet">
        <div className="availability-form__intro">
          <span className="icon-box">
            <CalendarIcon />
          </span>
          <div>
            <h2 id="availability-title">{content.searchTitle}</h2>
            <p>{content.searchDescription}</p>
          </div>
        </div>
        <label className="field">
          <span>{content.pickup}</span>
          <input
            aria-describedby="pickup-localized"
            lang={content.htmlLang}
            min={minimumDate}
            name="pickup"
            onChange={(event) => setPickupDate(event.target.value)}
            required
            type="date"
            value={pickupDate}
          />
          <small className="field__localized" id="pickup-localized">
            {pickupDate ? formatLocalDate(pickupDate, locale) : content.dateHint}
          </small>
        </label>
        <label className="field">
          <span>{content.return}</span>
          <input
            aria-describedby="return-localized"
            lang={content.htmlLang}
            min={pickupDate || minimumDate}
            name="return"
            onChange={(event) => setReturnDate(event.target.value)}
            required
            type="date"
            value={returnDate}
          />
          <small className="field__localized" id="return-localized">
            {returnDate ? formatLocalDate(returnDate, locale) : content.dateHint}
          </small>
        </label>
        <label className="field">
          <span>{content.driver}</span>
          <select defaultValue="any" name="driver">
            <option value="any">{content.driverAny}</option>
            <option value="self">{content.driverSelf}</option>
            <option value="with-driver">{content.driverWith}</option>
          </select>
          <small className="field__localized">{content.searchDescription}</small>
        </label>
        <button className="button button--gold availability-form__submit" type="submit">
          {content.search}
          <ArrowIcon />
        </button>
      </form>
    </section>
  );
}
