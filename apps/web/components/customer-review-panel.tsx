"use client";

import type { ApiSuccess, CustomerReview, CustomerReviewOverview } from "@rahal/contracts";
import { useEffect, useState } from "react";
import type { PublicLocale } from "../lib/public-content";

const copy = {
  ar: {
    eyebrow: "شارك تجربتك",
    title: "كيف كانت رحلتك مع رحال؟",
    copy: "تقييمك يساعدنا على تحسين التجربة. لن يظهر للعامة إلا بعد مراجعة المحتوى.",
    loading: "جاري تجهيز التقييم...",
    label: "اكتب تجربتك",
    placeholder: "احكِ لنا عن السيارة والخدمة وتجربة الاستلام والإرجاع...",
    hint: "من 20 إلى 800 حرف. لا تكتب أرقام هوية أو بيانات تواصل.",
    submit: "إرسال التقييم للمراجعة",
    sending: "جاري الإرسال...",
    failed: "تعذر إرسال التقييم. راجع النص وحاول مرة أخرى.",
    PENDING: "وصل تقييمك وهو الآن قيد المراجعة.",
    APPROVED: "تم نشر تقييمك. شكرًا لمشاركتك.",
    REJECTED: "لم يتم نشر التقييم.",
    rating: "تقييمك",
    unavailable: "يصبح التقييم متاحًا بعد اكتمال الإيجار.",
  },
  en: {
    eyebrow: "SHARE YOUR JOURNEY",
    title: "How was your Rahal experience?",
    copy: "Your review helps us improve. It appears publicly only after content moderation.",
    loading: "Preparing your review...",
    label: "Tell us about your experience",
    placeholder: "Share your experience with the car, service, pickup, and return...",
    hint: "20–800 characters. Never include identity numbers or contact details.",
    submit: "Send review for moderation",
    sending: "Sending...",
    failed: "The review could not be sent. Check the text and try again.",
    PENDING: "Your review arrived and is awaiting moderation.",
    APPROVED: "Your review is published. Thank you for sharing.",
    REJECTED: "The review was not published.",
    rating: "Your rating",
    unavailable: "Reviews become available after rental completion.",
  },
} as const;

export function CustomerReviewPanel({
  locale,
  reservationId,
}: {
  locale: PublicLocale;
  reservationId: string;
}) {
  const text = copy[locale];
  const [overview, setOverview] = useState<CustomerReviewOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/reviews/customer/${encodeURIComponent(reservationId)}`, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("REVIEW_UNAVAILABLE");
        const payload = (await response.json()) as ApiSuccess<CustomerReviewOverview>;
        setOverview(payload.data);
      })
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reservationId]);

  async function submit() {
    if (comment.trim().length < 20) return;
    setSending(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/reviews/customer/${encodeURIComponent(reservationId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      if (!response.ok) throw new Error("REVIEW_FAILED");
      const payload = (await response.json()) as ApiSuccess<CustomerReview>;
      setOverview((current) => (current ? { ...current, review: payload.data } : current));
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="customer-review-panel">
      <span className="customer-review-panel__eyebrow">{text.eyebrow}</span>
      <h3>{text.title}</h3>
      <p>{text.copy}</p>
      {loading ? (
        <div className="customer-review-panel__state">{text.loading}</div>
      ) : overview?.review ? (
        <div className={`customer-review-result is-${overview.review.status.toLowerCase()}`}>
          <div className="customer-review-stars" aria-label={`${overview.review.rating}/5`}>
            {"★★★★★".split("").map((star, index) => (
              <span className={index < overview.review!.rating ? "is-filled" : ""} key={index}>
                {star}
              </span>
            ))}
          </div>
          <strong>{text[overview.review.status]}</strong>
          <blockquote>{overview.review.comment}</blockquote>
          {overview.review.status === "REJECTED" && overview.review.moderationNote ? (
            <small>{overview.review.moderationNote}</small>
          ) : null}
        </div>
      ) : overview?.eligible ? (
        <div className="customer-review-form">
          <fieldset>
            <legend>{text.rating}</legend>
            <div className="customer-review-rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  aria-label={`${value}/5`}
                  aria-pressed={rating === value}
                  key={value}
                  onClick={() => setRating(value)}
                  type="button"
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            <span>{text.label}</span>
            <textarea
              maxLength={800}
              onChange={(event) => setComment(event.target.value)}
              placeholder={text.placeholder}
              value={comment}
            />
            <small>
              {text.hint} · {comment.trim().length}/800
            </small>
          </label>
          <button
            disabled={sending || comment.trim().length < 20}
            onClick={() => void submit()}
            type="button"
          >
            {sending ? text.sending : text.submit}
            <span>→</span>
          </button>
          {failed ? <p className="customer-review-error">{text.failed}</p> : null}
        </div>
      ) : (
        <div className="customer-review-panel__state">{text.unavailable}</div>
      )}
    </section>
  );
}
