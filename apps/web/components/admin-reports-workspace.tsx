"use client";

import type {
  AdminReportMetric,
  AdminReportRangeDays,
  AdminReportsOverview,
  ApiSuccess,
} from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";

const rangeOptions: AdminReportRangeDays[] = [7, 30, 90, 365];

const copy = {
  ar: {
    eyebrow: "رحال / ذكاء التشغيل",
    title: "كل قرار يبدأ بصورة كاملة.",
    subtitle: "طلبات وحجوزات وأداء أسطول وفريق في لوحة واحدة، بأرقام مباشرة من قاعدة رحال.",
    range: "الفترة",
    branch: "الفرع",
    allBranches: "كل الفروع",
    ranges: { 7: "7 أيام", 30: "30 يوم", 90: "90 يوم", 365: "سنة" },
    export: "تصدير CSV",
    refreshed: "آخر تحديث",
    loading: "بنجهز صورة التشغيل الحقيقية...",
    error: "تعذر تحميل التقارير الآن. حاول مرة أخرى.",
    retry: "إعادة المحاولة",
    currentPeriod: "مقارنة بالفترة السابقة",
    newActivity: "نشاط جديد",
    metrics: {
      SUBMITTED_REQUESTS: ["طلبات مرسلة", "طلبات دخلت المراجعة خلال الفترة"],
      COHORT_CONFIRMATION_RATE: ["نسبة التأكيد", "من نفس طلبات الفترة، وليس حجوزات قديمة"],
      COMPLETED_RENTALS: ["إيجارات مكتملة", "عمليات انتهت فعليًا خلال الفترة"],
      DEPOSITS_RECORDED_EGP: ["عربون مسجّل بالفرع", "قيمة مسجلة بإيصالات وليست إيرادًا إلكترونيًا"],
      MEDIAN_FIRST_REVIEW_MINUTES: ["بدء المراجعة", "الزمن الوسيط من الإرسال لأول مراجعة"],
      FLEET_UTILIZATION_RATE: ["استخدام الأسطول", "أيام الإشغال من الطاقة المتاحة الحالية"],
    },
    trendEyebrow: "الحركة عبر الوقت",
    trendTitle: "من الطلب إلى رحلة مكتملة.",
    submitted: "مرسل",
    confirmed: "مؤكد",
    completed: "مكتمل",
    deposits: "عربون EGP",
    funnelEyebrow: "مسار الطلبات",
    funnelTitle: "أين تتحرك الطلبات وأين تتوقف؟",
    funnel: {
      SUBMITTED: "تم الإرسال",
      REVIEW_STARTED: "بدأت المراجعة",
      PRE_APPROVED: "موافقة مبدئية",
      CONFIRMED: "تأكيد نهائي",
      COMPLETED: "رحلة مكتملة",
      LOST: "مرفوض / منتهي / ملغي",
    },
    today: "اليوم في الفرع",
    pickups: "استلامات اليوم",
    returns: "إرجاعات اليوم",
    fleetEyebrow: "الأسطول",
    fleetTitle: "طاقة حقيقية، مش مجرد عدد عربيات.",
    utilization: "استخدام",
    occupiedDays: "يوم إشغال",
    capacityDays: "يوم طاقة متاحة",
    activeVehicles: "عربية نشطة",
    vehiclePerformance: "أداء العربيات",
    vehicle: "العربية",
    requests: "طلبات",
    occupied: "إشغال",
    emptyVehicles: "لا توجد حركة عربيات في الفترة المختارة.",
    teamEyebrow: "فريق المبيعات",
    teamTitle: "حجم المتابعة وسرعة الاستجابة.",
    assigned: "مُسند",
    firstReview: "أول مراجعة",
    noReview: "—",
    emptySales: "لا توجد طلبات مسندة لموظفي مبيعات في هذه الفترة.",
    qualityTrusted: "البيانات جاهزة لاتخاذ القرار",
    qualityReview: "توجد نقاط بيانات تحتاج مراجعة",
    qualityCopy:
      "الفحص يراجع اكتمال التواريخ، حضور الفرع، قيمة العربون، والتسلسل التشغيلي. لا يعرض بيانات عملاء.",
    qualityChecks: {
      MISSING_SUBMISSION_TIME: "طلب تشغيلي بدون وقت إرسال",
      MISSING_COMPLETION_TIME: "طلب مكتمل بدون وقت اكتمال",
      DEPOSIT_WITHOUT_ATTENDANCE: "عربون بدون حضور فرع مسجل",
      BOOKING_WITHOUT_COMPLETION_TIME: "حجز مكتمل بدون وقت اكتمال",
      FUTURE_SUBMISSION_TIME: "وقت إرسال في المستقبل",
      INVALID_DEPOSIT_AMOUNT: "قيمة عربون غير صالحة",
    },
    noIssues: "كل فحوص الجودة اجتازت بنجاح.",
    caveat:
      "معدل الاستخدام يقسم أيام الإشغال على عدد العربيات النشطة حاليًا؛ تغييرات الأسطول التاريخية غير متاحة بعد.",
    csvMetric: "المؤشر",
    csvValue: "القيمة",
  },
  en: {
    eyebrow: "RAHAL / OPERATING INTELLIGENCE",
    title: "See the whole operation before the next decision.",
    subtitle:
      "Requests, bookings, fleet and team performance in one live view sourced directly from Rahal records.",
    range: "Range",
    branch: "Branch",
    allBranches: "All branches",
    ranges: { 7: "7 days", 30: "30 days", 90: "90 days", 365: "One year" },
    export: "Export CSV",
    refreshed: "Refreshed",
    loading: "Building the live operating picture...",
    error: "Reports are temporarily unavailable. Please try again.",
    retry: "Try again",
    currentPeriod: "versus the previous period",
    newActivity: "New activity",
    metrics: {
      SUBMITTED_REQUESTS: ["Submitted requests", "Requests entering review in this period"],
      COHORT_CONFIRMATION_RATE: ["Confirmation rate", "From this period's request cohort only"],
      COMPLETED_RENTALS: ["Completed rentals", "Rentals operationally completed in the period"],
      DEPOSITS_RECORDED_EGP: [
        "Branch deposits recorded",
        "Receipt-backed EGP, never online revenue",
      ],
      MEDIAN_FIRST_REVIEW_MINUTES: ["Review start", "Median time from submission to first review"],
      FLEET_UTILIZATION_RATE: [
        "Fleet utilization",
        "Occupied days over current available capacity",
      ],
    },
    trendEyebrow: "MOVEMENT OVER TIME",
    trendTitle: "From submitted request to completed journey.",
    submitted: "Submitted",
    confirmed: "Confirmed",
    completed: "Completed",
    deposits: "Deposit EGP",
    funnelEyebrow: "REQUEST FUNNEL",
    funnelTitle: "Where requests progress—and where they stop.",
    funnel: {
      SUBMITTED: "Submitted",
      REVIEW_STARTED: "Review started",
      PRE_APPROVED: "Pre-approved",
      CONFIRMED: "Finally confirmed",
      COMPLETED: "Completed rental",
      LOST: "Rejected / expired / cancelled",
    },
    today: "At the branch today",
    pickups: "Today's pickups",
    returns: "Today's returns",
    fleetEyebrow: "FLEET",
    fleetTitle: "Real capacity, not just a vehicle count.",
    utilization: "utilization",
    occupiedDays: "occupied days",
    capacityDays: "capacity days",
    activeVehicles: "active vehicles",
    vehiclePerformance: "Vehicle performance",
    vehicle: "Vehicle",
    requests: "Requests",
    occupied: "Occupied",
    emptyVehicles: "No vehicle activity exists in the selected period.",
    teamEyebrow: "SALES TEAM",
    teamTitle: "Workload, outcomes and response speed.",
    assigned: "Assigned",
    firstReview: "First review",
    noReview: "—",
    emptySales: "No requests were assigned to sales employees in this period.",
    qualityTrusted: "Data is ready for operational decisions",
    qualityReview: "Some records need data-quality review",
    qualityCopy:
      "Checks cover timestamps, branch attendance, deposit validity and lifecycle consistency. Customer data is never shown.",
    qualityChecks: {
      MISSING_SUBMISSION_TIME: "Operational request without submission time",
      MISSING_COMPLETION_TIME: "Completed request without completion time",
      DEPOSIT_WITHOUT_ATTENDANCE: "Deposit without recorded branch attendance",
      BOOKING_WITHOUT_COMPLETION_TIME: "Completed booking without completion time",
      FUTURE_SUBMISSION_TIME: "Submission timestamp in the future",
      INVALID_DEPOSIT_AMOUNT: "Invalid deposit amount",
    },
    noIssues: "Every data-quality check passed.",
    caveat:
      "Utilization divides occupied days by today's active fleet capacity; historical fleet-size changes are not yet modeled.",
    csvMetric: "Metric",
    csvValue: "Value",
  },
} as const;

