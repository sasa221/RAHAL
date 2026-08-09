"use client";

import type {
  AdminCommunicationRunResult,
  AdminCommunicationsOverview,
  ApiSuccess,
} from "@rahal/contracts";
import { useCallback, useEffect, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";
import { NotificationCampaignStudio } from "./notification-campaign-studio";

const copy = {
  en: {
    eyebrow: "RAHAL / LIVE SIGNALS",
    title: "Every customer signal, visible and accountable.",
    subtitle:
      "One operational view for in-app messages, email, WhatsApp and browser push delivery.",
    ready: "Ready",
    missing: "Setup required",
    provider: "Provider",
    queue: "Live delivery queue",
    pending: "Pending",
    processing: "Processing",
    failed: "Failed",
    deliveries: "Channel performance",
    queued: "Queued",
    sent: "Sent",
    run: "Run delivery queue now",
    running: "Delivering...",
    processed: "events processed",
    worker: "Delivery engine",
    scheduled: "Daily recovery sweep",
    enabled: "Enabled",
    disabled: "Needs configuration",
    loading: "Reading communication signals...",
    unavailable: "Communication status is unavailable for this account.",
    labels: {
      IN_APP: "In-app",
      EMAIL: "Transactional email",
      WHATSAPP_VERIFICATION: "WhatsApp account verification",
      WHATSAPP_NOTIFICATIONS: "WhatsApp request updates",
      WEB_PUSH: "Browser push",
      PUSH: "Browser push",
      WHATSAPP: "WhatsApp",
    },
  },
  ar: {
    eyebrow: "رحال / الإشارات المباشرة",
    title: "كل رسالة للعميل ظاهرة، قابلة للمتابعة والمحاسبة.",
    subtitle: "مركز تشغيل واحد لإشعارات الموقع والبريد وواتساب وإشعارات المتصفح.",
    ready: "جاهز",
    missing: "يحتاج إعداد",
    provider: "المزوّد",
    queue: "طابور الإرسال المباشر",
    pending: "بانتظار الإرسال",
    processing: "قيد المعالجة",
    failed: "تعذر إرسالها",
    deliveries: "أداء قنوات التواصل",
    queued: "بالطابور",
    sent: "تم الإرسال",
    run: "تشغيل طابور الإرسال الآن",
    running: "جاري الإرسال...",
    processed: "حدث تمت معالجته",
    worker: "محرك الإرسال",
    scheduled: "مراجعة الاسترداد اليومية",
    enabled: "مفعّلة",
    disabled: "تحتاج إعداد",
    loading: "جاري قراءة إشارات التواصل...",
    unavailable: "تعذر تحميل حالة التواصل لهذا الحساب.",
    labels: {
      IN_APP: "داخل الموقع",
      EMAIL: "البريد الإلكتروني",
      WHATSAPP_VERIFICATION: "تحقق الحساب عبر واتساب",
      WHATSAPP_NOTIFICATIONS: "تحديثات الطلب عبر واتساب",
      WEB_PUSH: "إشعارات المتصفح",
      PUSH: "إشعارات المتصفح",
      WHATSAPP: "واتساب",
    },
  },
} as const;

export function AdminCommunicationsWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [overview, setOverview] = useState<AdminCommunicationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState<number | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin-operations/communications", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("UNAVAILABLE");
    const payload = (await response.json()) as ApiSuccess<AdminCommunicationsOverview>;
    setOverview(payload.data);
  }, []);

  useEffect(() => {
    load()
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
    const timer = window.setInterval(() => void load().catch(() => undefined), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function runQueue() {
    setRunning(true);
    setProcessed(null);
    try {
      const response = await fetch("/api/admin-operations/communications/run", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("UNAVAILABLE");
      const payload = (await response.json()) as ApiSuccess<AdminCommunicationRunResult>;
      setProcessed(payload.data.processed);
      await load();
    } finally {
      setRunning(false);
    }
  }

  return (
    <WorkspaceShell activePage="communications" kind="admin" locale={locale}>
      <div className="communications-workspace">
        <header className="communications-hero">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="communications-radar" aria-hidden="true">
            <i />
            <i />
            <b>R</b>
          </div>
        </header>

        <NotificationCampaignStudio kind="admin" locale={locale} />

        {loading ? (
          <div className="communications-state">{text.loading}</div>
        ) : !overview ? (
          <div className="communications-state is-error">{text.unavailable}</div>
        ) : (
          <>
            <section className="communications-providers">
              {overview.providers.map((item, index) => (
                <article
                  className={item.status === "READY" ? "is-ready" : "is-missing"}
                  key={item.key}
                >
                  <header>
                    <span>0{index + 1}</span>
                    <i />
                  </header>
                  <h2>{text.labels[item.key]}</h2>
                  <p>{item.status === "READY" ? text.ready : text.missing}</p>
                  <small>
                    {text.provider}: {item.provider ?? "—"}
                  </small>
                </article>
              ))}
            </section>

            <section className="communications-command">
              <div className="communications-queue">
                <header>
                  <div>
                    <span>OUTBOX / LIVE</span>
                    <h2>{text.queue}</h2>
                  </div>
                  <button disabled={running} onClick={() => void runQueue()} type="button">
                    {running ? text.running : text.run}
                  </button>
                </header>
                <div>
                  {(
                    [
                      ["pending", text.pending],
                      ["processing", text.processing],
                      ["failed", text.failed],
                    ] as const
                  ).map(([key, label]) => (
                    <article key={key}>
                      <strong>{overview.outbox[key].toLocaleString()}</strong>
                      <span>{label}</span>
                    </article>
                  ))}
                </div>
                {processed !== null ? (
                  <p className="communications-result">
                    {processed.toLocaleString()} {text.processed}
                  </p>
                ) : null}
              </div>

              <aside className="communications-engine">
                <span>ENGINE / {overview.workerMode}</span>
                <h2>{text.worker}</h2>
                <div className="communications-orbit">
                  <b />
                  <i />
                  <span>R</span>
                </div>
                <p>
                  {text.scheduled}:{" "}
                  <strong>{overview.scheduledCleanup ? text.enabled : text.disabled}</strong>
                </p>
              </aside>
            </section>

            <section className="communications-deliveries">
              <header>
                <span>CHANNELS / DELIVERY</span>
                <h2>{text.deliveries}</h2>
              </header>
              <div>
                {overview.deliveries.map((item) => {
                  const total = Math.max(1, item.queued + item.sent + item.failed);
                  return (
                    <article key={item.channel}>
                      <h3>{text.labels[item.channel]}</h3>
                      <div className="communications-bar">
                        <i style={{ width: `${(item.sent / total) * 100}%` }} />
                      </div>
                      <dl>
                        <div>
                          <dt>{text.queued}</dt>
                          <dd>{item.queued}</dd>
                        </div>
                        <div>
                          <dt>{text.sent}</dt>
                          <dd>{item.sent}</dd>
                        </div>
                        <div>
                          <dt>{text.failed}</dt>
                          <dd>{item.failed}</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}
