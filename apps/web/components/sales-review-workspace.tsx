"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEgp, localizedPath, type PublicLocale } from "../lib/public-content";

type QueueStatus = "PENDING_REVIEW" | "UNDER_REVIEW" | "MORE_INFORMATION_REQUIRED";

type QueueItem = {
  id: string;
  reference: string;
  status: QueueStatus;
  submittedAt: string;
  pickupAt: string;
  returnAt: string;
  driverRequested: boolean;
  estimate: { currency: "EGP"; total: number };
  vehicle: { id: string; name: string };
  branch: { id: string; name: string };
  customer: { name: string; emailMasked: string; phoneMasked: string };
  assignedToCurrentUser: boolean;
};

type Review = QueueItem & {
  customer: QueueItem["customer"] & {
    nationality: string | null;
    customerCategory: "EGYPTIAN" | "FOREIGN" | null;
    addressMasked: string | null;
    emergencyContactNameMasked: string | null;
    emergencyContactPhoneMasked: string | null;
  };
  verification: { email: boolean; phone: boolean };
  consents: { policyVersion: string | null; requiredAccepted: boolean };
  documents: Array<{ type: string; status: string; uploadedAt: string }>;
  timeline: Array<{
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
};

const copy = {
  ar: {
    brand: "رحال / المبيعات",
    home: "الموقع الرئيسي",
    language: "English",
    eyebrow: "مساحة عمل فريق المبيعات",
    title: "راجع كل طلب بوضوح قبل أي قرار.",
    subtitle: "هذه القائمة للطلبات المرسلة فقط. استلام الطلب يبدأ المراجعة ولا يؤكد الحجز.",
    queue: "قائمة المراجعة",
    all: "الكل",
    pending: "بانتظار المراجعة",
    reviewing: "قيد المراجعة",
    moreInfo: "معلومات إضافية مطلوبة",
    loading: "جارٍ تحميل طلبات المبيعات...",
    empty: "لا توجد طلبات في هذه القائمة الآن.",
    signIn: "سجّل الدخول بحساب موظف المبيعات",
    forbidden: "هذا القسم متاح لحسابات المبيعات والإدارة فقط.",
    unavailable: "تعذر تحميل مساحة المبيعات الآن.",
    submitted: "تم الإرسال",
    pickup: "الاستلام",
    return: "الإرجاع",
    estimate: "التقدير",
    branch: "الفرع",
    customer: "العميل",
    open: "افتح المراجعة",
    select: "اختر طلبًا من القائمة لمراجعة تفاصيله المحمية.",
    protected: "تفاصيل محمية",
    contact: "التواصل المخفي",
    nationality: "الجنسية",
    address: "العنوان المخفي",
    emergency: "الطوارئ",
    verification: "التوثيق",
    email: "البريد",
    phone: "الهاتف",
    verified: "موثّق",
    notVerified: "غير موثّق",
    documents: "حالة المستندات",
    noDocuments: "لا توجد مستندات مسجلة.",
    consent: "نسخة الموافقات",
    timeline: "سجل الطلب",
    claim: "استلم الطلب للمراجعة",
    claiming: "جارٍ استلام الطلب...",
    assigned: "هذا الطلب مسند إليك",
    claimFailed: "تعذر استلام الطلب؛ ربما استلمه موظف آخر.",
    safety:
      "لا تظهر روابط الملفات أو أرقام الهوية هنا. الحجز النهائي يتطلب الحضور للفرع والعربون والعقد الموقع.",
    driver: "مع سائق",
    selfDrive: "بدون سائق",
  },
  en: {
    brand: "RAHAL / SALES",
    home: "Public website",
    language: "العربية",
    eyebrow: "SALES REVIEW WORKSPACE",
    title: "Review every request clearly before any decision.",
    subtitle:
      "Only submitted requests appear here. Claiming starts review and never confirms a booking.",
    queue: "Review queue",
    all: "All",
    pending: "Pending review",
    reviewing: "Under review",
    moreInfo: "More information required",
    loading: "Loading sales requests...",
    empty: "There are no requests in this queue right now.",
    signIn: "Sign in with a sales employee account",
    forbidden: "This workspace is available only to sales and administrator accounts.",
    unavailable: "The sales workspace could not be loaded right now.",
    submitted: "Submitted",
    pickup: "Pickup",
    return: "Return",
    estimate: "Estimate",
    branch: "Branch",
    customer: "Customer",
    open: "Open review",
    select: "Choose a request from the queue to inspect its protected details.",
    protected: "Protected details",
    contact: "Masked contact",
    nationality: "Nationality",
    address: "Masked address",
    emergency: "Emergency contact",
    verification: "Verification",
    email: "Email",
    phone: "Phone",
    verified: "Verified",
    notVerified: "Not verified",
    documents: "Document status",
    noDocuments: "No documents are recorded.",
    consent: "Consent version",
    timeline: "Request timeline",
    claim: "Claim request for review",
    claiming: "Claiming request...",
    assigned: "This request is assigned to you",
    claimFailed: "The request could not be claimed; another employee may have taken it.",
    safety:
      "File links and identity numbers never appear here. Final booking requires branch attendance, deposit, and a signed contract.",
    driver: "With driver",
    selfDrive: "Self-drive",
  },
} as const;

const documentLabels: Record<string, { ar: string; en: string }> = {
  NATIONAL_ID_FRONT: { ar: "وجه بطاقة الرقم القومي", en: "National ID front" },
  NATIONAL_ID_BACK: { ar: "ظهر بطاقة الرقم القومي", en: "National ID back" },
  DRIVING_LICENSE_FRONT: { ar: "وجه رخصة القيادة", en: "Driving licence front" },
  DRIVING_LICENSE_BACK: { ar: "ظهر رخصة القيادة", en: "Driving licence back" },
  PASSPORT: { ar: "جواز السفر", en: "Passport" },
};

function formatDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: QueueStatus, locale: PublicLocale) {
  const labels = copy[locale];
  if (status === "UNDER_REVIEW") return labels.reviewing;
  if (status === "MORE_INFORMATION_REQUIRED") return labels.moreInfo;
  return labels.pending;
}