export function AdminReportsWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [rangeDays, setRangeDays] = useState<AdminReportRangeDays>(30);
  const [branchId, setBranchId] = useState("");
  const [report, setReport] = useState<AdminReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const query = new URLSearchParams({ range: String(rangeDays) });
    if (branchId) query.set("branchId", branchId);
    try {
      const response = await fetch(`/api/admin-operations/reports?${query}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("REPORT_UNAVAILABLE");
      setReport(((await response.json()) as ApiSuccess<AdminReportsOverview>).data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [branchId, rangeDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  return (
    <WorkspaceShell activePage="reports" kind="admin" locale={locale}>
      <div className="reports-workspace">
        <section className="reports-hero">
          <div>
            <span className="reports-kicker">{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="reports-hero__pulse" aria-hidden="true">
            <span>R</span>
            <i />
            <b>LIVE</b>
          </div>
        </section>

        <section className="reports-toolbar" aria-label={text.range}>
          <div className="reports-range" role="group" aria-label={text.range}>
            {rangeOptions.map((days) => (
              <button
                aria-pressed={rangeDays === days}
                key={days}
                onClick={() => setRangeDays(days)}
                type="button"
              >
                {text.ranges[days]}
              </button>
            ))}
          </div>
          <label>
            <span>{text.branch}</span>
            <select onChange={(event) => setBranchId(event.target.value)} value={branchId}>
              <option value="">{text.allBranches}</option>
              {report?.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {locale === "ar" ? branch.nameAr : branch.nameEn}
                </option>
              ))}
            </select>
          </label>
          <button
            className="reports-export"
            disabled={!report}
            onClick={() => report && exportReport(report, locale, text)}
            type="button"
          >
            <DownloadIcon />
            {text.export}
          </button>
        </section>

        {loading && !report ? (
          <ReportsLoading label={text.loading} />
        ) : error || !report ? (
          <section className="reports-error" role="alert">
            <span>!</span>
            <p>{text.error}</p>
            <button onClick={() => void load()} type="button">
              {text.retry}
            </button>
          </section>
        ) : (
          <>
            <div className={`reports-refresh${loading ? " is-loading" : ""}`}>
              <span />
              {text.refreshed} {formatter.format(new Date(report.generatedAt))}
            </div>

            <section className="reports-metrics">
              {report.metrics.map((metric, index) => (
                <MetricCard index={index} key={metric.key} locale={locale} metric={metric} />
              ))}
            </section>

            <section className="reports-grid reports-grid--lead">
              <article className="report-panel report-panel--trend">
                <PanelHeading eyebrow={text.trendEyebrow} title={text.trendTitle} />
                <TrendChart locale={locale} report={report} />
                <div className="report-legend">
                  <span className="is-submitted">{text.submitted}</span>
                  <span className="is-confirmed">{text.confirmed}</span>
                  <span className="is-completed">{text.completed}</span>
                </div>
              </article>

              <article className="report-panel report-panel--funnel">
                <PanelHeading eyebrow={text.funnelEyebrow} title={text.funnelTitle} />
                <div className="report-funnel">
                  {report.funnel.map((point) => {
                    const total = report.funnel[0]?.value || 1;
                    return (
                      <div className={point.key === "LOST" ? "is-lost" : ""} key={point.key}>
                        <span>
                          <b>{text.funnel[point.key]}</b>
                          <strong>{formatNumber(point.value, locale)}</strong>
                        </span>
                        <i
                          style={
                            {
                              "--bar": `${Math.max(3, (point.value / total) * 100)}%`,
                            } as CSSProperties
                          }
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="report-today">
                  <span>{text.today}</span>
                  <div>
                    <strong>{formatNumber(report.today.pickups, locale)}</strong>
                    <small>{text.pickups}</small>
                  </div>
                  <div>
                    <strong>{formatNumber(report.today.returns, locale)}</strong>
                    <small>{text.returns}</small>
                  </div>
                </div>
              </article>
            </section>

            <section className="reports-grid reports-grid--fleet">
              <article className="report-panel report-panel--utilization">
                <PanelHeading eyebrow={text.fleetEyebrow} title={text.fleetTitle} />
                <div className="fleet-utilization">
                  <div
                    className="fleet-utilization__dial"
                    style={
                      {
                        "--utilization": `${Math.min(report.fleet.utilizationRate, 100)}%`,
                      } as CSSProperties
                    }
                  >
                    <span>
                      <strong>{formatNumber(report.fleet.utilizationRate, locale)}%</strong>
                      <small>{text.utilization}</small>
                    </span>
                  </div>
                  <div className="fleet-utilization__facts">
                    <div>
                      <strong>{formatNumber(report.fleet.occupiedDays, locale)}</strong>
                      <span>{text.occupiedDays}</span>
                    </div>
                    <div>
                      <strong>{formatNumber(report.fleet.capacityDays, locale)}</strong>
                      <span>{text.capacityDays}</span>
                    </div>
                    <div>
                      <strong>{formatNumber(report.fleet.activeVehicles, locale)}</strong>
                      <span>{text.activeVehicles}</span>
                    </div>
                  </div>
                </div>
                <div className="fleet-status-strip">
                  {report.fleet.statusMix.map((item) => (
                    <span key={item.status}>
                      <i data-status={item.status} />
                      {humanize(item.status)} <b>{formatNumber(item.count, locale)}</b>
                    </span>
                  ))}
                </div>
                <p className="report-caveat">{text.caveat}</p>
              </article>

              <article className="report-panel report-panel--vehicles">
                <h2>{text.vehiclePerformance}</h2>
                {report.vehicles.length ? (
                  <div className="report-table" role="table" aria-label={text.vehiclePerformance}>
                    <div className="report-table__head" role="row">
                      <span>{text.vehicle}</span>
                      <span>{text.requests}</span>
                      <span>{text.confirmed}</span>
                      <span>{text.occupied}</span>
                    </div>
                    {report.vehicles.map((vehicle) => (
                      <div className="report-table__row" key={vehicle.vehicleId} role="row">
                        <span>
                          <i>R</i>
                          <b>{locale === "ar" ? vehicle.nameAr : vehicle.nameEn}</b>
                        </span>
                        <strong>{formatNumber(vehicle.requests, locale)}</strong>
                        <strong>{formatNumber(vehicle.confirmed, locale)}</strong>
                        <strong>{formatNumber(vehicle.occupiedDays, locale)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyReport label={text.emptyVehicles} />
                )}
              </article>
            </section>

            <section className="report-panel report-panel--team">
              <PanelHeading eyebrow={text.teamEyebrow} title={text.teamTitle} />
              {report.sales.length ? (
                <div className="sales-performance">
                  {report.sales.map((member, index) => (
                    <article key={member.userId}>
                      <span className="sales-performance__rank">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="sales-performance__person">
                        <i>{(locale === "ar" ? member.nameAr : member.nameEn)?.charAt(0) || "R"}</i>
                        <span>
                          <strong>
                            {locale === "ar" && member.nameAr ? member.nameAr : member.nameEn}
                          </strong>
                          <small>
                            {text.assigned}: {formatNumber(member.assigned, locale)}
                          </small>
                        </span>
                      </div>
                      <div>
                        <strong>{formatNumber(member.confirmed, locale)}</strong>
                        <small>{text.confirmed}</small>
                      </div>
                      <div>
                        <strong>{formatNumber(member.completed, locale)}</strong>
                        <small>{text.completed}</small>
                      </div>
                      <div>
                        <strong>
                          {member.medianFirstReviewMinutes === null
                            ? text.noReview
                            : formatDuration(member.medianFirstReviewMinutes, locale)}
                        </strong>
                        <small>{text.firstReview}</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyReport label={text.emptySales} />
              )}
            </section>

            <section className={`report-quality is-${report.quality.status.toLowerCase()}`}>
              <div className="report-quality__signal">
                <span>{report.quality.status === "TRUSTED" ? "✓" : "!"}</span>
                <i />
              </div>
              <div className="report-quality__copy">
                <small>DATA QUALITY / {report.quality.status}</small>
                <h2>
                  {report.quality.status === "TRUSTED" ? text.qualityTrusted : text.qualityReview}
                </h2>
                <p>{text.qualityCopy}</p>
              </div>
              <div className="report-quality__checks">
                {report.quality.checks.some((check) => check.count > 0) ? (
                  report.quality.checks
                    .filter((check) => check.count > 0)
                    .map((check) => (
                      <span key={check.key}>
                        <b>{formatNumber(check.count, locale)}</b>
                        {text.qualityChecks[check.key]}
                      </span>
                    ))
                ) : (
                  <span className="is-passed">✓ {text.noIssues}</span>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}

function MetricCard({
  metric,
  locale,
  index,
}: {
  metric: AdminReportMetric;
  locale: PublicLocale;
  index: number;
}) {
  const text = copy[locale];
  const [label, description] = text.metrics[metric.key];
  const lowerIsBetter = metric.key === "MEDIAN_FIRST_REVIEW_MINUTES";
  const favorable =
    metric.changePercent === null ||
    metric.changePercent === 0 ||
    (lowerIsBetter ? metric.changePercent < 0 : metric.changePercent > 0);
  return (
    <article style={{ "--metric-index": index } as CSSProperties}>
      <span className="reports-metric__index">0{index + 1}</span>
      <small>{label}</small>
      <strong>{formatMetric(metric, locale)}</strong>
      <p>{description}</p>
      <div className={favorable ? "is-positive" : "is-negative"}>
        {metric.changePercent === null ? (
          text.newActivity
        ) : (
          <>
            <span>{metric.changePercent > 0 ? "↗" : metric.changePercent < 0 ? "↘" : "→"}</span>
            {formatNumber(Math.abs(metric.changePercent), locale)}% {text.currentPeriod}
          </>
        )}
      </div>
    </article>
  );
}

function TrendChart({ report, locale }: { report: AdminReportsOverview; locale: PublicLocale }) {
  const points = report.trend;
  const width = 760;
  const height = 260;
  const padding = 26;
  const max = Math.max(
    1,
    ...points.flatMap((point) => [point.submitted, point.confirmed, point.completed]),
  );
  const coordinates = (key: "submitted" | "confirmed" | "completed") =>
    points
      .map((point, index) => {
        const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
        const y = height - padding - (point[key] / max) * (height - padding * 2);
        return `${roundUi(x)},${roundUi(y)}`;
      })
      .join(" ");
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  return (
    <div className="report-chart">
      <svg aria-label={copy[locale].trendTitle} role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={line}
            x1={padding}
            x2={width - padding}
            y1={padding + (line * (height - padding * 2)) / 4}
            y2={padding + (line * (height - padding * 2)) / 4}
          />
        ))}
        <polyline className="is-submitted" points={coordinates("submitted")} />
        <polyline className="is-confirmed" points={coordinates("confirmed")} />
        <polyline className="is-completed" points={coordinates("completed")} />
        {points.map((point, index) =>
          index % labelEvery === 0 || index === points.length - 1 ? (
            <text
              key={point.date}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              x={padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2)}
              y={height - 3}
            >
              {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
                day: "numeric",
                month: "short",
              }).format(new Date(`${point.date}T12:00:00Z`))}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function PanelHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="report-panel__heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </header>
  );
}

function ReportsLoading({ label }: { label: string }) {
  return (
    <section className="reports-loading" aria-live="polite">
      <div>
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
    </section>
  );
}

function EmptyReport({ label }: { label: string }) {
  return (
    <div className="report-empty">
      <span>R</span>
      <p>{label}</p>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M12 3v12m0 0 5-5m-5 5-5-5M4 20h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function formatMetric(metric: AdminReportMetric, locale: PublicLocale) {
  if (metric.unit === "PERCENT") return `${formatNumber(metric.value, locale)}%`;
  if (metric.unit === "EGP") return formatEgp(metric.value, locale);
  if (metric.unit === "MINUTES") return formatDuration(metric.value, locale);
  return formatNumber(metric.value, locale);
}

function formatNumber(value: number, locale: PublicLocale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatEgp(value: number, locale: PublicLocale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    style: "currency",
    currency: "EGP",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(minutes: number, locale: PublicLocale) {
  if (minutes < 60) return `${formatNumber(minutes, locale)} ${locale === "ar" ? "د" : "min"}`;
  return `${formatNumber(minutes / 60, locale)} ${locale === "ar" ? "س" : "hr"}`;
}

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function roundUi(value: number) {
  return Math.round(value * 10) / 10;
}

function exportReport(
  report: AdminReportsOverview,
  locale: PublicLocale,
  text: (typeof copy)[PublicLocale],
) {
  const rows: Array<Array<string | number>> = [[text.csvMetric, text.csvValue]];
  for (const metric of report.metrics) {
    rows.push([text.metrics[metric.key][0], formatMetric(metric, locale)]);
  }
  rows.push([]);
  rows.push([text.vehicle, text.requests, text.confirmed, text.completed, text.occupied]);
  for (const vehicle of report.vehicles) {
    rows.push([
      locale === "ar" ? vehicle.nameAr : vehicle.nameEn,
      vehicle.requests,
      vehicle.confirmed,
      vehicle.completed,
      vehicle.occupiedDays,
    ]);
  }
  rows.push([]);
  rows.push([text.teamTitle, text.assigned, text.confirmed, text.completed, text.firstReview]);
  for (const member of report.sales) {
    rows.push([
      locale === "ar" && member.nameAr ? member.nameAr : member.nameEn,
      member.assigned,
      member.confirmed,
      member.completed,
      member.medianFirstReviewMinutes ?? "",
    ]);
  }
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rahal-operational-report-${report.generatedAt.slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const normalized = String(value).replaceAll('"', '""');
  return `"${normalized}"`;
}
