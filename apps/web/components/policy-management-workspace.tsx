"use client";

import type {
  ApiSuccess,
  ManagedPolicyCopy,
  PolicyKey,
  PolicyManagementOverview,
} from "@rahal/contracts";
import { useEffect, useMemo, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";

const policyKeys: PolicyKey[] = [
  "RENTAL_TERMS",
  "PRIVACY",
  "DOCUMENT_PROCESSING",
  "RESERVATION_PROCESS",
];

const copy = {
  ar: {
    eyebrow: "الحوكمة القانونية",
    title: "مركز السياسات والموافقات",
    subtitle:
      "انشر نسخة عربية وإنجليزية واحدة ومتطابقة زمنيًا. النشر يفتح إرسال الطلبات فقط بعد اعتماد النصوص خارج النظام.",
    active: "النسخة الفعالة",
    blocked: "نسخة تطوير — إرسال الطلبات متوقف",
    live: "نسخة إنتاج فعالة",
    none: "لا توجد حزمة مكتملة فعالة",
    history: "سجل النسخ",
    newBundle: "نشر حزمة معتمدة",
    version: "رقم النسخة",
    versionHint: "مثال: POLICY-2026-01",
    reason: "مرجع الاعتماد وسبب النشر",
    reasonHint: "اسم/مرجع موافقة المالك والمراجع القانوني بدون بيانات حساسة",
    arabic: "العربية",
    english: "English",
    titleLabel: "العنوان",
    bodyLabel: "النص الكامل",
    approved:
      "أؤكد أن المالك والمراجع القانوني اعتمدا النصوص الثمانية وأنها جاهزة للاستخدام الفعلي.",
    publish: "نشر النسخة الآن",
    publishing: "جاري النشر...",
    published: "تم نشر الحزمة وتفعيلها بنجاح.",
    error: "تعذر تحميل أو نشر السياسات. راجع الحقول والصلاحيات ثم أعد المحاولة.",
    unauthorized: "هذه الصفحة متاحة للإدارة فقط.",
    loading: "جاري تحميل مركز السياسات...",
    complete: "مكتملة",
    incomplete: "غير مكتملة",
    effective: "بدأت",
    progress: "اكتمال النصوص",
    policies: {
      RENTAL_TERMS: "شروط التأجير",
      PRIVACY: "الخصوصية",
      DOCUMENT_PROCESSING: "معالجة المستندات",
      RESERVATION_PROCESS: "رحلة طلب الحجز",
    },
  },
  en: {
    eyebrow: "LEGAL GOVERNANCE",
    title: "Policy and consent center",
    subtitle:
      "Publish one synchronized Arabic and English version. Request submission opens only after the copy is approved outside the system.",
    active: "Effective version",
    blocked: "Development version — request submission is blocked",
    live: "Production version is active",
    none: "No complete policy bundle is active",
    history: "Version history",
    newBundle: "Publish an approved bundle",
    version: "Version identifier",
    versionHint: "Example: POLICY-2026-01",
    reason: "Approval reference and publishing reason",
    reasonHint: "Owner/legal approval reference without sensitive information",
    arabic: "العربية",
    english: "English",
    titleLabel: "Title",
    bodyLabel: "Full policy text",
    approved:
      "I confirm that the owner and qualified legal reviewer approved all eight copies for real use.",
    publish: "Publish version now",
    publishing: "Publishing...",
    published: "The policy bundle was published and activated.",
    error: "Policies could not be loaded or published. Review the fields and access, then retry.",
    unauthorized: "This page is available to administrators only.",
    loading: "Loading policy center...",
    complete: "Complete",
    incomplete: "Incomplete",
    effective: "Effective",
    progress: "Copy completion",
    policies: {
      RENTAL_TERMS: "Rental terms",
      PRIVACY: "Privacy",
      DOCUMENT_PROCESSING: "Document processing",
      RESERVATION_PROCESS: "Reservation request journey",
    },
  },
} as const;

type DraftCopy = Record<
  PolicyKey,
  {
    arTitle: string;
    arBody: string;
    enTitle: string;
    enBody: string;
  }
>;

function emptyDraft(): DraftCopy {
  return Object.fromEntries(
    policyKeys.map((key) => [key, { arTitle: "", arBody: "", enTitle: "", enBody: "" }]),
  ) as DraftCopy;
}

export function PolicyManagementWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [overview, setOverview] = useState<PolicyManagementOverview | null>(null);
  const [draft, setDraft] = useState<DraftCopy>(emptyDraft);
  const [version, setVersion] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<
    "LOADING" | "READY" | "SAVING" | "SAVED" | "ERROR" | "UNAUTHORIZED"
  >("LOADING");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/policies/admin", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          if (!cancelled) setStatus("UNAUTHORIZED");
          return;
        }
        const payload = (await response.json()) as ApiSuccess<PolicyManagementOverview>;
        if (!response.ok) throw new Error("POLICIES_UNAVAILABLE");
        if (!cancelled) {
          setOverview(payload.data);
          setStatus("READY");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("ERROR");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completion = useMemo(() => {
    const fields = policyKeys.flatMap((key) => Object.values(draft[key]));
    return Math.round(
      (fields.filter((value) => value.trim().length >= (value.includes(" ") ? 4 : 1)).length /
        fields.length) *
        100,
    );
  }, [draft]);

  const canPublish =
    confirmed &&
    /^([A-Z0-9][A-Z0-9._-]{2,39})$/.test(version.trim().toUpperCase()) &&
    !version.trim().toUpperCase().startsWith("DEV-") &&
    reason.trim().length >= 10 &&
    policyKeys.every((key) => {
      const value = draft[key];
      return (
        value.arTitle.trim().length >= 4 &&
        value.enTitle.trim().length >= 4 &&
        value.arBody.trim().length >= 50 &&
        value.enBody.trim().length >= 50
      );
    });

  function updateCopy(key: PolicyKey, field: keyof DraftCopy[PolicyKey], value: string) {
    setDraft((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
    if (status === "ERROR" || status === "SAVED") setStatus("READY");
  }

  async function publish() {
    if (!canPublish) return;
    setStatus("SAVING");
    const copies = policyKeys.flatMap<ManagedPolicyCopy>((key) => [
      {
        key,
        locale: "ar",
        title: draft[key].arTitle,
        body: draft[key].arBody,
      },
      {
        key,
        locale: "en",
        title: draft[key].enTitle,
        body: draft[key].enBody,
      },
    ]);
    try {
      const response = await fetch("/api/policies/admin/publish", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: version.trim().toUpperCase(),
          effectiveAt: new Date().toISOString(),
          reason: reason.trim(),
          copies,
        }),
      });
      const payload = (await response.json()) as ApiSuccess<PolicyManagementOverview>;
      if (!response.ok) throw new Error("POLICY_PUBLISH_FAILED");
      setOverview(payload.data);
      setDraft(emptyDraft());
      setVersion("");
      setReason("");
      setConfirmed(false);
      setStatus("SAVED");
    } catch {
      setStatus("ERROR");
    }
  }

  return (
    <WorkspaceShell activePage="policies" kind="admin" locale={locale}>
      <div className="policy-center">
        <header className="policy-center__hero">
          <div>
            <p className="section-kicker">{text.eyebrow}</p>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div
            className={`policy-center__status ${
              overview?.activeIsDevelopmentOnly ? "is-blocked" : "is-live"
            }`}
          >
            <span>{text.active}</span>
            <strong>{overview?.activeVersion ?? "—"}</strong>
            <small>
              {!overview?.activeVersion
                ? text.none
                : overview.activeIsDevelopmentOnly
                  ? text.blocked
                  : text.live}
            </small>
          </div>
        </header>

        {status === "LOADING" ? (
          <p className="policy-center__message">{text.loading}</p>
        ) : status === "UNAUTHORIZED" ? (
          <section className="policy-center__message">
            <h2>{text.unauthorized}</h2>
          </section>
        ) : (
          <>
            {status === "ERROR" ? (
              <p className="policy-center__message is-error" role="alert">
                {text.error}
              </p>
            ) : null}
            {status === "SAVED" ? (
              <p className="policy-center__message is-success" role="status">
                {text.published}
              </p>
            ) : null}

            <section className="policy-center__history" aria-labelledby="policy-history-title">
              <div className="policy-center__section-heading">
                <h2 id="policy-history-title">{text.history}</h2>
                <span>{overview?.bundles.length ?? 0}</span>
              </div>
              <div>
                {(overview?.bundles ?? []).map((bundle) => (
                  <article
                    className={bundle.version === overview?.activeVersion ? "is-active" : undefined}
                    key={bundle.version}
                  >
                    <span>{bundle.complete ? text.complete : text.incomplete}</span>
                    <strong>{bundle.version}</strong>
                    <time dateTime={bundle.effectiveAt}>
                      {text.effective} ·{" "}
                      {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(bundle.effectiveAt))}
                    </time>
                  </article>
                ))}
              </div>
            </section>

            <section className="policy-center__publisher" aria-labelledby="policy-publisher-title">
              <div className="policy-center__section-heading">
                <div>
                  <p className="section-kicker">{text.eyebrow}</p>
                  <h2 id="policy-publisher-title">{text.newBundle}</h2>
                </div>
                <div className="policy-center__progress">
                  <span>{text.progress}</span>
                  <strong>{completion}%</strong>
                  <i style={{ "--policy-progress": `${completion}%` } as React.CSSProperties} />
                </div>
              </div>

              <div className="policy-center__meta">
                <label>
                  <span>{text.version}</span>
                  <input
                    maxLength={40}
                    onChange={(event) => setVersion(event.target.value.toUpperCase())}
                    placeholder={text.versionHint}
                    value={version}
                  />
                </label>
                <label>
                  <span>{text.reason}</span>
                  <input
                    maxLength={300}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={text.reasonHint}
                    value={reason}
                  />
                </label>
              </div>

              <div className="policy-center__policies">
                {policyKeys.map((key, index) => (
                  <details key={key} open={index === 0}>
                    <summary>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{text.policies[key]}</strong>
                      <i aria-hidden="true">+</i>
                    </summary>
                    <div className="policy-center__languages">
                      {(
                        [
                          ["ar", text.arabic, "arTitle", "arBody"],
                          ["en", text.english, "enTitle", "enBody"],
                        ] as const
                      ).map(([language, label, titleField, bodyField]) => (
                        <fieldset dir={language === "ar" ? "rtl" : "ltr"} key={language}>
                          <legend>{label}</legend>
                          <label>
                            <span>{text.titleLabel}</span>
                            <input
                              maxLength={160}
                              onChange={(event) => updateCopy(key, titleField, event.target.value)}
                              value={draft[key][titleField]}
                            />
                          </label>
                          <label>
                            <span>{text.bodyLabel}</span>
                            <textarea
                              maxLength={12_000}
                              onChange={(event) => updateCopy(key, bodyField, event.target.value)}
                              rows={8}
                              value={draft[key][bodyField]}
                            />
                          </label>
                        </fieldset>
                      ))}
                    </div>
                  </details>
                ))}
              </div>

              <footer className="policy-center__publish">
                <label>
                  <input
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{text.approved}</span>
                </label>
                <button
                  disabled={!canPublish || status === "SAVING"}
                  onClick={() => void publish()}
                  type="button"
                >
                  {status === "SAVING" ? text.publishing : text.publish}
                  <span aria-hidden="true">→</span>
                </button>
              </footer>
            </section>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
