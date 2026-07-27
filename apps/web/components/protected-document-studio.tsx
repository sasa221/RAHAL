"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { PublicLocale } from "../lib/public-content";

export type ProtectedReviewDocument = {
  id: string;
  type: string;
  status: string;
  uploadedAt: string;
  rejectionReason: string | null;
};

const labels: Record<string, { ar: string; en: string }> = {
  NATIONAL_ID_FRONT: { ar: "وجه بطاقة الرقم القومي", en: "National ID front" },
  NATIONAL_ID_BACK: { ar: "ظهر بطاقة الرقم القومي", en: "National ID back" },
  DRIVING_LICENSE_FRONT: { ar: "وجه رخصة القيادة", en: "Driving licence front" },
  DRIVING_LICENSE_BACK: { ar: "ظهر رخصة القيادة", en: "Driving licence back" },
  PASSPORT: { ar: "جواز السفر", en: "Passport" },
};

const copy = {
  en: {
    eyebrow: "PROTECTED DOCUMENTS",
    title: "Identity review, inside one secure studio.",
    subtitle:
      "Open each encrypted file only for a recorded operational purpose. Storage links and identity numbers remain hidden.",
    complete: "reviewed",
    open: "Open secure studio",
    uploaded: "Awaiting review",
    underReview: "Viewed",
    verified: "Verified",
    rejected: "Replacement required",
    close: "Close secure studio",
    previous: "Previous document",
    next: "Next document",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    rotate: "Rotate",
    reset: "Reset view",
    gateEyebrow: "AUDITED ACCESS",
    gateTitle: "State why this file is needed.",
    gateCopy:
      "The reason is recorded with your account and time. The browser receives only a temporary, non-cacheable preview.",
    accessReason: "Internal access reason",
    accessPlaceholder: "Example: Verify identity document for reservation eligibility",
    unlock: "Unlock protected preview",
    unlocking: "Opening protected preview...",
    viewerReady: "Preview unlocked",
    pdf: "Protected PDF preview",
    decisionEyebrow: "REVIEW DECISION",
    decisionClosed:
      "Decisions are locked because this request has progressed beyond document review.",
    decision: "Decision note",
    decisionPlaceholder: "Record what you checked and the reason for this decision",
    rejectionNotice: "A rejection note is visible to the customer and requests a replacement.",
    quickClear: "Clear and readable",
    quickMatch: "Details support the request",
    quickReplace: "Replacement image is required",
    verify: "Verify document",
    reject: "Reject & request replacement",
    saving: "Recording decision...",
    previewFirst: "Open the protected preview before recording a decision.",
    accessFailed:
      "This stored file is unavailable. The failed attempt was audited; ask the customer for a replacement if the object is missing.",
    actionFailed: "The document decision could not be recorded. Refresh the request and try again.",
    secure: "No download · no permanent URL · access audited",
    position: "Document",
  },
  ar: {
    eyebrow: "المستندات المحمية",
    title: "مراجعة الهوية داخل استوديو آمن واحد.",
    subtitle: "افتح كل ملف لغرض تشغيلي مسجل فقط. تظل روابط التخزين وأرقام الهوية مخفية بالكامل.",
    complete: "تمت مراجعتها",
    open: "فتح الاستوديو الآمن",
    uploaded: "بانتظار المراجعة",
    underReview: "تمت المعاينة",
    verified: "مقبول",
    rejected: "مطلوب بديل",
    close: "إغلاق الاستوديو الآمن",
    previous: "المستند السابق",
    next: "المستند التالي",
    zoomOut: "تصغير",
    zoomIn: "تكبير",
    rotate: "تدوير",
    reset: "إعادة العرض",
    gateEyebrow: "وصول مسجل",
    gateTitle: "اكتب سبب الحاجة لهذا الملف.",
    gateCopy: "يُسجل السبب مع حسابك والوقت. يستلم المتصفح معاينة مؤقتة غير قابلة للتخزين فقط.",
    accessReason: "سبب الوصول الداخلي",
    accessPlaceholder: "مثال: التحقق من المستند لاستكمال مراجعة أهلية الطلب",
    unlock: "فتح المعاينة المحمية",
    unlocking: "جاري فتح المعاينة...",
    viewerReady: "تم فتح المعاينة",
    pdf: "معاينة PDF محمية",
    decisionEyebrow: "قرار المراجعة",
    decisionClosed: "تم إغلاق القرارات لأن الطلب تجاوز مرحلة مراجعة المستندات.",
    decision: "ملاحظة القرار",
    decisionPlaceholder: "سجل ما راجعته وسبب القرار",
    rejectionNotice: "ملاحظة الرفض تظهر للعميل وتطلب منه رفع مستند بديل.",
    quickClear: "واضح ومقروء",
    quickMatch: "البيانات تدعم الطلب",
    quickReplace: "يلزم رفع صورة بديلة",
    verify: "قبول المستند",
    reject: "رفض وطلب بديل",
    saving: "جاري تسجيل القرار...",
    previewFirst: "افتح المعاينة المحمية قبل تسجيل القرار.",
    accessFailed:
      "الملف المخزن غير متاح. تم تسجيل محاولة الوصول؛ اطلب بديلًا من العميل إذا كان الملف مفقودًا.",
    actionFailed: "تعذر تسجيل قرار المستند. حدّث الطلب وحاول مرة أخرى.",
    secure: "بدون تنزيل · بدون رابط دائم · كل وصول مسجل",
    position: "المستند",
  },
} as const;

