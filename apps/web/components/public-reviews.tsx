"use client";

import type { ApiSuccess, PublicReview } from "@rahal/contracts";
import { useEffect, useState } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { Footer, Header, Icon } from "./public-home";

const copy = {
  ar: {
    eyebrow: "تجارب حقيقية، رحلات مكتملة",
    title: "كلام عملائنا بعد ما رجعوا المفتاح.",
    subtitle:
      "كل تقييم هنا مرتبط بإيجار مكتمل، ومرّ على مراجعة محتوى تحمي خصوصية العميل قبل النشر.",
    verified: "تجربة إيجار مكتملة",
    loading: "جاري تحميل تجارب العملاء...",
    empty: "ستظهر هنا أولى التجارب المعتمدة قريبًا.",
    cta: "اختر عربيتك",
    privacy: "لا نعرض أسماء كاملة أو بيانات اتصال أو مستندات.",
  },
  en: {
    eyebrow: "REAL EXPERIENCES, COMPLETED JOURNEYS",
    title: "What customers say after returning the key.",
    subtitle:
      "Every review is tied to a completed rental and content-moderated to protect customer privacy before publication.",
    verified: "Completed rental",
    loading: "Loading customer experiences...",
    empty: "The first approved experiences will appear here soon.",
    cta: "Choose your car",
    privacy: "Full names, contact details, and documents are never displayed.",
  },
} as const;

export function PublicReviews({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [reviews, setReviews] = useState<PublicReview[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reviews/public?locale=${locale}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("REVIEWS_UNAVAILABLE");
        const payload = (await response.json()) as ApiSuccess<PublicReview[]>;
        setReviews(payload.data);
      })
      .catch(() => setReviews([]));
    return () => controller.abort();
  }, [locale]);

  return (
    <div className="public-site public-reviews-page" dir={locale === "ar" ? "rtl" : "ltr"}>
      <Header languageHref={locale === "ar" ? "/en/reviews" : "/reviews"} locale={locale} />
      <main>
        <section className="public-reviews-hero">
          <div className="container">
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
            <a className="button button--gold" href={localizedPath(locale, "/cars")}>
              {text.cta}
              <Icon name="arrow" />
            </a>
          </div>
          <div className="public-reviews-orbit" aria-hidden="true">
            <span>★</span>
            <span>5.0</span>
            <span>رحال</span>
          </div>
        </section>
        <section className="public-reviews-grid-section">
          <div className="container">
            {reviews === null ? (
              <div className="public-reviews-state">{text.loading}</div>
            ) : reviews.length === 0 ? (
              <div className="public-reviews-state">{text.empty}</div>
            ) : (
              <div className="public-reviews-grid">
                {reviews.map((review, index) => (
                  <article className={index % 3 === 0 ? "is-featured" : ""} key={review.id}>
                    <div className="public-review-stars" aria-label={`${review.rating}/5`}>
                      {"★★★★★".split("").map((star, starIndex) => (
                        <span
                          className={starIndex < review.rating ? "is-filled" : ""}
                          key={starIndex}
                        >
                          {star}
                        </span>
                      ))}
                    </div>
                    <blockquote>“{review.comment}”</blockquote>
                    <footer>
                      <div>
                        <strong>{review.customerName}</strong>
                        <span>{review.vehicleName}</span>
                      </div>
                      <small>
                        <Icon name="check" size={15} />
                        {text.verified}
                      </small>
                    </footer>
                  </article>
                ))}
              </div>
            )}
            <p className="public-reviews-privacy">
              <Icon name="shield" size={18} />
              {text.privacy}
            </p>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
