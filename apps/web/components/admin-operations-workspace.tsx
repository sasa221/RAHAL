"use client";

import type {
  AdminAuditEntry,
  AdminAuditPage,
  AdminOperationsOverview,
  ApiSuccess,
} from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { AdminDocumentAccessLedger } from "./admin-document-access-ledger";
import { WorkspaceShell } from "./workspace-shell";

const copy = {
  en: {
    eyebrow: "RAHAL / OPERATIONS",
    title: "Every moving part, one clear command view.",
    subtitle:
      "Live signals from requests, confirmed rentals, fleet status and audited staff activity.",
    metrics: ["Open requests", "Confirmed", "Active rentals", "Available fleet", "Need attention"],
    activity: "14-day request activity",
    submitted: "Submitted",
    completed: "Completed",
    alerts: "Operational watch",
    recent: "Recent system activity",
    fleet: "Fleet state",
    audit: "Open full audit log",
    loading: "Preparing the operations center...",
    unavailable: "The operations center is unavailable or this account is not an administrator.",
    alertLabels: {
      OVERDUE_RENTALS: "Overdue active rentals",
      EXPIRING_PREAPPROVALS: "Pre-approvals expiring within 24 hours",
      FAILED_DELIVERIES: "Failed notification deliveries",
      PENDING_REVIEWS: "Customer reviews awaiting moderation",
    },
  },
  ar: {
    eyebrow: "رحال / العمليات",
    title: "كل حركة في مكان واحد، وبصورة واضحة.",
    subtitle: "مؤشرات مباشرة للطلبات والحجوزات المؤكدة وحالة الأسطول ونشاط الفريق المسجل.",
    metrics: ["طلبات مفتوحة", "حجوزات مؤكدة", "إيجارات نشطة", "سيارات متاحة", "تحتاج متابعة"],
    activity: "نشاط الطلبات خلال 14 يومًا",
    submitted: "طلبات مرسلة",
    completed: "مكتملة",
    alerts: "متابعة التشغيل",
    recent: "آخر نشاط في النظام",
    fleet: "حالة الأسطول",
    audit: "فتح سجل العمليات الكامل",
    loading: "جاري تجهيز مركز العمليات...",
    unavailable: "تعذر تحميل مركز العمليات أو أن هذا الحساب ليس حساب إدارة.",
    alertLabels: {
      OVERDUE_RENTALS: "إيجارات نشطة تجاوزت موعد العودة",
      EXPIRING_PREAPPROVALS: "موافقات مبدئية تنتهي خلال 24 ساعة",
      FAILED_DELIVERIES: "إشعارات تعذر إرسالها",
      PENDING_REVIEWS: "تقييمات عملاء بانتظار المراجعة",
    },
  },
} as const;

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function AuditRow({ entry, locale }: { entry: AdminAuditEntry; locale: PublicLocale }) {
  return (
    <article className="ops-audit-row">
      <span className={`ops-result ${entry.succeeded ? "is-success" : "is-failed"}`} />
      <div>
        <strong>{titleCase(entry.action)}</strong>
        <small>
          {entry.actorName} · {entry.actorRole ?? "System"}
        </small>
      </div>
      <div>
        <span>{entry.entityType}</span>
        <small>{entry.entityId ? `#${entry.entityId.slice(-8)}` : "—"}</small>
      </div>
      <time dateTime={entry.createdAt}>
        {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(entry.createdAt))}
      </time>
    </article>
  );
}

