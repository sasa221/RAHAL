"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEgp, localizedPath, type PublicLocale } from "../lib/public-content";

type QueueStatus =
  "PENDING_REVIEW" | "UNDER_REVIEW" | "MORE_INFORMATION_REQUIRED" | "ALTERNATIVE_OFFERED";

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
  alternativeOffer: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN";
    proposedPickupAt: string;
    proposedReturnAt: string;
    estimate: { currency: "EGP"; total: number; dailyRate: number };
    vehicle: { id: string; name: string };
    note: string | null;
    expiresAt: string;
    respondedAt: string | null;
  } | null;
};

type OfferVehicle = {
  id: string;
  name: { ar: string; en: string };
  dailyRateEgp: number;
  status: "available" | "review";
};

type DecisionResult = {
  id: string;
  reference: string;
  status: "MORE_INFORMATION_REQUIRED" | "PRE_APPROVED" | "REJECTED";
  decidedAt: string;
  expiresAt: string | null;
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
    alternativeStatus: "عرض بديل مرسل",
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
    decisionTitle: "قرار المراجعة",
    decisionCopy: "اكتب رسالة واضحة للعميل ثم اختر الإجراء المناسب. لا يؤكد أي إجراء هنا الحجز.",
    decisionNote: "رسالة العميل",
    decisionPlaceholder: "اشرح المطلوب أو سبب القرار بوضوح (10 أحرف على الأقل)",
    decisionHint: "ستُحفظ الرسالة في سجل محادثات الطلب ويصل للعميل إشعار منفصل.",
    requestInfo: "اطلب معلومات إضافية",
    preApprove: "موافقة مبدئية لمدة 48 ساعة",
    reject: "ارفض الطلب",
    deciding: "جارٍ تسجيل القرار...",
    decisionFailed: "تعذر تسجيل القرار. راجع الرسالة وحالة إسناد الطلب.",
    decisionDone: "تم تسجيل القرار وإبلاغ العميل",
    expires: "تنتهي الموافقة المبدئية",
    moreInfoDone: "بانتظار معلومات إضافية من العميل.",
    preApprovedDone: "الطلب موافق عليه مبدئيًا فقط، وليس حجزًا مؤكدًا.",
    rejectedDone: "تم إغلاق الطلب وشرح السبب للعميل.",
    moreInfoStatus: "معلومات إضافية مطلوبة",
    preApprovedStatus: "موافقة مبدئية",
    rejectedStatus: "مرفوض",
    driver: "مع سائق",
    selfDrive: "بدون سائق",
    alternativeTitle: "اقترح بديلًا",
    alternativeCopy: "اختر سيارة ومواعيد مناسبة. العرض صالح 48 ساعة ولا يؤكد الحجز.",
    alternativeVehicle: "السيارة البديلة",
    alternativePickup: "موعد الاستلام المقترح",
    alternativeReturn: "موعد الإرجاع المقترح",
    alternativeNote: "رسالة العرض للعميل",
    alternativePlaceholder: "اشرح سبب العرض وما الذي تغير بوضوح",
    sendAlternative: "إرسال العرض البديل",
    sendingAlternative: "جاري إرسال العرض...",
    alternativeSent: "تم إرسال العرض البديل للعميل لمدة 48 ساعة.",
    alternativeFailed: "تعذر إرسال العرض. راجع السيارة والمواعيد والرسالة.",
    currentAlternative: "العرض البديل الحالي",
    offerExpires: "ينتهي",
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
    alternativeStatus: "Alternative offered",
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
    decisionTitle: "Review decision",
    decisionCopy:
      "Write a clear customer message, then choose the appropriate action. No action here confirms a booking.",
    decisionNote: "Customer message",
    decisionPlaceholder: "Clearly explain what is needed or why (at least 10 characters)",
    decisionHint:
      "The message is stored in the request conversation and a separate notification is queued.",
    requestInfo: "Request more information",
    preApprove: "Pre-approve for 48 hours",
    reject: "Reject request",
    deciding: "Recording decision...",
    decisionFailed: "The decision could not be recorded. Check the message and assignment state.",
    decisionDone: "Decision recorded and customer notified",
    expires: "Pre-approval expires",
    moreInfoDone: "Waiting for more information from the customer.",
    preApprovedDone: "The request is only pre-approved; it is not a confirmed booking.",
    rejectedDone: "The request was closed and the reason was sent to the customer.",
    moreInfoStatus: "More information required",
    preApprovedStatus: "Pre-approved",
    rejectedStatus: "Rejected",
    driver: "With driver",
    selfDrive: "Self-drive",
    alternativeTitle: "Propose an alternative",
    alternativeCopy:
      "Choose a suitable vehicle and dates. The offer lasts 48 hours and never confirms a booking.",
    alternativeVehicle: "Alternative vehicle",
    alternativePickup: "Proposed pickup",
    alternativeReturn: "Proposed return",
    alternativeNote: "Offer message to customer",
    alternativePlaceholder: "Clearly explain why this alternative is being offered",
    sendAlternative: "Send alternative offer",
    sendingAlternative: "Sending offer...",
    alternativeSent: "The 48-hour alternative offer was sent to the customer.",
    alternativeFailed: "The offer could not be sent. Check the vehicle, dates, and message.",
    currentAlternative: "Current alternative offer",
    offerExpires: "Expires",
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
  if (status === "ALTERNATIVE_OFFERED") return labels.alternativeStatus;
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
  const [decisionNote, setDecisionNote] = useState("");
  const [decidingAction, setDecidingAction] = useState<string | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState<"AUTH" | "FORBIDDEN" | "GENERAL" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fleet, setFleet] = useState<OfferVehicle[]>([]);
  const [offerVehicleId, setOfferVehicleId] = useState("");
  const [offerPickup, setOfferPickup] = useState("");
  const [offerReturn, setOfferReturn] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [offering, setOffering] = useState(false);
  const [offerCreatedExpires, setOfferCreatedExpires] = useState<string | null>(null);

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

  useEffect(() => {
    fetch("/api/vehicles", { credentials: "include" })
      .then(async (response) =>
        response.ok ? ((await response.json()) as { data?: OfferVehicle[] }) : {},
      )
      .then((payload) =>
        setFleet(payload.data?.filter((vehicle) => vehicle.status === "available") ?? []),
      )
      .catch(() => setFleet([]));
  }, []);

  const filteredQueue = useMemo(
    () => queue.filter((item) => filter === "ALL" || item.status === filter),
    [filter, queue],
  );

  async function openReview(id: string) {
    setSelectedId(id);
    setReview(null);
    setDecisionNote("");
    setDecisionResult(null);
    setReviewLoading(true);
    setActionError(null);
    setOfferCreatedExpires(null);
    try {
      const response = await fetch(`/api/reservations/sales/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as { data?: Review };
      if (!response.ok || !payload.data) throw new Error("review unavailable");
      setReview(payload.data);
      setOfferVehicleId(payload.data.vehicle.id);
      setOfferPickup(payload.data.pickupAt.slice(0, 10));
      setOfferReturn(payload.data.returnAt.slice(0, 10));
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

  async function submitDecision(action: "REQUEST_INFORMATION" | "PRE_APPROVE" | "REJECT") {
    if (!review || decisionNote.trim().length < 10) {
      setActionError(text.decisionFailed);
      return;
    }
    setDecidingAction(action);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/decision`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, note: decisionNote.trim() }),
        },
      );
      const payload = (await response.json()) as { data?: DecisionResult };
      if (!response.ok || !payload.data) throw new Error("decision unavailable");
      setDecisionResult(payload.data);
      setQueue((current) =>
        payload.data!.status === "MORE_INFORMATION_REQUIRED"
          ? current.map((item) =>
              item.id === payload.data!.id
                ? { ...item, status: "MORE_INFORMATION_REQUIRED" }
                : item,
            )
          : current.filter((item) => item.id !== payload.data!.id),
      );
      if (payload.data.status === "MORE_INFORMATION_REQUIRED") {
        setReview((current) =>
          current ? { ...current, status: "MORE_INFORMATION_REQUIRED" } : current,
        );
      }
    } catch {
      setActionError(text.decisionFailed);
    } finally {
      setDecidingAction(null);
    }
  }

  async function submitAlternativeOffer() {
    if (
      !review ||
      !offerVehicleId ||
      !offerPickup ||
      !offerReturn ||
      offerNote.trim().length < 10
    ) {
      setActionError(text.alternativeFailed);
      return;
    }
    setOffering(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/alternative-offers`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            vehicleId: offerVehicleId,
            pickupDate: offerPickup,
            returnDate: offerReturn,
            note: offerNote.trim(),
          }),
        },
      );
      const payload = (await response.json()) as { data?: { expiresAt: string } };
      if (!response.ok || !payload.data) throw new Error("offer unavailable");
      setOfferCreatedExpires(payload.data.expiresAt);
      setReview((current) => (current ? { ...current, status: "ALTERNATIVE_OFFERED" } : current));
      setQueue((current) =>
        current.map((item) =>
          item.id === review.id ? { ...item, status: "ALTERNATIVE_OFFERED" } : item,
        ),
      );
    } catch {
      setActionError(text.alternativeFailed);
    } finally {
      setOffering(false);
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
                    ["ALTERNATIVE_OFFERED", text.alternativeStatus],
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

                  {review.alternativeOffer ? (
                    <section className="sales-alternative-summary">
                      <h3>{text.currentAlternative}</h3>
                      <strong>{review.alternativeOffer.vehicle.name}</strong>
                      <dl className="sales-detail-list">
                        <div>
                          <dt>{text.alternativePickup}</dt>
                          <dd>{formatDate(review.alternativeOffer.proposedPickupAt, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.alternativeReturn}</dt>
                          <dd>{formatDate(review.alternativeOffer.proposedReturnAt, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.estimate}</dt>
                          <dd>{formatEgp(review.alternativeOffer.estimate.total, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.offerExpires}</dt>
                          <dd>{formatDate(review.alternativeOffer.expiresAt, locale)}</dd>
                        </div>
                      </dl>
                    </section>
                  ) : null}

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
                    <>
                      <div className="sales-assigned">✓ {text.assigned}</div>
                      {decisionResult ? (
                        <div className="sales-decision-success" aria-live="polite">
                          <span>{text.decisionDone}</span>
                          <h3>
                            {decisionResult.status === "MORE_INFORMATION_REQUIRED"
                              ? text.moreInfoStatus
                              : decisionResult.status === "PRE_APPROVED"
                                ? text.preApprovedStatus
                                : text.rejectedStatus}
                          </h3>
                          <p>
                            {decisionResult.status === "MORE_INFORMATION_REQUIRED"
                              ? text.moreInfoDone
                              : decisionResult.status === "PRE_APPROVED"
                                ? text.preApprovedDone
                                : text.rejectedDone}
                          </p>
                          {decisionResult.expiresAt ? (
                            <small>
                              {text.expires}: {formatDate(decisionResult.expiresAt, locale)}
                            </small>
                          ) : null}
                        </div>
                      ) : review.status === "UNDER_REVIEW" ? (
                        <>
                          <section className="sales-decision-panel">
                            <h3>{text.decisionTitle}</h3>
                            <p>{text.decisionCopy}</p>
                            <label>
                              <span>{text.decisionNote}</span>
                              <textarea
                                maxLength={500}
                                minLength={10}
                                onChange={(event) => {
                                  setDecisionNote(event.target.value);
                                  setActionError(null);
                                }}
                                placeholder={text.decisionPlaceholder}
                                rows={5}
                                value={decisionNote}
                              />
                              <small>
                                {text.decisionHint} · {decisionNote.length}/500
                              </small>
                            </label>
                            <div className="sales-decision-actions">
                              <button
                                disabled={
                                  decidingAction !== null || decisionNote.trim().length < 10
                                }
                                onClick={() => void submitDecision("REQUEST_INFORMATION")}
                                type="button"
                              >
                                {decidingAction === "REQUEST_INFORMATION"
                                  ? text.deciding
                                  : text.requestInfo}
                              </button>
                              <button
                                disabled={
                                  decidingAction !== null || decisionNote.trim().length < 10
                                }
                                onClick={() => void submitDecision("PRE_APPROVE")}
                                type="button"
                              >
                                {decidingAction === "PRE_APPROVE" ? text.deciding : text.preApprove}
                              </button>
                              <button
                                className="is-danger"
                                disabled={
                                  decidingAction !== null || decisionNote.trim().length < 10
                                }
                                onClick={() => void submitDecision("REJECT")}
                                type="button"
                              >
                                {decidingAction === "REJECT" ? text.deciding : text.reject}
                              </button>
                            </div>
                          </section>
                          <section className="sales-decision-panel sales-alternative-panel">
                            <h3>{text.alternativeTitle}</h3>
                            <p>{text.alternativeCopy}</p>
                            <div className="sales-alternative-fields">
                              <label>
                                <span>{text.alternativeVehicle}</span>
                                <select
                                  value={offerVehicleId}
                                  onChange={(event) => setOfferVehicleId(event.target.value)}
                                >
                                  {fleet.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                      {vehicle.name[locale]} ·{" "}
                                      {formatEgp(vehicle.dailyRateEgp, locale)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                <span>{text.alternativePickup}</span>
                                <input
                                  type="date"
                                  value={offerPickup}
                                  onChange={(event) => setOfferPickup(event.target.value)}
                                />
                              </label>
                              <label>
                                <span>{text.alternativeReturn}</span>
                                <input
                                  type="date"
                                  value={offerReturn}
                                  onChange={(event) => setOfferReturn(event.target.value)}
                                />
                              </label>
                            </div>
                            <label>
                              <span>{text.alternativeNote}</span>
                              <textarea
                                maxLength={500}
                                minLength={10}
                                value={offerNote}
                                onChange={(event) => setOfferNote(event.target.value)}
                                placeholder={text.alternativePlaceholder}
                              />
                            </label>
                            <button
                              className="sales-action sales-action--claim"
                              disabled={offering || offerNote.trim().length < 10 || !offerVehicleId}
                              onClick={() => void submitAlternativeOffer()}
                              type="button"
                            >
                              {offering ? text.sendingAlternative : text.sendAlternative}
                              <span>→</span>
                            </button>
                          </section>
                        </>
                      ) : null}
                      {offerCreatedExpires ? (
                        <div className="sales-decision-success">
                          <h3>{text.alternativeSent}</h3>
                          <small>
                            {text.offerExpires}: {formatDate(offerCreatedExpires, locale)}
                          </small>
                        </div>
                      ) : null}
                    </>
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
