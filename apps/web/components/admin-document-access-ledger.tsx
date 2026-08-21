"use client";

import type {
  AdminDocumentAccessEntry,
  AdminDocumentAccessPage,
  ApiSuccess,
} from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";

const copy = {
  en: {
    eyebrow: "DOCUMENT GOVERNANCE",
    subtitle:
      "Review who opened or decided a customer document, why, when, and whether the action succeeded. Document bytes, storage paths, identity numbers, and network data never appear here.",
    search: "Search request, employee, action or reason...",
    actions: "All document actions",
    results: "All results",
    success: "Succeeded",
    failed: "Failed",
    total: "Visible records",
    successful: "Successful",
    denied: "Denied",
    actors: "Staff involved",
    loading: "Loading protected-document activity...",
    empty: "No document activity matches these filters.",
    more: "Load more document activity",
    request: "Reservation request",
    document: "Protected document",
    employee: "Staff actor",
    reason: "Recorded operational reason",
    open: "Open request",
    statuses: {
      UPLOADED: "Uploaded",
      UNDER_REVIEW: "Under review",
      VERIFIED: "Verified",
      REJECTED: "Replacement required",
      EXPIRED: "Expired",
    },
    actionLabels: {
      VIEW_INLINE: "Protected preview opened",
      REVIEW_VERIFY: "Document verified",
      REVIEW_REJECT: "Document rejected",
    },
  },
  ar: {
    eyebrow: "حوكمة المستندات",
    subtitle:
      "راجع من فتح مستند العميل أو اتخذ قرارًا عليه، والسبب والوقت والنتيجة. لا تظهر هنا صورة المستند أو مسار التخزين أو رقم الهوية أو بيانات الشبكة.",
    search: "ابحث بالطلب أو الموظف أو الإجراء أو السبب...",
    actions: "كل إجراءات المستندات",
    results: "كل النتائج",
    success: "ناجح",
    failed: "فشل",
    total: "السجلات الظاهرة",
    successful: "عمليات ناجحة",
    denied: "محاولات مرفوضة",
    actors: "الموظفون",
    loading: "جاري تحميل نشاط المستندات المحمية...",
    empty: "لا يوجد نشاط مستندات مطابق لهذه الفلاتر.",
    more: "تحميل المزيد من النشاط",
    request: "طلب الحجز",
    document: "المستند المحمي",
    employee: "الموظف",
    reason: "السبب التشغيلي المسجل",
    open: "فتح الطلب",
    statuses: {
      UPLOADED: "تم الرفع",
      UNDER_REVIEW: "قيد المراجعة",
      VERIFIED: "مقبول",
      REJECTED: "مطلوب بديل",
      EXPIRED: "منتهي",
    },
    actionLabels: {
      VIEW_INLINE: "فتح المعاينة المحمية",
      REVIEW_VERIFY: "قبول المستند",
      REVIEW_REJECT: "رفض المستند",
    },
  },
} as const;

const documentLabels = {
  en: {
    NATIONAL_ID_FRONT: "National ID front",
    NATIONAL_ID_BACK: "National ID back",
    DRIVING_LICENSE_FRONT: "Driving licence front",
    DRIVING_LICENSE_BACK: "Driving licence back",
    PASSPORT: "Passport",
  },
  ar: {
    NATIONAL_ID_FRONT: "وجه بطاقة الرقم القومي",
    NATIONAL_ID_BACK: "ظهر بطاقة الرقم القومي",
    DRIVING_LICENSE_FRONT: "وجه رخصة القيادة",
    DRIVING_LICENSE_BACK: "ظهر رخصة القيادة",
    PASSPORT: "جواز السفر",
  },
} as const;

function formatDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminDocumentAccessLedger({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [page, setPage] = useState<AdminDocumentAccessPage | null>(null);
  const [items, setItems] = useState<AdminDocumentAccessEntry[]>([]);
  const [filters, setFilters] = useState({ query: "", action: "", result: "" });
  const [loading, setLoading] = useState(true);
  const params = useMemo(
    () =>
      new URLSearchParams({
        locale,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.result ? { result: filters.result } : {}),
      }),
    [filters, locale],
  );
  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const query = new URLSearchParams(params);
        if (cursor) query.set("cursor", cursor);
        const response = await fetch(`/api/admin-operations/document-access?${query}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("UNAVAILABLE");
        const data = ((await response.json()) as ApiSuccess<AdminDocumentAccessPage>).data;
        setPage(data);
        setItems((current) => (cursor ? [...current, ...data.items] : data.items));
      } catch {
        if (!cursor) {
          setPage(null);
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [params],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const successful = items.filter((item) => item.succeeded).length;
  const staffCount = new Set(items.map((item) => item.actorName)).size;

  return (
    <section className="document-ledger">
      <header className="document-ledger__bar">
        <span>
          <i />
          {text.eyebrow}
        </span>
        <p>{text.subtitle}</p>
      </header>

      <section className="document-ledger__metrics" aria-label={text.eyebrow}>
        {[
          [text.total, items.length],
          [text.successful, successful],
          [text.denied, items.length - successful],
          [text.actors, staffCount],
        ].map(([label, value], index) => (
          <article key={label}>
            <span>0{index + 1}</span>
            <strong>{Number(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")}</strong>
            <small>{label}</small>
          </article>
        ))}
      </section>

      <div className="document-ledger__filters">
        <input
          aria-label={text.search}
          onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
          placeholder={text.search}
          value={filters.query}
        />
        <select
          aria-label={text.actions}
          onChange={(event) =>
            setFilters((current) => ({ ...current, action: event.target.value }))
          }
          value={filters.action}
        >
          <option value="">{text.actions}</option>
          {page?.availableActions.map((action) => (
            <option key={action} value={action}>
              {text.actionLabels[action as keyof typeof text.actionLabels] ?? action}
            </option>
          ))}
        </select>
        <select
          aria-label={text.results}
          onChange={(event) =>
            setFilters((current) => ({ ...current, result: event.target.value }))
          }
          value={filters.result}
        >
          <option value="">{text.results}</option>
          <option value="success">{text.success}</option>
          <option value="failed">{text.failed}</option>
        </select>
      </div>

      {loading && items.length === 0 ? (
        <div className="ops-state">{text.loading}</div>
      ) : items.length === 0 ? (
        <div className="ops-state">{text.empty}</div>
      ) : (
        <div className="document-ledger__list">
          {items.map((entry, index) => (
            <article
              className={`document-ledger__entry ${entry.succeeded ? "is-success" : "is-failed"}`}
              key={entry.id}
              style={{ "--ledger-index": index } as CSSProperties}
            >
              <div className="document-ledger__number">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i />
              </div>
              <div className="document-ledger__content">
                <header>
                  <div>
                    <span>{entry.succeeded ? text.success : text.failed}</span>
                    <h3>
                      {text.actionLabels[entry.action as keyof typeof text.actionLabels] ??
                        entry.action}
                    </h3>
                  </div>
                  <time dateTime={entry.createdAt}>{formatDate(entry.createdAt, locale)}</time>
                </header>
                <dl>
                  <div>
                    <dt>{text.employee}</dt>
                    <dd>
                      {entry.actorName}
                      <small>{entry.actorRole}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>{text.request}</dt>
                    <dd>
                      {entry.reservationReference}
                      <a
                        href={`${localizedPath(locale, "/admin/requests")}?request=${encodeURIComponent(
                          entry.reservationId,
                        )}`}
                      >
                        {text.open} ↗
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>{text.document}</dt>
                    <dd>
                      {documentLabels[locale][entry.documentType]}
                      <small>{text.statuses[entry.documentStatus]}</small>
                    </dd>
                  </div>
                </dl>
                <blockquote>
                  <span>{text.reason}</span>
                  <p>{entry.reason}</p>
                </blockquote>
              </div>
            </article>
          ))}
        </div>
      )}

      {page?.nextCursor ? (
        <button
          className="audit-more"
          disabled={loading}
          onClick={() => void load(page.nextCursor ?? undefined)}
          type="button"
        >
          {text.more}
        </button>
      ) : null}
    </section>
  );
}
