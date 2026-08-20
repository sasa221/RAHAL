"use client";

import type {
  CustomerAlternativeOfferResponse,
  CustomerInformationResponse,
  CustomerReservationDraftSummary,
  CustomerReservationDetail,
  CustomerReservationStatus,
  CustomerReservationSummary,
} from "@rahal/contracts";
import { useEffect, useMemo, useState } from "react";
import { formatEgp, localizedPath, type PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";
import { CustomerReviewPanel } from "./customer-review-panel";

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
    newRequest: "ابدأ طلبًا جديدًا",
    totalRequests: "إجمالي الطلبات",
    activeRequests: "طلبات جارية",
    actionRequests: "تحتاج ردك",
    savedDrafts: "مسودات محفوظة",
    draftsEyebrow: "أكمل من حيث توقفت",
    draftsTitle: "رحلات بدأت ولم تُرسل بعد",
    draftsCopy:
      "كل مسودة محفوظة في حسابك فقط ولا يراها فريق المبيعات. أكمل البيانات بأمان قبل موعد الاستلام.",
    draftProgress: "نسبة الاكتمال",
    draftUpdated: "آخر تحديث",
    draftExpires: "تنتهي عند موعد الاستلام",
    draftDocuments: "المستندات",
    resumeDraft: "استكمال المسودة",
    abandonDraft: "إلغاء المسودة",
    abandonTitle: "إلغاء هذه المسودة؟",
    abandonCopy:
      "سيتم إغلاق المسودة وحذف ملفاتها الخاصة من التخزين. لا يمكن التراجع عن هذا الإجراء.",
    keepDraft: "الاحتفاظ بها",
    confirmAbandon: "نعم، ألغِ المسودة",
    abandoningDraft: "جاري الإلغاء الآمن...",
    abandonFailed: "تعذر إلغاء المسودة الآن. حاول مرة أخرى.",
    draftStep: {
      CUSTOMER_DETAILS: "بيانات العميل",
      CONSENTS: "الموافقات",
      DOCUMENTS: "المستندات الخاصة",
      REVIEW: "المراجعة النهائية",
    },
    sentStep: "تم إرسال الطلب",
    reviewStep: "مراجعة المبيعات",
    branchStep: "زيارة الفرع والعربون",
    confirmedStep: "التأكيد النهائي",
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
    replaceDocument: "رفع مستند بديل",
    replacingDocument: "جاري الرفع الآمن…",
    replacementFailed: "تعذر رفع المستند البديل. استخدم JPEG أو PNG أو PDF صالحًا.",
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
    alternativeTitle: "عرض بديل من رحال",
    alternativeCopy: "راجع السيارة والمواعيد والسعر التقديري قبل الرد. قبول العرض لا يؤكد الحجز.",
    alternativePickup: "الاستلام المقترح",
    alternativeReturn: "الإرجاع المقترح",
    alternativeExpires: "ينتهي العرض",
    acceptAlternative: "قبول وإعادته للمراجعة",
    declineAlternative: "رفض العرض",
    respondingAlternative: "جاري تسجيل ردك...",
    alternativeAccepted: "تم قبول العرض وعاد الطلب إلى مراجعة فريق رحال.",
    alternativeDeclined: "تم رفض العرض وعاد الطلب إلى فريق رحال.",
    alternativeFailed: "تعذر تسجيل ردك. ربما انتهت صلاحية العرض أو تغير التوافر.",
    branchProgressTitle: "إجراءات الفرع",
    branchProgressCopy:
      "بعد الموافقة المبدئية تظهر هنا إجراءات الحضور والعربون والعقد حتى التأكيد النهائي.",
    attended: "تم تسجيل حضورك",
    attendancePending: "في انتظار حضورك للفرع",
    depositRecorded: "تم تسجيل العربون",
    depositPending: "في انتظار تسجيل العربون بالفرع",
    contractSigned: "تم تسجيل العقد الموقع",
    contractPending: "في انتظار توقيع العقد",
    finalBooking: "تم إنشاء الحجز النهائي",
    finalPending: "في انتظار التأكيد النهائي من الموظف المختص",
    bookingReference: "رقم الحجز",
    rentalProgressTitle: "رحلة الإيجار",
    readyForPickup: "الحجز جاهز للاستلام من الفرع",
    vehicleDelivered: "تم تسليم السيارة وبدأ الإيجار",
    waitingForReturn: "في انتظار إرجاع السيارة إلى فرع رحال",
    vehicleReturned: "تم تسجيل إرجاع السيارة",
    rentalCompleted: "اكتملت إجراءات الإيجار",
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
    newRequest: "Start a new request",
    totalRequests: "Total requests",
    activeRequests: "In progress",
    actionRequests: "Need your reply",
    savedDrafts: "Saved drafts",
    draftsEyebrow: "PICK UP WHERE YOU LEFT OFF",
    draftsTitle: "Journeys started, not yet submitted",
    draftsCopy:
      "Each draft stays inside your account and is invisible to sales. Finish it securely before pickup.",
    draftProgress: "Completion",
    draftUpdated: "Last updated",
    draftExpires: "Expires at pickup",
    draftDocuments: "Documents",
    resumeDraft: "Continue draft",
    abandonDraft: "Abandon draft",
    abandonTitle: "Abandon this draft?",
    abandonCopy:
      "The draft will close and its private files will be removed from storage. This cannot be undone.",
    keepDraft: "Keep it",
    confirmAbandon: "Yes, abandon draft",
    abandoningDraft: "Removing securely...",
    abandonFailed: "The draft could not be abandoned right now. Please try again.",
    draftStep: {
      CUSTOMER_DETAILS: "Customer details",
      CONSENTS: "Consent",
      DOCUMENTS: "Private documents",
      REVIEW: "Final review",
    },
    sentStep: "Request sent",
    reviewStep: "Sales review",
    branchStep: "Branch & deposit",
    confirmedStep: "Final confirmation",
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
    replaceDocument: "Upload replacement",
    replacingDocument: "Uploading securely…",
    replacementFailed: "The replacement could not be uploaded. Use a valid JPEG, PNG, or PDF.",
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
    alternativeTitle: "An alternative from Rahal",
    alternativeCopy:
      "Review the vehicle, dates, and estimate before responding. Accepting never confirms a booking.",
    alternativePickup: "Proposed pickup",
    alternativeReturn: "Proposed return",
    alternativeExpires: "Offer expires",
    acceptAlternative: "Accept and return to review",
    declineAlternative: "Decline offer",
    respondingAlternative: "Recording your response...",
    alternativeAccepted: "The alternative was accepted and returned to Rahal review.",
    alternativeDeclined: "The alternative was declined and returned to the Rahal team.",
    alternativeFailed:
      "Your response could not be recorded. The offer may have expired or changed.",
    branchProgressTitle: "Branch progress",
    branchProgressCopy:
      "After pre-approval, branch attendance, deposit, and contract progress appear here until final confirmation.",
    attended: "Attendance recorded",
    attendancePending: "Waiting for your branch visit",
    depositRecorded: "Deposit recorded",
    depositPending: "Waiting for the branch deposit",
    contractSigned: "Signed contract recorded",
    contractPending: "Waiting for contract signature",
    finalBooking: "Final booking created",
    finalPending: "Waiting for authorized staff confirmation",
    bookingReference: "Booking reference",
    rentalProgressTitle: "Rental journey",
    readyForPickup: "Booking ready for branch pickup",
    vehicleDelivered: "Vehicle delivered and rental started",
    waitingForReturn: "Waiting for return to the Rahal branch",
    vehicleReturned: "Vehicle return recorded",
    rentalCompleted: "Rental completion recorded",
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

function statusStep(status: CustomerReservationStatus) {
  if (["CONFIRMED", "ACTIVE", "COMPLETED"].includes(status)) return 4;
  if (["PRE_APPROVED", "REJECTED", "EXPIRED", "CANCELLED", "NO_SHOW"].includes(status)) return 3;
  if (["UNDER_REVIEW", "MORE_INFORMATION_REQUIRED", "ALTERNATIVE_OFFERED"].includes(status))
    return 2;
  return 1;
}

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
  const [drafts, setDrafts] = useState<CustomerReservationDraftSummary[]>([]);
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
  const [offerAction, setOfferAction] = useState<"ACCEPT" | "DECLINE" | null>(null);
  const [offerFeedback, setOfferFeedback] = useState<"ACCEPTED" | "DECLINED" | "ERROR" | null>(
    null,
  );
  const [uploadingDocument, setUploadingDocument] = useState("");
  const [documentUploadError, setDocumentUploadError] = useState(false);
  const [confirmAbandonId, setConfirmAbandonId] = useState<string | null>(null);
  const [abandoningDraftId, setAbandoningDraftId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState(false);

  useEffect(() => {
    void loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const [requestsResponse, draftsResponse] = await Promise.all([
        fetch(`/api/reservations/customer/requests?locale=${locale}`, {
          credentials: "include",
        }),
        fetch(`/api/reservations/customer/drafts?locale=${locale}`, {
          credentials: "include",
        }),
      ]);
      if (requestsResponse.status === 401 || draftsResponse.status === 401) {
        return setState("SIGNED_OUT");
      }
      if (requestsResponse.status === 403 || draftsResponse.status === 403) {
        return setState("FORBIDDEN");
      }
      if (!requestsResponse.ok || !draftsResponse.ok) {
        throw new Error("REQUESTS_UNAVAILABLE");
      }
      const requestsPayload = (await requestsResponse.json()) as {
        data: CustomerReservationSummary[];
      };
      const draftsPayload = (await draftsResponse.json()) as {
        data: CustomerReservationDraftSummary[];
      };
      setRequests(requestsPayload.data);
      setDrafts(draftsPayload.data);
      setState("READY");
      const requestedId = new URLSearchParams(window.location.search).get("request");
      const initial =
        requestsPayload.data.find((request) => request.id === requestedId) ??
        (requestsPayload.data.length === 1 ? requestsPayload.data[0] : undefined);
      if (initial) void openRequest(initial.id);
    } catch {
      setState("ERROR");
    } finally {
      setLoading(false);
    }
  }

  async function abandonDraft(id: string) {
    setAbandoningDraftId(id);
    setDraftError(false);
    try {
      const response = await fetch(`/api/reservations/customer/drafts/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("ABANDON_FAILED");
      setDrafts((current) => current.filter((draft) => draft.id !== id));
      setConfirmAbandonId(null);
    } catch {
      setDraftError(true);
    } finally {
      setAbandoningDraftId(null);
    }
  }

  async function openRequest(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setSent(false);
    setSendError(false);
    setOfferFeedback(null);
    try {
      const response = await fetch(`/api/reservations/customer/requests/${id}?locale=${locale}`, {
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

  async function uploadReplacement(type: string, file: File | undefined) {
    if (!detail || !file) return;
    setUploadingDocument(type);
    setDocumentUploadError(false);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `/api/reservations/drafts/${encodeURIComponent(detail.id)}/documents/${encodeURIComponent(type)}`,
        { method: "POST", credentials: "include", body },
      );
      if (!response.ok) throw new Error("UPLOAD_FAILED");
      await openRequest(detail.id);
    } catch {
      setDocumentUploadError(true);
    } finally {
      setUploadingDocument("");
    }
  }

  async function respondToAlternative(action: "ACCEPT" | "DECLINE") {
    if (!detail?.alternativeOffer) return;
    setOfferAction(action);
    setOfferFeedback(null);
    try {
      const response = await fetch(
        `/api/reservations/customer/requests/${detail.id}/alternative-offer`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = (await response.json()) as { data?: CustomerAlternativeOfferResponse };
      if (!response.ok || !payload.data) throw new Error("ALTERNATIVE_RESPONSE_FAILED");
      setRequests((current) =>
        current.map((request) =>
          request.id === detail.id
            ? { ...request, status: "UNDER_REVIEW", needsResponse: false }
            : request,
        ),
      );
      setDetail((current) =>
        current?.alternativeOffer
          ? {
              ...current,
              status: "UNDER_REVIEW",
              alternativeOffer: {
                ...current.alternativeOffer,
                status: payload.data!.offerStatus,
                respondedAt: payload.data!.respondedAt,
              },
            }
          : current,
      );
      setOfferFeedback(payload.data.offerStatus);
    } catch {
      setOfferFeedback("ERROR");
    } finally {
      setOfferAction(null);
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
  const activeCount = requests.filter((request) => !closedStatuses.has(request.status)).length;
  const actionCount = requests.filter((request) => request.needsResponse).length;

  return (
    <WorkspaceShell activePage="requests" kind="customer" locale={locale}>
      <div className="customer-requests-workspace" dir={locale === "ar" ? "rtl" : "ltr"}>
        <section className="portal-overview customer-requests-hero">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <a className="portal-primary-action" href={localizedPath(locale, "/cars")}>
            <span>+</span>
            {text.newRequest}
          </a>
        </section>

        <section className="portal-metrics" aria-label={text.requests}>
          <article>
            <span>01</span>
            <strong>{requests.length.toString().padStart(2, "0")}</strong>
            <p>{text.totalRequests}</p>
          </article>
          <article>
            <span>02</span>
            <strong>{activeCount.toString().padStart(2, "0")}</strong>
            <p>{text.activeRequests}</p>
          </article>
          <article className={actionCount ? "has-action" : ""}>
            <span>03</span>
            <strong>{actionCount.toString().padStart(2, "0")}</strong>
            <p>{text.actionRequests}</p>
          </article>
          <article className={drafts.length ? "has-action" : ""}>
            <span>04</span>
            <strong>{drafts.length.toString().padStart(2, "0")}</strong>
            <p>{text.savedDrafts}</p>
          </article>
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
          <>
            {drafts.length > 0 ? (
              <section className="customer-drafts-studio" aria-labelledby="customer-drafts-title">
                <header>
                  <div>
                    <span>{text.draftsEyebrow}</span>
                    <h2 id="customer-drafts-title">{text.draftsTitle}</h2>
                  </div>
                  <p>{text.draftsCopy}</p>
                </header>
                <div className="customer-drafts-track">
                  {drafts.map((draft, index) => {
                    const percentage = Math.round(
                      (draft.progress.completedSteps / draft.progress.totalSteps) * 100,
                    );
                    const resumeParams = new URLSearchParams({
                      vehicle: draft.vehicle.id,
                      draft: draft.id,
                    });
                    return (
                      <article className="customer-draft-card" key={draft.id}>
                        <div className="customer-draft-card__index">
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <small>{draft.reference}</small>
                        </div>
                        <div className="customer-draft-card__body">
                          <div className="customer-draft-card__title">
                            <div>
                              <span>{text.draftStep[draft.progress.nextStep]}</span>
                              <h3>{draft.vehicle.name}</h3>
                            </div>
                            <strong>{percentage}%</strong>
                          </div>
                          <div
                            aria-label={`${text.draftProgress}: ${percentage}%`}
                            aria-valuemax={100}
                            aria-valuemin={0}
                            aria-valuenow={percentage}
                            className="customer-draft-progress"
                            role="progressbar"
                          >
                            <span style={{ width: `${percentage}%` }} />
                          </div>
                          <dl>
                            <div>
                              <dt>{text.pickup}</dt>
                              <dd>{formatDate(draft.pickupAt, locale)}</dd>
                            </div>
                            <div>
                              <dt>{text.draftDocuments}</dt>
                              <dd>
                                {draft.progress.documentsUploaded}/
                                {draft.progress.documentsRequired || "—"}
                              </dd>
                            </div>
                            <div>
                              <dt>{text.estimate}</dt>
                              <dd>{formatEgp(draft.estimate.total, locale)}</dd>
                            </div>
                            <div>
                              <dt>{text.draftUpdated}</dt>
                              <dd>{formatDate(draft.updatedAt, locale)}</dd>
                            </div>
                          </dl>
                          <p className="customer-draft-expiry">
                            {text.draftExpires}:{" "}
                            <strong>{formatDate(draft.expiresAt, locale)}</strong>
                          </p>
                          {confirmAbandonId === draft.id ? (
                            <div className="customer-draft-confirm" role="alert">
                              <strong>{text.abandonTitle}</strong>
                              <p>{text.abandonCopy}</p>
                              <div>
                                <button
                                  disabled={abandoningDraftId === draft.id}
                                  onClick={() => void abandonDraft(draft.id)}
                                  type="button"
                                >
                                  {abandoningDraftId === draft.id
                                    ? text.abandoningDraft
                                    : text.confirmAbandon}
                                </button>
                                <button
                                  disabled={abandoningDraftId === draft.id}
                                  onClick={() => setConfirmAbandonId(null)}
                                  type="button"
                                >
                                  {text.keepDraft}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="customer-draft-actions">
                              <a
                                href={`${localizedPath(locale, "/reservation")}?${resumeParams.toString()}`}
                              >
                                {text.resumeDraft}
                                <span>→</span>
                              </a>
                              <button
                                onClick={() => {
                                  setDraftError(false);
                                  setConfirmAbandonId(draft.id);
                                }}
                                type="button"
                              >
                                {text.abandonDraft}
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {draftError ? <p className="customer-draft-error">{text.abandonFailed}</p> : null}
              </section>
            ) : null}
            <div className="customer-requests-layout" id="requests">
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
                      <ol className="customer-status-track" aria-label={text.status[detail.status]}>
                        {[text.sentStep, text.reviewStep, text.branchStep, text.confirmedStep].map(
                          (label, index) => (
                            <li
                              className={
                                index + 1 === statusStep(detail.status)
                                  ? "is-complete is-current"
                                  : index + 1 < statusStep(detail.status)
                                    ? "is-complete"
                                    : ""
                              }
                              key={label}
                            >
                              <span>{index + 1 < statusStep(detail.status) ? "✓" : index + 1}</span>
                              <small>{label}</small>
                            </li>
                          ),
                        )}
                      </ol>
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
                    {[
                      "PRE_APPROVED",
                      "CONFIRMED",
                      "ACTIVE",
                      "COMPLETED",
                      "CANCELLED",
                      "NO_SHOW",
                    ].includes(detail.status) && (
                      <section className="customer-branch-progress">
                        <div>
                          <span>03</span>
                          <div>
                            <h3>{text.branchProgressTitle}</h3>
                            <p>{text.branchProgressCopy}</p>
                          </div>
                        </div>
                        <ol>
                          <li className={detail.branchProgress.attended ? "is-complete" : ""}>
                            <span>{detail.branchProgress.attended ? "✓" : "1"}</span>
                            <strong>
                              {detail.branchProgress.attended
                                ? text.attended
                                : text.attendancePending}
                            </strong>
                          </li>
                          <li
                            className={detail.branchProgress.depositRecorded ? "is-complete" : ""}
                          >
                            <span>{detail.branchProgress.depositRecorded ? "✓" : "2"}</span>
                            <strong>
                              {detail.branchProgress.depositRecorded
                                ? text.depositRecorded
                                : text.depositPending}
                            </strong>
                          </li>
                          <li className={detail.branchProgress.contractSigned ? "is-complete" : ""}>
                            <span>{detail.branchProgress.contractSigned ? "✓" : "3"}</span>
                            <strong>
                              {detail.branchProgress.contractSigned
                                ? text.contractSigned
                                : text.contractPending}
                            </strong>
                          </li>
                          <li
                            className={detail.branchProgress.bookingReference ? "is-complete" : ""}
                          >
                            <span>{detail.branchProgress.bookingReference ? "✓" : "4"}</span>
                            <strong>
                              {detail.branchProgress.bookingReference
                                ? text.finalBooking
                                : text.finalPending}
                            </strong>
                            {detail.branchProgress.bookingReference && (
                              <small>
                                {text.bookingReference}: {detail.branchProgress.bookingReference}
                              </small>
                            )}
                          </li>
                        </ol>
                      </section>
                    )}
                    {detail.branchProgress.bookingReference &&
                      ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(detail.status) && (
                        <section className="customer-rental-progress">
                          <h3>{text.rentalProgressTitle}</h3>
                          <ol>
                            <li className="is-complete">
                              <span>✓</span>
                              <div>
                                <strong>{text.readyForPickup}</strong>
                                <small>{detail.branchProgress.bookingReference}</small>
                              </div>
                            </li>
                            <li className={detail.rentalProgress.deliveredAt ? "is-complete" : ""}>
                              <span>{detail.rentalProgress.deliveredAt ? "✓" : "2"}</span>
                              <div>
                                <strong>
                                  {detail.rentalProgress.deliveredAt
                                    ? text.vehicleDelivered
                                    : text.readyForPickup}
                                </strong>
                                {detail.rentalProgress.deliveredAt && (
                                  <small>
                                    {formatDate(detail.rentalProgress.deliveredAt, locale)}
                                  </small>
                                )}
                              </div>
                            </li>
                            <li className={detail.rentalProgress.returnedAt ? "is-complete" : ""}>
                              <span>{detail.rentalProgress.returnedAt ? "✓" : "3"}</span>
                              <div>
                                <strong>
                                  {detail.rentalProgress.returnedAt
                                    ? text.vehicleReturned
                                    : text.waitingForReturn}
                                </strong>
                                {detail.rentalProgress.returnedAt && (
                                  <small>
                                    {formatDate(detail.rentalProgress.returnedAt, locale)}
                                  </small>
                                )}
                              </div>
                            </li>
                            <li className={detail.rentalProgress.completedAt ? "is-complete" : ""}>
                              <span>{detail.rentalProgress.completedAt ? "✓" : "4"}</span>
                              <div>
                                <strong>{text.rentalCompleted}</strong>
                                {detail.rentalProgress.completedAt && (
                                  <small>
                                    {formatDate(detail.rentalProgress.completedAt, locale)}
                                  </small>
                                )}
                              </div>
                            </li>
                          </ol>
                        </section>
                      )}
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
                              {document.rejectionReason ? <p>{document.rejectionReason}</p> : null}
                              {document.status === "REJECTED" &&
                              detail.status === "MORE_INFORMATION_REQUIRED" ? (
                                <label className="customer-document-replacement">
                                  <span>
                                    {uploadingDocument === document.type
                                      ? text.replacingDocument
                                      : text.replaceDocument}
                                  </span>
                                  <input
                                    accept="image/jpeg,image/png,application/pdf"
                                    disabled={uploadingDocument !== ""}
                                    onChange={(event) =>
                                      void uploadReplacement(document.type, event.target.files?.[0])
                                    }
                                    type="file"
                                  />
                                </label>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                      {documentUploadError ? (
                        <p className="customer-document-upload-error">{text.replacementFailed}</p>
                      ) : null}
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
                    {detail.alternativeOffer && (
                      <section className="customer-alternative-offer">
                        <h3>{text.alternativeTitle}</h3>
                        <p>{text.alternativeCopy}</p>
                        <strong>{detail.alternativeOffer.vehicle.name}</strong>
                        <dl className="sales-detail-list">
                          <div>
                            <dt>{text.alternativePickup}</dt>
                            <dd>{formatDate(detail.alternativeOffer.proposedPickupAt, locale)}</dd>
                          </div>
                          <div>
                            <dt>{text.alternativeReturn}</dt>
                            <dd>{formatDate(detail.alternativeOffer.proposedReturnAt, locale)}</dd>
                          </div>
                          <div>
                            <dt>{text.estimate}</dt>
                            <dd>{formatEgp(detail.alternativeOffer.estimate.total, locale)}</dd>
                          </div>
                          <div>
                            <dt>{text.alternativeExpires}</dt>
                            <dd>{formatDate(detail.alternativeOffer.expiresAt, locale)}</dd>
                          </div>
                        </dl>
                        {detail.alternativeOffer.note && (
                          <blockquote>{detail.alternativeOffer.note}</blockquote>
                        )}
                        {detail.alternativeOffer.status === "PENDING" &&
                          detail.status === "ALTERNATIVE_OFFERED" && (
                            <div className="customer-alternative-actions">
                              <button
                                disabled={offerAction !== null}
                                type="button"
                                onClick={() => void respondToAlternative("ACCEPT")}
                              >
                                {offerAction === "ACCEPT"
                                  ? text.respondingAlternative
                                  : text.acceptAlternative}
                              </button>
                              <button
                                disabled={offerAction !== null}
                                type="button"
                                onClick={() => void respondToAlternative("DECLINE")}
                              >
                                {offerAction === "DECLINE"
                                  ? text.respondingAlternative
                                  : text.declineAlternative}
                              </button>
                            </div>
                          )}
                        {offerFeedback && (
                          <p
                            className={`customer-offer-feedback${offerFeedback === "ERROR" ? " is-error" : ""}`}
                          >
                            {offerFeedback === "ACCEPTED"
                              ? text.alternativeAccepted
                              : offerFeedback === "DECLINED"
                                ? text.alternativeDeclined
                                : text.alternativeFailed}
                          </p>
                        )}
                      </section>
                    )}
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
                    {detail.status === "COMPLETED" ? (
                      <CustomerReviewPanel locale={locale} reservationId={detail.id} />
                    ) : null}
                    <p className="sales-safety-note">{text.safety}</p>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