export function SalesReviewWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | QueueStatus>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<"AUTH" | "FORBIDDEN" | "GENERAL" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/reservations/sales/queue", {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: QueueItem[] };
        if (response.status === 401) return setError("AUTH");
        if (response.status === 403) return setError("FORBIDDEN");
        if (!response.ok || !payload.data) return setError("GENERAL");
        setQueue(payload.data);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError("GENERAL");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filteredQueue = useMemo(
    () => queue.filter((item) => filter === "ALL" || item.status === filter),
    [filter, queue],
  );

  async function openReview(id: string) {
    setSelectedId(id);
    setReview(null);
    setReviewLoading(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/reservations/sales/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as { data?: Review };
      if (!response.ok || !payload.data) throw new Error("review unavailable");
      setReview(payload.data);
    } catch {
      setActionError(text.unavailable);
    } finally {
      setReviewLoading(false);
    }
  }

  async function claimReview() {
    if (!review) return;
    setClaiming(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/claim`,
        { method: "POST", credentials: "include" },
      );
      const payload = (await response.json()) as { data?: Review };
      if (!response.ok || !payload.data) throw new Error("claim unavailable");
      setReview(payload.data);
      setQueue((current) =>
        current.map((item) =>
          item.id === payload.data!.id
            ? {
                ...item,
                status: payload.data!.status,
                assignedToCurrentUser: true,
              }
            : item,
        ),
      );
    } catch {
      setActionError(text.claimFailed);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="sales-workspace" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <header className="sales-topbar">
        <a className="sales-brand" href={localizedPath(locale)}>
          <span aria-hidden="true">R</span>
          {text.brand}
        </a>
        <nav aria-label={text.brand}>
          <a href={localizedPath(locale)}>{text.home}</a>
          <a href={locale === "ar" ? "/en/sales" : "/sales"}>{text.language}</a>
        </nav>
      </header>

      <main>
        <section className="sales-hero">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
          </div>
          <p>{text.subtitle}</p>
        </section>

        {loading ? <div className="sales-state">{text.loading}</div> : null}
        {!loading && error ? (
          <div className="sales-state sales-state--error">
            <strong>
              {error === "AUTH"
                ? text.signIn
                : error === "FORBIDDEN"
                  ? text.forbidden
                  : text.unavailable}
            </strong>
            {error === "AUTH" ? (
              <a className="sales-action" href={localizedPath(locale, "/auth")}>
                {text.signIn}
              </a>
            ) : null}
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="sales-layout">
            <section className="sales-queue" aria-label={text.queue}>
              <div className="sales-section-heading">
                <span>01</span>
                <h2>{text.queue}</h2>
                <b>{queue.length.toString().padStart(2, "0")}</b>
              </div>
              <div className="sales-filters" role="group" aria-label={text.queue}>
                {(
                  [
                    ["ALL", text.all],
                    ["PENDING_REVIEW", text.pending],
                    ["UNDER_REVIEW", text.reviewing],
                    ["MORE_INFORMATION_REQUIRED", text.moreInfo],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    aria-pressed={filter === value}
                    key={value}
                    onClick={() => setFilter(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="sales-request-list">
                {filteredQueue.length ? (
                  filteredQueue.map((item) => (
                    <article
                      className={`sales-request-card${selectedId === item.id ? " is-selected" : ""}`}
                      key={item.id}
                    >
                      <div className="sales-request-card__top">
                        <span className={`sales-status sales-status--${item.status.toLowerCase()}`}>
                          {statusLabel(item.status, locale)}
                        </span>
                        <small>{formatDate(item.submittedAt, locale)}</small>
                      </div>
                      <h3>{item.vehicle.name}</h3>
                      <strong>{item.reference}</strong>
                      <dl>
                        <div>
                          <dt>{text.customer}</dt>
                          <dd>{item.customer.name}</dd>
                        </div>
                        <div>
                          <dt>{text.pickup}</dt>
                          <dd>{formatDate(item.pickupAt, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.estimate}</dt>
                          <dd>{formatEgp(item.estimate.total, locale)}</dd>
                        </div>
                      </dl>
                      <button
                        className="sales-card-button"
                        onClick={() => void openReview(item.id)}
                        type="button"
                      >
                        {text.open}
                        <span aria-hidden="true">↗</span>
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="sales-state">{text.empty}</div>
                )}
              </div>
            </section>

            <aside className="sales-review" aria-live="polite">
              <div className="sales-section-heading">
                <span>02</span>
                <h2>{text.protected}</h2>
              </div>
              {reviewLoading ? <div className="sales-state">{text.loading}</div> : null}
              {!reviewLoading && !review ? (
                <div className="sales-review-empty">{text.select}</div>
              ) : null}
              {review ? (
                <div className="sales-review-content">
                  <header>
                    <span className={`sales-status sales-status--${review.status.toLowerCase()}`}>
                      {statusLabel(review.status, locale)}
                    </span>
                    <p>{review.reference}</p>
                    <h2>{review.vehicle.name}</h2>
                    <strong>{formatEgp(review.estimate.total, locale)}</strong>
                  </header>

                  <section>
                    <h3>{text.contact}</h3>
                    <dl className="sales-detail-list">
                      <div>
                        <dt>{text.customer}</dt>
                        <dd>{review.customer.name}</dd>
                      </div>
                      <div>
                        <dt>{text.email}</dt>
                        <dd>{review.customer.emailMasked}</dd>
                      </div>
                      <div>
                        <dt>{text.phone}</dt>
                        <dd>{review.customer.phoneMasked}</dd>
                      </div>
                      <div>
                        <dt>{text.nationality}</dt>
                        <dd>{review.customer.nationality ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>{text.address}</dt>
                        <dd>{review.customer.addressMasked ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>{text.emergency}</dt>
                        <dd>
                          {review.customer.emergencyContactNameMasked ?? "—"} ·{" "}
                          {review.customer.emergencyContactPhoneMasked ?? "—"}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section>
                    <h3>{text.verification}</h3>
                    <div className="sales-verification-grid">
                      <span>
                        {text.email}
                        <b>{review.verification.email ? text.verified : text.notVerified}</b>
                      </span>
                      <span>
                        {text.phone}
                        <b>{review.verification.phone ? text.verified : text.notVerified}</b>
                      </span>
                      <span>
                        {text.consent}
                        <b>{review.consents.policyVersion ?? "—"}</b>
                      </span>
                    </div>
                  </section>

                  <section>
                    <h3>{text.documents}</h3>
                    {review.documents.length ? (
                      <ul className="sales-document-statuses">
                        {review.documents.map((document) => (
                          <li key={`${document.type}-${document.uploadedAt}`}>
                            <strong>
                              {documentLabels[document.type]?.[locale] ?? document.type}
                            </strong>
                            <span>{document.status.replaceAll("_", " ")}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{text.noDocuments}</p>
                    )}
                  </section>

                  <section>
                    <h3>{text.timeline}</h3>
                    <ol className="sales-timeline">
                      {review.timeline.map((event) => (
                        <li key={`${event.toStatus}-${event.createdAt}`}>
                          <span>{formatDate(event.createdAt, locale)}</span>
                          <strong>{event.toStatus.replaceAll("_", " ")}</strong>
                          {event.note ? <p>{event.note}</p> : null}
                        </li>
                      ))}
                    </ol>
                  </section>

                  <div className="sales-safety-note">{text.safety}</div>
                  {review.assignedToCurrentUser ? (
                    <div className="sales-assigned">✓ {text.assigned}</div>
                  ) : (
                    <button
                      className="sales-action sales-action--claim"
                      disabled={claiming || review.status !== "PENDING_REVIEW"}
                      onClick={() => void claimReview()}
                      type="button"
                    >
                      {claiming ? text.claiming : text.claim}
                    </button>
                  )}
                  {actionError ? <p className="sales-action-error">{actionError}</p> : null}
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </main>
    </div>
  );
}