function statusText(status: string, locale: PublicLocale) {
  const text = copy[locale];
  if (status === "VERIFIED") return text.verified;
  if (status === "REJECTED") return text.rejected;
  if (status === "UNDER_REVIEW") return text.underReview;
  return text.uploaded;
}

function safeError(message: string, locale: PublicLocale) {
  if (
    message.includes("temporarily unavailable") ||
    message.includes("private document key") ||
    message.includes("storage is not configured")
  ) {
    return copy[locale].accessFailed;
  }
  if (message.includes("Preview this protected document")) return copy[locale].previewFirst;
  return copy[locale].actionFailed;
}

async function apiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message ?? "";
  } catch {
    return "";
  }
}

export function ProtectedDocumentStudio({
  documents,
  decisionsEnabled,
  locale,
  reservationId,
  onReviewed,
}: {
  documents: ProtectedReviewDocument[];
  decisionsEnabled: boolean;
  locale: PublicLocale;
  reservationId: string;
  onReviewed: () => Promise<void>;
}) {
  const text = copy[locale];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [accessReason, setAccessReason] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentMime, setDocumentMime] = useState("");
  const [busy, setBusy] = useState<"" | "VIEW" | "VERIFY" | "REJECT">("");
  const [error, setError] = useState("");
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(
    0,
    documents.findIndex((document) => document.id === activeId),
  );
  const activeDocument = activeId ? documents[activeIndex] : null;
  const reviewedCount = documents.filter((document) =>
    ["VERIFIED", "REJECTED"].includes(document.status),
  ).length;
  const progress = documents.length ? Math.round((reviewedCount / documents.length) * 100) : 0;
  const canVerify = Boolean(
    activeDocument &&
    decisionsEnabled &&
    ["UPLOADED", "UNDER_REVIEW", "REJECTED"].includes(activeDocument.status) &&
    documentUrl,
  );
  const canReject = Boolean(
    activeDocument &&
    decisionsEnabled &&
    ["UPLOADED", "UNDER_REVIEW"].includes(activeDocument.status) &&
    documentUrl,
  );
  const quickNotes = useMemo(
    () => [text.quickClear, text.quickMatch, text.quickReplace],
    [text.quickClear, text.quickMatch, text.quickReplace],
  );

  useEffect(() => {
    return () => {
      if (documentUrl) URL.revokeObjectURL(documentUrl);
    };
  }, [documentUrl]);

  useEffect(() => {
    if (!activeDocument) return;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveId(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [activeDocument]);

  function clearPreview() {
    if (documentUrl) URL.revokeObjectURL(documentUrl);
    setDocumentUrl("");
    setDocumentMime("");
    setAccessReason("");
    setDecisionReason("");
    setBusy("");
    setError("");
    setScale(1);
    setRotation(0);
  }

  function openDocument(document: ProtectedReviewDocument) {
    clearPreview();
    setActiveId(document.id);
  }

  function closeStudio() {
    clearPreview();
    setActiveId(null);
  }

  function move(direction: -1 | 1) {
    if (!documents.length) return;
    const nextIndex = (activeIndex + direction + documents.length) % documents.length;
    openDocument(documents[nextIndex]);
  }

  async function previewDocument() {
    if (!activeDocument || accessReason.trim().length < 10) return;
    setBusy("VIEW");
    setError("");
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(reservationId)}/documents/${encodeURIComponent(activeDocument.id)}/access`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: accessReason.trim() }),
        },
      );
      if (!response.ok) {
        throw new Error(await apiError(response));
      }
      const blob = await response.blob();
      if (documentUrl) URL.revokeObjectURL(documentUrl);
      setDocumentMime(blob.type);
      setDocumentUrl(URL.createObjectURL(blob));
      previewRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    } catch (caught) {
      setError(safeError(caught instanceof Error ? caught.message : "", locale));
    } finally {
      setBusy("");
    }
  }

  async function decide(action: "VERIFY" | "REJECT") {
    const actionAllowed = action === "VERIFY" ? canVerify : canReject;
    if (!activeDocument || !actionAllowed || decisionReason.trim().length < 10) return;
    setBusy(action);
    setError("");
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(reservationId)}/documents/${encodeURIComponent(activeDocument.id)}/review`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, reason: decisionReason.trim() }),
        },
      );
      if (!response.ok) throw new Error(await apiError(response));
      closeStudio();
      await onReviewed();
    } catch (caught) {
      setError(safeError(caught instanceof Error ? caught.message : "", locale));
      setBusy("");
    }
  }

  return (
    <section className="document-studio">
      <header className="document-studio__intro">
        <div>
          <span>{text.eyebrow}</span>
          <h3>{text.title}</h3>
          <p>{text.subtitle}</p>
        </div>
        <div
          className="document-studio__progress"
          style={
            {
              "--document-percent": `${progress}%`,
              "--document-progress": `${progress * 3.6}deg`,
            } as CSSProperties
          }
        >
          <strong>
            {reviewedCount}/{documents.length}
          </strong>
          <small>{text.complete}</small>
        </div>
      </header>

      {documents.length ? (
        <div className="document-studio__cards">
          {documents.map((document, index) => (
            <button
              className={`document-card is-${document.status.toLowerCase()}`}
              data-testid={`protected-document-${document.type}`}
              key={document.id}
              onClick={() => openDocument(document)}
              type="button"
            >
              <span className="document-card__index">{String(index + 1).padStart(2, "0")}</span>
              <span className="document-card__icon" aria-hidden="true">
                <i />
              </span>
              <span className="document-card__copy">
                <strong>{labels[document.type]?.[locale] ?? document.type}</strong>
                <small>{statusText(document.status, locale)}</small>
              </span>
              <span className="document-card__arrow">↗</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="document-studio__empty">
          {locale === "ar" ? "لا توجد مستندات مسجلة." : "No documents are recorded."}
        </p>
      )}

      {activeDocument && typeof document !== "undefined"
        ? createPortal(
            <div className="document-viewer-backdrop" dir={locale === "ar" ? "rtl" : "ltr"}>
              <section
                aria-label={labels[activeDocument.type]?.[locale] ?? activeDocument.type}
                aria-modal="true"
                className="document-viewer"
                role="dialog"
              >
                <header className="document-viewer__header">
                  <div>
                    <span>
                      {text.position} {activeIndex + 1} / {documents.length}
                    </span>
                    <h2>{labels[activeDocument.type]?.[locale] ?? activeDocument.type}</h2>
                  </div>
                  <span
                    className={`document-viewer__status is-${activeDocument.status.toLowerCase()}`}
                  >
                    {statusText(activeDocument.status, locale)}
                  </span>
                  <button aria-label={text.close} onClick={closeStudio} type="button">
                    ×
                  </button>
                </header>

                <div className="document-viewer__body">
                  <nav aria-label={text.eyebrow} className="document-viewer__rail">
                    {documents.map((document, index) => (
                      <button
                        aria-label={labels[document.type]?.[locale] ?? document.type}
                        className={document.id === activeDocument.id ? "is-active" : ""}
                        key={document.id}
                        onClick={() => openDocument(document)}
                        type="button"
                      >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <small>{labels[document.type]?.[locale] ?? document.type}</small>
                        <i className={`is-${document.status.toLowerCase()}`} />
                      </button>
                    ))}
                  </nav>

                  <div className="document-viewer__canvas">
                    <div className="document-viewer__toolbar">
                      <button aria-label={text.previous} onClick={() => move(-1)} type="button">
                        ←
                      </button>
                      <span>{text.secure}</span>
                      <div>
                        <button
                          aria-label={text.zoomOut}
                          disabled={!documentUrl || scale <= 0.65}
                          onClick={() => setScale((value) => Math.max(0.65, value - 0.15))}
                          type="button"
                        >
                          −
                        </button>
                        <button
                          aria-label={text.zoomIn}
                          disabled={!documentUrl || scale >= 2}
                          onClick={() => setScale((value) => Math.min(2, value + 0.15))}
                          type="button"
                        >
                          +
                        </button>
                        <button
                          aria-label={text.rotate}
                          disabled={!documentUrl || documentMime === "application/pdf"}
                          onClick={() => setRotation((value) => value + 90)}
                          type="button"
                        >
                          ↻
                        </button>
                        <button
                          aria-label={text.reset}
                          disabled={!documentUrl}
                          onClick={() => {
                            setScale(1);
                            setRotation(0);
                          }}
                          type="button"
                        >
                          1:1
                        </button>
                      </div>
                      <button aria-label={text.next} onClick={() => move(1)} type="button">
                        →
                      </button>
                    </div>

                    <div
                      className={`document-viewer__preview ${documentUrl ? "is-ready" : ""}`}
                      ref={previewRef}
                    >
                      {documentUrl ? (
                        documentMime === "application/pdf" ? (
                          <iframe src={documentUrl} title={text.pdf} />
                        ) : (
                          // The blob URL is temporary and created from an authenticated no-store response.
                          <img
                            alt={labels[activeDocument.type]?.[locale] ?? activeDocument.type}
                            src={documentUrl}
                            style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
                          />
                        )
                      ) : (
                        <div className="document-viewer__gate">
                          <span aria-hidden="true">R</span>
                          <small>{text.gateEyebrow}</small>
                          <h3>{text.gateTitle}</h3>
                          <p>{text.gateCopy}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <aside className="document-viewer__inspector">
                    <section>
                      <span>{text.gateEyebrow}</span>
                      <label>
                        <strong>{text.accessReason}</strong>
                        <textarea
                          maxLength={300}
                          minLength={10}
                          onChange={(event) => setAccessReason(event.target.value)}
                          placeholder={text.accessPlaceholder}
                          rows={4}
                          value={accessReason}
                        />
                        <small>{accessReason.trim().length}/300</small>
                      </label>
                      <button
                        className="document-viewer__unlock"
                        disabled={busy !== "" || accessReason.trim().length < 10}
                        onClick={() => void previewDocument()}
                        type="button"
                      >
                        {busy === "VIEW"
                          ? text.unlocking
                          : documentUrl
                            ? text.viewerReady
                            : text.unlock}
                      </button>
                    </section>

                    <section className={!documentUrl ? "is-locked" : ""}>
                      <span>{text.decisionEyebrow}</span>
                      <label>
                        <strong>{text.decision}</strong>
                        <textarea
                          maxLength={500}
                          minLength={10}
                          onChange={(event) => setDecisionReason(event.target.value)}
                          placeholder={text.decisionPlaceholder}
                          rows={4}
                          value={decisionReason}
                        />
                        <small>{decisionReason.trim().length}/500</small>
                      </label>
                      {!decisionsEnabled ? <p>{text.decisionClosed}</p> : null}
                      <div className="document-viewer__quick-notes">
                        {quickNotes.map((note) => (
                          <button key={note} onClick={() => setDecisionReason(note)} type="button">
                            + {note}
                          </button>
                        ))}
                      </div>
                      <p>{text.rejectionNotice}</p>
                      <div className="document-viewer__decisions">
                        <button
                          disabled={busy !== "" || !canVerify || decisionReason.trim().length < 10}
                          onClick={() => void decide("VERIFY")}
                          type="button"
                        >
                          {busy === "VERIFY" ? text.saving : text.verify}
                        </button>
                        <button
                          disabled={busy !== "" || !canReject || decisionReason.trim().length < 10}
                          onClick={() => void decide("REJECT")}
                          type="button"
                        >
                          {busy === "REJECT" ? text.saving : text.reject}
                        </button>
                      </div>
                    </section>

                    {error ? <p className="document-viewer__error">{error}</p> : null}
                  </aside>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
