"use client";

import type { BranchWorkingHours } from "@rahal/contracts";
import type { PublicLocale } from "../lib/public-content";

const dayLabels = {
  ar: {
    SATURDAY: "السبت",
    SUNDAY: "الأحد",
    MONDAY: "الاثنين",
    TUESDAY: "الثلاثاء",
    WEDNESDAY: "الأربعاء",
    THURSDAY: "الخميس",
    FRIDAY: "الجمعة",
  },
  en: {
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
  },
} as const;

export function BranchHoursEditor({
  locale,
  value,
  onChange,
}: {
  locale: PublicLocale;
  value: BranchWorkingHours;
  onChange(value: BranchWorkingHours): void;
}) {
  const patchDay = (index: number, patch: Partial<BranchWorkingHours["weekly"][number]>) =>
    onChange({
      ...value,
      weekly: value.weekly.map((day, current) => (current === index ? { ...day, ...patch } : day)),
    });
  return (
    <section className="branch-hours-editor">
      <header>
        <h3>{locale === "ar" ? "ساعات العمل الأسبوعية" : "Weekly working hours"}</h3>
        <span>Africa/Cairo</span>
      </header>
      {value.weekly.map((day, index) => (
        <div className="branch-hours-editor__day" key={day.day}>
          <strong>{dayLabels[locale][day.day]}</strong>
          <label className="branch-hours-editor__closed">
            <input
              checked={day.closed}
              onChange={(event) =>
                patchDay(index, {
                  closed: event.target.checked,
                  opensAt: event.target.checked ? null : "09:00",
                  closesAt: event.target.checked ? null : "21:00",
                })
              }
              type="checkbox"
            />
            <span>{locale === "ar" ? "مغلق" : "Closed"}</span>
          </label>
          <input
            aria-label={`${dayLabels[locale][day.day]} ${locale === "ar" ? "يفتح" : "opens"}`}
            disabled={day.closed}
            onChange={(event) => patchDay(index, { opensAt: event.target.value })}
            type="time"
            value={day.opensAt ?? ""}
          />
          <span>—</span>
          <input
            aria-label={`${dayLabels[locale][day.day]} ${locale === "ar" ? "يغلق" : "closes"}`}
            disabled={day.closed}
            onChange={(event) => patchDay(index, { closesAt: event.target.value })}
            type="time"
            value={day.closesAt ?? ""}
          />
        </div>
      ))}
      <div className="branch-hours-editor__exceptions">
        <header>
          <h3>{locale === "ar" ? "الإجازات والاستثناءات" : "Holidays and exceptions"}</h3>
          <button
            onClick={() =>
              onChange({
                ...value,
                exceptions: [
                  ...value.exceptions,
                  {
                    id: crypto.randomUUID(),
                    date: "",
                    labelAr: "",
                    labelEn: "",
                    closed: true,
                    opensAt: null,
                    closesAt: null,
                  },
                ],
              })
            }
            type="button"
          >
            + {locale === "ar" ? "إضافة استثناء" : "Add exception"}
          </button>
        </header>
        {value.exceptions.map((exception, index) => (
          <article key={exception.id}>
            <input
              aria-label={locale === "ar" ? "تاريخ الاستثناء" : "Exception date"}
              onChange={(event) => updateException(index, { date: event.target.value })}
              type="date"
              value={exception.date}
            />
            <input
              aria-label={locale === "ar" ? "اسم المناسبة بالعربية" : "Arabic holiday label"}
              onChange={(event) => updateException(index, { labelAr: event.target.value })}
              placeholder="العنوان بالعربية"
              value={exception.labelAr}
            />
            <input
              aria-label={locale === "ar" ? "اسم المناسبة بالإنجليزية" : "English holiday label"}
              onChange={(event) => updateException(index, { labelEn: event.target.value })}
              placeholder="English label"
              value={exception.labelEn}
            />
            <label>
              <input
                checked={exception.closed}
                onChange={(event) =>
                  updateException(index, {
                    closed: event.target.checked,
                    opensAt: event.target.checked ? null : "09:00",
                    closesAt: event.target.checked ? null : "21:00",
                  })
                }
                type="checkbox"
              />
              {locale === "ar" ? "مغلق" : "Closed"}
            </label>
            {!exception.closed ? (
              <>
                <input
                  aria-label={locale === "ar" ? "بداية ساعات الاستثناء" : "Exception opens at"}
                  onChange={(event) => updateException(index, { opensAt: event.target.value })}
                  required
                  type="time"
                  value={exception.opensAt ?? "09:00"}
                />
                <input
                  aria-label={locale === "ar" ? "نهاية ساعات الاستثناء" : "Exception closes at"}
                  onChange={(event) => updateException(index, { closesAt: event.target.value })}
                  required
                  type="time"
                  value={exception.closesAt ?? "21:00"}
                />
              </>
            ) : null}
            <button
              onClick={() =>
                onChange({
                  ...value,
                  exceptions: value.exceptions.filter((_, current) => current !== index),
                })
              }
              type="button"
            >
              {locale === "ar" ? "حذف" : "Remove"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );

  function updateException(
    index: number,
    patch: Partial<BranchWorkingHours["exceptions"][number]>,
  ) {
    onChange({
      ...value,
      exceptions: value.exceptions.map((row, current) =>
        current === index ? { ...row, ...patch } : row,
      ),
    });
  }
}
