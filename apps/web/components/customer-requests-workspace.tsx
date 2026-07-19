"use client";

import type {
  CustomerInformationResponse,
  CustomerReservationDetail,
  CustomerReservationStatus,
  CustomerReservationSummary,
} from "@rahal/contracts";
import { useEffect, useMemo, useState } from "react";
import { formatEgp, localizedPath, type PublicLocale } from "../lib/public-content";

type Filter = "ALL" | "ACTION" | "OPEN" | "CLOSED";

const copy = {
  ar: {
    brand: "رحال / حسابي",
    home: "الموقع الرئيسي",
    language: "English",
    eyebrow: "رحلتك مع رحال",
    title: "كل طلب، واضح من أول خطوة لآخرها.",
    subtitle:
      "تابع طلباتك ورسائل فريق رحال بأمان. الطلب المرسل ليس حجزًا مؤكدًا، والتأكيد النهائي يتم في الفرع فقط.",
    requests: "طلباتي",
    all: "الكل",
    action: "تحتاج ردك",
    open: "جارية",
    closed: "منتهية",
    loading: "جاري تحميل طلباتك...",
    empty: "لا توجد طلبات في هذا القسم حتى الآن.",
    signIn: "سجّل الدخول لعرض طلباتك",
    forbidden: "هذه الصفحة مخصصة لحسابات العملاء.",
    unavailable: "تعذر تحميل طلباتك الآن. حاول مرة أخرى.",
    submitted: "تاريخ الإرسال",
    pickup: "الاستلام",
    return: "الإرجاع",
    estimate: "التكلفة التقديرية",
    branch: "فرع رحال",
    openRequest: "عرض التفاصيل",
    select: "اختر طلبًا لمراجعة تفاصيله ورسائل فريق رحال.",
    details: "تفاصيل الطلب",
    driver: "مع سائق",
    selfDrive: "بدون سائق",
    documents: "حالة المستندات",
    noDocuments: "لا توجد مستندات مسجلة.",
    conversation: "محادثة الطلب",
    noMessages: "لا توجد رسائل على هذا الطلب حتى الآن.",
    rahal: "فريق رحال",
    you: "أنت",
    replyTitle: "مطلوب ردك",
    replyCopy: "اكتب المعلومة المطلوبة بوضوح. سيعود الطلب للمراجعة بعد الإرسال.",
    replyLabel: "ردك على فريق رحال",
    replyPlaceholder: "اكتب التفاصيل المطلوبة هنا (10 أحرف على الأقل)",
    replyHint: "من 10 إلى 500 حرف. لا ترسل أرقام هوية أو صور مستندات في الرسالة.",
    send: "إرسال الرد بأمان",
    sending: "جاري إرسال الرد...",
    sent: "وصل ردك وعاد الطلب إلى المراجعة.",
    sendFailed: "تعذر إرسال الرد. راجع الرسالة وحالة الطلب ثم حاول مرة أخرى.",
    safety:
      "لا تظهر صور المستندات أو أرقام الهوية هنا. التأكيد النهائي يتطلب الحضور للفرع، دفع العربون وتوقيع مستندات الإيجار.",
    expires: "تنتهي الموافقة المبدئية",
    status: {
      PENDING_REVIEW: "بانتظار المراجعة",
      UNDER_REVIEW: "قيد المراجعة",
      MORE_INFORMATION_REQUIRED: "معلومات إضافية مطلوبة",
      PRE_APPROVED: "موافقة مبدئية",
      ALTERNATIVE_OFFERED: "بديل مقترح",
      REJECTED: "مرفوض",
      EXPIRED: "منتهي",
      CONFIRMED: "مؤكد",
      ACTIVE: "نشط",
      COMPLETED: "مكتمل",
      CANCELLED: "ملغي",
      NO_SHOW: "عدم حضور",
    },
  },
  en: {
    brand: "RAHAL / MY ACCOUNT",
    home: "Public website",
    language: "العربية",
    eyebrow: "YOUR RAHAL JOURNEY",
    title: "Every request, clear from first step to last.",
    subtitle:
      "Track requests and Rahal team messages securely. A submitted request is not a confirmed booking; final confirmation happens at the branch only.",
    requests: "My requests",
    all: "All",
    action: "Needs your reply",
    open: "In progress",
    closed: "Closed",
    loading: "Loading your requests...",
    empty: "There are no requests in this section yet.",
    signIn: "Sign in to view your requests",
    forbidden: "This page is for customer accounts.",
    unavailable: "Your requests could not be loaded. Please try again.",
    submitted: "Submitted",
    pickup: "Pickup",
    return: "Return",
    estimate: "Estimated total",
    branch: "Rahal branch",
    openRequest: "View details",
    select: "Choose a request to review its details and Rahal team messages.",
    details: "Request details",
    driver: "With driver",
    selfDrive: "Self-drive",
    documents: "Document status",
    noDocuments: "No documents are recorded.",
    conversation: "Request conversation",
    noMessages: "There are no messages on this request yet.",
    rahal: "Rahal team",
    you: "You",
    replyTitle: "Your reply is needed",
    replyCopy:
      "Share the requested information clearly. The request returns to review after sending.",
    replyLabel: "Your reply to Rahal",
    replyPlaceholder: "Add the requested details here (at least 10 characters)",
    replyHint: "10–500 characters. Never put identity numbers or document images in this message.",
    send: "Send reply securely",
    sending: "Sending reply...",
    sent: "Your reply arrived and the request is back under review.",
    sendFailed:
      "The reply could not be sent. Check the message and request status, then try again.",
    safety:
      "Document images and identity numbers never appear here. Final confirmation requires branch attendance, deposit payment, and signed rental documents.",
    expires: "Pre-approval expires",
    status: {
      PENDING_REVIEW: "Pending review",
      UNDER_REVIEW: "Under review",
      MORE_INFORMATION_REQUIRED: "More information required",
      PRE_APPROVED: "Pre-approved",
      ALTERNATIVE_OFFERED: "Alternative offered",
      REJECTED: "Rejected",
      EXPIRED: "Expired",
      CONFIRMED: "Confirmed",
      ACTIVE: "Active",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
      NO_SHOW: "No show",
    },
  },
} as const;

