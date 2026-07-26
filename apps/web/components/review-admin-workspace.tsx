"use client";

import type { ApiSuccess, ReviewAdminOverview, ReviewModerationItem } from "@rahal/contracts";
import { useEffect, useMemo, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";

const copy = {
  ar: {
    eyebrow: "جودة التجربة",
    title: "صوت العميل، تحت مراجعة مسؤولة.",
    subtitle: "راجع التقييمات دون بيانات اتصال أو مستندات، وانشر التجارب المفيدة فقط بقرار موثّق.",
    pending: "بانتظار المراجعة",
    approved: "منشورة",
    rejected: "غير منشورة",
    average: "متوسط المنشور",
    requests: "طلبات جارية",
    active: "إيجارات نشطة",
    fleet: "سيارات الأسطول",
    queue: "قائمة المراجعة",
    all: "الكل",
    empty: "لا توجد تقييمات في هذا القسم.",
    loading: "جاري تحميل مركز المراجعة...",
    unavailable: "تعذر تحميل مركز المراجعة أو لا تملك الصلاحية.",
    note: "ملاحظة القرار",
    notePlaceholder: "أضف سببًا واضحًا، ويصبح إلزاميًا عند الرفض...",
    approve: "نشر التقييم",
    reject: "عدم النشر",
    saving: "جاري حفظ القرار...",
    failed: "تعذر حفظ القرار. ربما تمت مراجعة التقييم بالفعل.",
    reservation: "الطلب",
    customer: "العميل",
    vehicle: "السيارة",
    status: { PENDING: "قيد المراجعة", APPROVED: "منشور", REJECTED: "غير منشور" },
  },
  en: {
    eyebrow: "EXPERIENCE QUALITY",
    title: "The customer voice, responsibly moderated.",
    subtitle:
      "Review feedback without contact details or documents, then publish useful experiences through an audited decision.",
    pending: "Awaiting review",
    approved: "Published",
    rejected: "Not published",
    average: "Published average",
    requests: "Open requests",
    active: "Active rentals",
    fleet: "Fleet vehicles",
    queue: "Moderation queue",
    all: "All",
    empty: "There are no reviews in this section.",
    loading: "Loading the moderation center...",
    unavailable: "The moderation center is unavailable or you do not have access.",
    note: "Decision note",
    notePlaceholder: "Add a clear reason; it is required when rejecting...",
    approve: "Publish review",
    reject: "Do not publish",
    saving: "Saving decision...",
    failed: "The decision could not be saved. The review may already be moderated.",
    reservation: "Request",
    customer: "Customer",
    vehicle: "Vehicle",
    status: { PENDING: "Pending", APPROVED: "Published", REJECTED: "Not published" },
  },
} as const;

type Filter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export function ReviewAdminWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [overview, setOverview] = useState<ReviewAdminOverview | null>(null);
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [failedId, setFailedId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews/admin?locale=${locale}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("REVIEWS_UNAVAILABLE");
      const payload = (await response.json()) as ApiSuccess<ReviewAdminOverview>;
      setOverview(payload.data);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function moderate(review: ReviewModerationItem, action: "APPROVE" | "REJECT") {
    const note = notes[review.id]?.trim() ?? "";
    if (action === "REJECT" && note.length < 10) return;
    setSavingId(review.id);
    setFailedId("");
    try {
      const response = await fetch(`/api/reviews/admin/${review.id}/moderate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(note ? { note } : {}) }),
      });
      if (!response.ok) throw new Error("MODERATION_FAILED");
      await load();
    } catch {
      setFailedId(review.id);
    } finally {
      setSavingId("");
    }
  }

  const visible = useMemo(
    () => overview?.reviews.filter((review) => filter === "ALL" || review.status === filter) ?? [],
    [filter, overview],
  );
  const metrics = overview?.metrics;

  return (
    <WorkspaceShell activePage="reviews" kind="admin" locale={locale}>
      <div className="review-admin-workspace" dir={locale === "ar" ? "rtl" : "ltr"}>
        <section className="review-admin-hero">
          <span>{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </section>
        <section className="review-admin-metrics">
          {[
            [text.pending, metrics?.pendingReviews ?? 0],
            [text.approved, metrics?.approvedReviews ?? 0],
            [text.average, metrics?.averagePublishedRating ?? "—"],
            [text.requests, metrics?.pendingReservationRequests ?? 0],
            [text.active, metrics?.activeRentals ?? 0],
            [text.fleet, metrics?.fleetSize ?? 0],
          ].map(([label, value], index) => (
            <article key={label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{value}</strong>
              <p>{label}</p>
            </article>
          ))}
        </section>
        <section className="review-admin-queue">
          <header>
            <div>
              <span>01</span>
              <h2>{text.queue}</h2>
            </div>
            <nav aria-label={text.queue}>
              {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((value) => (
                <button
                  aria-pressed={filter === value}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {value === "ALL" ? text.all : text.status[value]}
                </button>
              ))}
            </nav>
          </header>
          {loading ? (
            <div className="review-admin-state">{text.loading}</div>
          ) : !overview ? (
            <div className="review-admin-state is-error">{text.unavailable}</div>
          ) : visible.length === 0 ? (
            <div className="review-admin-state">{text.empty}</div>
          ) : (
            <div className="review-admin-list">
              {visible.map((review) => (
                <article
                  className={`review-admin-card is-${review.status.toLowerCase()}`}
                  key={review.id}
                >
                  <div className="review-admin-card__meta">
                    <span>{text.status[review.status]}</span>
                    <small>
                      {new Date(review.createdAt).toLocaleDateString(
                        locale === "ar" ? "ar-EG" : "en-EG",
                      )}
                    </small>
                  </div>
                  <div className="review-admin-card__stars" aria-label={`${review.rating}/5`}>
                    {"★★★★★".split("").map((star, index) => (
                      <span className={index < review.rating ? "is-filled" : ""} key={index}>
                        {star}
                      </span>
                    ))}
                  </div>
                  <blockquote>{review.comment}</blockquote>
                  <dl>
                    <div>
                      <dt>{text.customer}</dt>
                      <dd>{review.customerName}</dd>
                    </div>
                    <div>
                      <dt>{text.vehicle}</dt>
                      <dd>{review.vehicleName}</dd>
                    </div>
                    <div>
                      <dt>{text.reservation}</dt>
                      <dd>{review.reservationReference}</dd>
                    </div>
                  </dl>
                  {review.status === "PENDING" ? (
                    <div className="review-admin-actions">
                      <label>
                        <span>{text.note}</span>
                        <textarea
                          maxLength={300}
                          onChange={(event) =>
                            setNotes((current) => ({ ...current, [review.id]: event.target.value }))
                          }
                          placeholder={text.notePlaceholder}
                          value={notes[review.id] ?? ""}
                        />
                      </label>
                      <div>
                        <button
                          disabled={savingId !== ""}
                          onClick={() => void moderate(review, "APPROVE")}
                          type="button"
                        >
                          {savingId === review.id ? text.saving : text.approve}
                        </button>
                        <button
                          disabled={savingId !== "" || (notes[review.id]?.trim().length ?? 0) < 10}
                          onClick={() => void moderate(review, "REJECT")}
                          type="button"
                        >
                          {text.reject}
                        </button>
                      </div>
                      {failedId === review.id ? <p>{text.failed}</p> : null}
                    </div>
                  ) : review.moderationNote ? (
                    <p className="review-admin-card__decision">{review.moderationNote}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