export function AdminOperationsWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [overview, setOverview] = useState<AdminOperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin-operations/overview?locale=${locale}`, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("UNAVAILABLE");
        setOverview(((await response.json()) as ApiSuccess<AdminOperationsOverview>).data);
      })
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [locale]);
  const chartMax = Math.max(
    1,
    ...(overview?.trend.flatMap((point) => [point.submitted, point.completed]) ?? [1]),
  );

  return (
    <WorkspaceShell activePage="overview" kind="admin" locale={locale}>
      <div className="ops-workspace">
        <section className="ops-hero">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="ops-hero-mark">
            <b>R</b>
            <span>LIVE</span>
          </div>
        </section>
        {loading ? (
          <div className="ops-state">{text.loading}</div>
        ) : !overview ? (
          <div className="ops-state is-error">{text.unavailable}</div>
        ) : (
          <>
            <section className="ops-metrics">
              {overview.metrics.map((metric, index) => (
                <article
                  className={metric.key === "ATTENTION_REQUIRED" ? "is-attention" : ""}
                  key={metric.key}
                >
                  <span>0{index + 1}</span>
                  <strong>
                    {metric.value.toLocaleString(locale === "ar" ? "ar-EG" : "en-GB")}
                  </strong>
                  <small>{text.metrics[index]}</small>
                </article>
              ))}
            </section>
            <div className="ops-grid">
              <section className="ops-panel ops-chart-panel">
                <header>
                  <div>
                    <span>ACTIVITY / 14D</span>
                    <h2>{text.activity}</h2>
                  </div>
                  <div className="ops-chart-key">
                    <span>{text.submitted}</span>
                    <span>{text.completed}</span>
                  </div>
                </header>
                <div className="ops-chart">
                  {overview.trend.map((point) => (
                    <div key={point.date}>
                      <span
                        className="is-submitted"
                        style={{ height: `${Math.max(4, (point.submitted / chartMax) * 100)}%` }}
                      />
                      <span
                        className="is-completed"
                        style={{ height: `${Math.max(4, (point.completed / chartMax) * 100)}%` }}
                      />
                      <small>{new Date(`${point.date}T00:00:00Z`).getUTCDate()}</small>
                    </div>
                  ))}
                </div>
              </section>
              <section className="ops-panel ops-alert-panel">
                <header>
                  <div>
                    <span>PRIORITY</span>
                    <h2>{text.alerts}</h2>
                  </div>
                </header>
                <div>
                  {overview.alerts.map((alert) => (
                    <a
                      className={`ops-alert is-${alert.severity.toLowerCase()}`}
                      href={localizedPath(locale, alert.href)}
                      key={alert.key}
                    >
                      <span>{String(alert.count).padStart(2, "0")}</span>
                      <div>
                        <strong>{text.alertLabels[alert.key]}</strong>
                        <small>
                          {alert.count === 0
                            ? locale === "ar"
                              ? "لا توجد حالات نشطة"
                              : "No active exceptions"
                            : locale === "ar"
                              ? "افتح مساحة العمل لاتخاذ إجراء"
                              : "Open the related workspace to act"}
                        </small>
                      </div>
                      <b>↗</b>
                    </a>
                  ))}
                </div>
              </section>
            </div>
            <div className="ops-grid ops-grid--lower">
              <section className="ops-panel">
                <header>
                  <div>
                    <span>IMMUTABLE RECORD</span>
                    <h2>{text.recent}</h2>
                  </div>
                  <a href={localizedPath(locale, "/admin/audit")}>{text.audit} →</a>
                </header>
                <div className="ops-audit-list">
                  {overview.recentActivity.map((entry) => (
                    <AuditRow entry={entry} key={entry.id} locale={locale} />
                  ))}
                </div>
              </section>
              <section className="ops-panel ops-fleet-panel">
                <header>
                  <div>
                    <span>LIVE STATUS</span>
                    <h2>{text.fleet}</h2>
                  </div>
                </header>
                <div>
                  {overview.fleet.map((item) => (
                    <article key={item.status}>
                      <span>{titleCase(item.status)}</span>
                      <strong>{item.count}</strong>
                      <i style={{ width: `${Math.min(100, item.count * 12)}%` }} />
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}

export function AdminAuditWorkspace({ locale }: { locale: PublicLocale }) {
  const [mode, setMode] = useState<"SYSTEM" | "DOCUMENTS">("SYSTEM");
  const [page, setPage] = useState<AdminAuditPage | null>(null);
  const [items, setItems] = useState<AdminAuditEntry[]>([]);
  const [filters, setFilters] = useState({ query: "", action: "", entityType: "", result: "" });
  const [loading, setLoading] = useState(true);
  const labels =
    locale === "ar"
      ? {
          eyebrow: "الحوكمة / السجل الثابت",
          title: "سجل كل قرار، بدون كشف بيانات العميل.",
          subtitle:
            "سجل للقراءة فقط يوضح من اتخذ الإجراء ومتى وعلى أي جزء من النظام، من دون مستندات أو أرقام هوية أو بيانات جهاز.",
          search: "ابحث باسم الإجراء أو نوع السجل...",
          actions: "كل الإجراءات",
          entities: "كل الأنواع",
          results: "كل النتائج",
          success: "ناجح",
          failed: "فشل",
          more: "تحميل المزيد",
          empty: "لا توجد نتائج مطابقة.",
          loading: "جاري تحميل السجل...",
          systemLog: "سجل النظام",
          documentLog: "رقابة المستندات",
          documentEyebrow: "الحوكمة / المستندات المحمية",
          documentTitle: "اعرف من فتح المستند، ولماذا، من غير كشف محتواه.",
          documentSubtitle:
            "سجل إداري منفصل لأسباب فتح مستندات العملاء وقرارات المراجعة ونتيجتها، مع بقاء الملفات وأرقام الهوية وبيانات الشبكة مخفية.",
        }
      : {
          eyebrow: "GOVERNANCE / IMMUTABLE LOG",
          title: "Every decision traceable. Customer data stays private.",
          subtitle:
            "A read-only record of who acted, when and where—without documents, identity numbers, network or device data.",
          search: "Search action, entity or actor...",
          actions: "All actions",
          entities: "All entities",
          results: "All results",
          success: "Succeeded",
          failed: "Failed",
          more: "Load more",
          empty: "No matching audit entries.",
          loading: "Loading the audit record...",
          systemLog: "System activity",
          documentLog: "Document oversight",
          documentEyebrow: "GOVERNANCE / PROTECTED DOCUMENTS",
          documentTitle: "Know who touched a document and why—without exposing it.",
          documentSubtitle:
            "A dedicated administrative record of protected-file access reasons, review decisions and outcomes while document bytes, identity numbers and network data stay hidden.",
        };
  const params = useMemo(
    () =>
      new URLSearchParams({
        locale,
        ...(filters.query ? { query: filters.query } : {}),
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
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
        const response = await fetch(`/api/admin-operations/audit?${query}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("UNAVAILABLE");
        const data = ((await response.json()) as ApiSuccess<AdminAuditPage>).data;
        setPage(data);
        setItems((current) => (cursor ? [...current, ...data.items] : data.items));
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
  return (
    <WorkspaceShell activePage="audit" kind="admin" locale={locale}>
      <div className="ops-workspace audit-workspace">
        <section className="ops-hero audit-hero">
          <div>
            <span>{mode === "SYSTEM" ? labels.eyebrow : labels.documentEyebrow}</span>
            <h1>{mode === "SYSTEM" ? labels.title : labels.documentTitle}</h1>
            <p>{mode === "SYSTEM" ? labels.subtitle : labels.documentSubtitle}</p>
          </div>
          <div className="ops-hero-mark">
            <b>{mode === "SYSTEM" ? "∞" : "R"}</b>
            <span>READ ONLY</span>
          </div>
        </section>
        <div className="audit-mode-switch" role="tablist" aria-label={labels.title}>
          <button
            aria-selected={mode === "SYSTEM"}
            onClick={() => setMode("SYSTEM")}
            role="tab"
            type="button"
          >
            <span>01</span>
            {labels.systemLog}
          </button>
          <button
            aria-selected={mode === "DOCUMENTS"}
            onClick={() => setMode("DOCUMENTS")}
            role="tab"
            type="button"
          >
            <span>02</span>
            {labels.documentLog}
          </button>
        </div>
        {mode === "SYSTEM" ? (
          <>
            <section className="audit-filters">
              <input
                aria-label={labels.search}
                onChange={(event) =>
                  setFilters((value) => ({ ...value, query: event.target.value }))
                }
                placeholder={labels.search}
                value={filters.query}
              />
              <select
                aria-label={labels.actions}
                onChange={(event) =>
                  setFilters((value) => ({ ...value, action: event.target.value }))
                }
                value={filters.action}
              >
                <option value="">{labels.actions}</option>
                {page?.availableActions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                aria-label={labels.entities}
                onChange={(event) =>
                  setFilters((value) => ({ ...value, entityType: event.target.value }))
                }
                value={filters.entityType}
              >
                <option value="">{labels.entities}</option>
                {page?.availableEntityTypes.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                aria-label={labels.results}
                onChange={(event) =>
                  setFilters((value) => ({ ...value, result: event.target.value }))
                }
                value={filters.result}
              >
                <option value="">{labels.results}</option>
                <option value="success">{labels.success}</option>
                <option value="failed">{labels.failed}</option>
              </select>
            </section>
            <section className="ops-panel audit-table">
              {loading && items.length === 0 ? (
                <div className="ops-state">{labels.loading}</div>
              ) : items.length === 0 ? (
                <div className="ops-state">{labels.empty}</div>
              ) : (
                <div className="ops-audit-list">
                  {items.map((entry) => (
                    <AuditRow entry={entry} key={entry.id} locale={locale} />
                  ))}
                </div>
              )}
            </section>
            {page?.nextCursor ? (
              <button
                className="audit-more"
                disabled={loading}
                onClick={() => void load(page.nextCursor ?? undefined)}
                type="button"
              >
                {labels.more}
              </button>
            ) : null}
          </>
        ) : (
          <AdminDocumentAccessLedger locale={locale} />
        )}
      </div>
    </WorkspaceShell>
  );
}