const closedStatuses = new Set<CustomerReservationStatus>([
  "REJECTED",
  "EXPIRED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

function formatDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function documentLabel(type: string, locale: PublicLocale) {
  const labels: Record<string, [string, string]> = {
    NATIONAL_ID_FRONT: ["وجه بطاقة الرقم القومي", "National ID front"],
    NATIONAL_ID_BACK: ["ظهر بطاقة الرقم القومي", "National ID back"],
    DRIVING_LICENSE_FRONT: ["وجه رخصة القيادة", "Driving licence front"],
    DRIVING_LICENSE_BACK: ["ظهر رخصة القيادة", "Driving licence back"],
    PASSPORT: ["جواز السفر", "Passport"],
  };
  return labels[type]?.[locale === "ar" ? 0 : 1] ?? type.replaceAll("_", " ");
}

export function CustomerRequestsWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [requests, setRequests] = useState<CustomerReservationSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [state, setState] = useState<"READY" | "SIGNED_OUT" | "FORBIDDEN" | "ERROR">("READY");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const response = await fetch("/api/reservations/customer/requests", {
        credentials: "include",
      });
      if (response.status === 401) return setState("SIGNED_OUT");
      if (response.status === 403) return setState("FORBIDDEN");
      if (!response.ok) throw new Error("REQUESTS_UNAVAILABLE");
      const payload = (await response.json()) as { data: CustomerReservationSummary[] };
      setRequests(payload.data);
      setState("READY");
      if (payload.data.length === 1) void openRequest(payload.data[0]!.id);
    } catch {
      setState("ERROR");
    } finally {
      setLoading(false);
    }
  }

  async function openRequest(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setSent(false);
    setSendError(false);
    try {
      const response = await fetch(`/api/reservations/customer/requests/${id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("DETAIL_UNAVAILABLE");
      const payload = (await response.json()) as { data: CustomerReservationDetail };
      setDetail(payload.data);
    } catch {
      setDetail(null);
      setState("ERROR");
    } finally {
      setDetailLoading(false);
    }
  }

  async function sendReply() {
    if (!detail || message.trim().length < 10 || message.trim().length > 500) return;
    setSending(true);
    setSendError(false);
    try {
      const response = await fetch(`/api/reservations/customer/requests/${detail.id}/respond`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!response.ok) throw new Error("REPLY_FAILED");
      const payload = (await response.json()) as { data: CustomerInformationResponse };
      const body = message.trim();
      setRequests((current) =>
        current.map((request) =>
          request.id === detail.id
            ? { ...request, status: "UNDER_REVIEW", needsResponse: false }
            : request,
        ),
      );
      setDetail((current) =>
        current
          ? {
              ...current,
              status: "UNDER_REVIEW",
              needsResponse: false,
              messages: [
                ...current.messages,
                {
                  id: `reply-${payload.data.respondedAt}`,
                  sender: "CUSTOMER",
                  body,
                  createdAt: payload.data.respondedAt,
                },
              ],
            }
          : current,
      );
      setMessage("");
      setSent(true);
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  }

  const filtered = useMemo(
    () =>
      requests.filter((request) => {
        if (filter === "ACTION") return request.needsResponse;
        if (filter === "CLOSED") return closedStatuses.has(request.status);
        if (filter === "OPEN") return !closedStatuses.has(request.status);
        return true;
      }),
    [filter, requests],
  );

  return (
    <div className="customer-requests-workspace" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="sales-topbar">
        <a className="sales-brand" href={localizedPath(locale)}>
          <span>R</span>
          {text.brand}
        </a>
        <nav>
          <a href={localizedPath(locale)}>{text.home}</a>
          <a href={locale === "ar" ? "/en/account/requests" : "/account/requests"}>
            {text.language}
          </a>
        </nav>
      </header>
      <main>
        <section className="customer-requests-hero">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
          </div>
          <p>{text.subtitle}</p>
        </section>

        {state !== "READY" ? (
          <div className="sales-state sales-state--error">
            <p>
              {state === "SIGNED_OUT"
                ? text.signIn
                : state === "FORBIDDEN"
                  ? text.forbidden
                  : text.unavailable}
            </p>
            {state === "SIGNED_OUT" && (
              <a className="sales-card-button" href={localizedPath(locale, "/auth")}>
                {text.signIn}
                <span>→</span>
              </a>
            )}
          </div>
        ) : (
          <div className="customer-requests-layout">
            <section className="customer-request-list-panel">
              <div className="sales-section-heading">
                <span>01</span>
                <h2>{text.requests}</h2>
                <b>{requests.length}</b>
              </div>
              <div className="sales-filters" aria-label={text.requests}>
                {(["ALL", "ACTION", "OPEN", "CLOSED"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {value === "ALL"
                      ? text.all
                      : value === "ACTION"
                        ? text.action
                        : value === "OPEN"
                          ? text.open
                          : text.closed}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="sales-state">{text.loading}</div>
              ) : filtered.length === 0 ? (
                <div className="sales-state">{text.empty}</div>
              ) : (
                <div className="sales-request-list">
                  {filtered.map((request) => (
                    <article
                      className={`customer-request-card${selectedId === request.id ? " is-selected" : ""}`}
                      key={request.id}
                    >
                      <div className="sales-request-card__top">
                        <span
                          className={`sales-status sales-status--${request.status.toLowerCase()}`}
                        >
                          {text.status[request.status]}
                        </span>
                        <small>{request.reference}</small>
                      </div>
                      <h3>{request.vehicle.name}</h3>
                      <strong>{request.branch.name}</strong>
                      <dl>
                        <div>
                          <dt>{text.pickup}</dt>
                          <dd>{formatDate(request.pickupAt, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.return}</dt>
                          <dd>{formatDate(request.returnAt, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.estimate}</dt>
                          <dd>{formatEgp(request.estimate.total, locale)}</dd>
                        </div>
                      </dl>
                      <button
                        className="sales-card-button"
                        type="button"
                        onClick={() => void openRequest(request.id)}
                      >
                        {text.openRequest}
                        <span>→</span>
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="customer-request-detail">
              {detailLoading ? (
                <div className="sales-review-empty">{text.loading}</div>
              ) : !detail ? (
                <div className="sales-review-empty">{text.select}</div>
              ) : (
                <div className="customer-detail-content">
                  <header>
                    <span>{text.details}</span>
                    <h2>{detail.vehicle.name}</h2>
                    <p>{detail.reference}</p>
                    <b className={`sales-status sales-status--${detail.status.toLowerCase()}`}>
                      {text.status[detail.status]}
                    </b>
                  </header>
                  <section>
                    <dl className="sales-detail-list">
                      <div>
                        <dt>{text.submitted}</dt>
                        <dd>{formatDate(detail.submittedAt, locale)}</dd>
                      </div>
                      <div>
                        <dt>{text.branch}</dt>
                        <dd>{detail.branch.name}</dd>
                      </div>
                      <div>
                        <dt>{text.pickup}</dt>
                        <dd>{formatDate(detail.pickupAt, locale)}</dd>
                      </div>
                      <div>
                        <dt>{text.return}</dt>
                        <dd>{formatDate(detail.returnAt, locale)}</dd>
                      </div>
                      <div>
                        <dt>{text.estimate}</dt>
                        <dd>{formatEgp(detail.estimate.total, locale)}</dd>
                      </div>
                      <div>
                        <dt>{detail.driverRequested ? text.driver : text.selfDrive}</dt>
                        <dd>EGP</dd>
                      </div>
                    </dl>
                    {detail.preApprovalExpiresAt && (
                      <p className="customer-expiry">
                        {text.expires}:{" "}
                        <strong>{formatDate(detail.preApprovalExpiresAt, locale)}</strong>
                      </p>
                    )}
                  </section>
                  <section>
                    <h3>{text.documents}</h3>
                    {detail.documents.length === 0 ? (
                      <p>{text.noDocuments}</p>
                    ) : (
                      <ul className="sales-document-statuses">
                        {detail.documents.map((document) => (
                          <li key={document.type}>
                            <b>{documentLabel(document.type, locale)}</b>
                            <span>{document.status.replaceAll("_", " ")}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section>
                    <h3>{text.conversation}</h3>
                    {detail.messages.length === 0 ? (
                      <p>{text.noMessages}</p>
                    ) : (
                      <ol className="customer-conversation">
                        {detail.messages.map((item) => (
                          <li
                            className={item.sender === "CUSTOMER" ? "is-customer" : "is-rahal"}
                            key={item.id}
                          >
                            <span>
                              {item.sender === "CUSTOMER" ? text.you : text.rahal} ·{" "}
                              {formatDate(item.createdAt, locale)}
                            </span>
                            <p>{item.body}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                  {detail.needsResponse && (
                    <section className="customer-reply-panel">
                      <h3>{text.replyTitle}</h3>
                      <p>{text.replyCopy}</p>
                      <label>
                        <span>{text.replyLabel}</span>
                        <textarea
                          value={message}
                          maxLength={500}
                          onChange={(event) => setMessage(event.target.value)}
                          placeholder={text.replyPlaceholder}
                        />
                        <small>{text.replyHint}</small>
                      </label>
                      <button
                        className="sales-action sales-action--claim"
                        disabled={sending || message.trim().length < 10}
                        type="button"
                        onClick={() => void sendReply()}
                      >
                        {sending ? text.sending : text.send}
                        <span>→</span>
                      </button>
                      {sendError && <p className="sales-action-error">{text.sendFailed}</p>}
                    </section>
                  )}
                  {sent && <p className="customer-reply-success">{text.sent}</p>}
                  <p className="sales-safety-note">{text.safety}</p>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
