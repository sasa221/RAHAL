"use client";

import type {
  ApiSuccess,
  NotificationCampaignAudience,
  NotificationCampaignCategory,
  NotificationCampaignCreateResult,
  NotificationCampaignPage,
} from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicLocale } from "../lib/public-content";

type CampaignChannel = "IN_APP" | "PUSH" | "EMAIL" | "WHATSAPP";

const copy = {
  ar: {
    eyebrow: "استوديو الإرسال",
    title: "حوّل أي تحديث إلى رسالة تصل في وقتها.",
    subtitle:
      "أنشئ الرسالة بالعربية والإنجليزية، اختر الجمهور والقنوات، وشاهد النتيجة قبل الإرسال.",
    compose: "رسالة جديدة",
    history: "آخر الحملات",
    category: "نوع التحديث",
    audience: "الجمهور",
    channels: "قنوات الإرسال",
    titleAr: "العنوان بالعربية",
    titleEn: "العنوان بالإنجليزية",
    bodyAr: "الرسالة بالعربية",
    bodyEn: "الرسالة بالإنجليزية",
    target: "رابط الإجراء داخل الموقع (اختياري)",
    targetHint: "مثال: /cars",
    important: "إشعار مهم",
    marketing: "محتوى تسويقي اختياري",
    marketingHint: "العروض والسيارات الجديدة تصل فقط للموافقين على الرسائل التسويقية.",
    preview: "معاينة مباشرة",
    previewEmpty: "اكتب العنوان والرسالة لتظهر المعاينة هنا.",
    send: "إرسال الحملة",
    sending: "جاري تجهيز الإرسال...",
    sent: "تم إنشاء الحملة",
    recipients: "مستلم",
    queued: "عملية إرسال في الطابور",
    noHistory: "لم تُرسل حملات بعد.",
    unavailable: "لا تملك صلاحية الإرسال أو تعذر تحميل الحملات.",
    required: "أكمل العناوين والرسائل واختر قناة واحدة على الأقل.",
    delivery: "التسليم",
    by: "بواسطة",
    consent: "وفق موافقة المستخدم",
    categories: {
      GENERAL_UPDATE: "تحديث عام",
      NEW_VEHICLE: "سيارة جديدة",
      OFFER: "عرض أو خصم",
      SERVICE_UPDATE: "تحديث خدمة",
      URGENT: "تنبيه مهم",
    },
    audiences: {
      CUSTOMERS: "العملاء",
      SALES: "فريق المبيعات",
      CUSTOMERS_AND_SALES: "العملاء والمبيعات",
    },
    channelLabels: {
      IN_APP: "داخل الموقع",
      PUSH: "إشعار الجهاز",
      EMAIL: "البريد",
      WHATSAPP: "واتساب",
    },
  },
  en: {
    eyebrow: "Broadcast studio",
    title: "Turn every update into a message that arrives on time.",
    subtitle:
      "Compose in Arabic and English, choose the audience and channels, then review before sending.",
    compose: "New message",
    history: "Recent campaigns",
    category: "Update type",
    audience: "Audience",
    channels: "Delivery channels",
    titleAr: "Arabic title",
    titleEn: "English title",
    bodyAr: "Arabic message",
    bodyEn: "English message",
    target: "In-site action link (optional)",
    targetHint: "Example: /cars",
    important: "Important notification",
    marketing: "Optional marketing content",
    marketingHint: "Offers and new vehicles are sent only to marketing opt-ins.",
    preview: "Live preview",
    previewEmpty: "Write a title and message to preview the notification.",
    send: "Send campaign",
    sending: "Preparing delivery...",
    sent: "Campaign created",
    recipients: "recipients",
    queued: "deliveries queued",
    noHistory: "No campaigns have been sent yet.",
    unavailable: "You do not have sending access or campaigns could not be loaded.",
    required: "Complete both languages and select at least one channel.",
    delivery: "Delivery",
    by: "By",
    consent: "User consent respected",
    categories: {
      GENERAL_UPDATE: "General update",
      NEW_VEHICLE: "New vehicle",
      OFFER: "Offer or discount",
      SERVICE_UPDATE: "Service update",
      URGENT: "Important alert",
    },
    audiences: {
      CUSTOMERS: "Customers",
      SALES: "Sales team",
      CUSTOMERS_AND_SALES: "Customers and sales",
    },
    channelLabels: {
      IN_APP: "In-app",
      PUSH: "Device push",
      EMAIL: "Email",
      WHATSAPP: "WhatsApp",
    },
  },
} as const;

const categories: NotificationCampaignCategory[] = [
  "GENERAL_UPDATE",
  "NEW_VEHICLE",
  "OFFER",
  "SERVICE_UPDATE",
  "URGENT",
];
const allChannels: CampaignChannel[] = ["IN_APP", "PUSH", "EMAIL", "WHATSAPP"];

export function NotificationCampaignStudio({
  locale,
}: {
  locale: PublicLocale;
  kind: "admin" | "sales";
}) {
  const text = copy[locale];
  const [page, setPage] = useState<NotificationCampaignPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<NotificationCampaignCreateResult | null>(null);
  const [category, setCategory] = useState<NotificationCampaignCategory>("GENERAL_UPDATE");
  const [audience, setAudience] = useState<NotificationCampaignAudience>("CUSTOMERS");
  const [channels, setChannels] = useState<CampaignChannel[]>(["IN_APP", "PUSH", "EMAIL"]);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [important, setImportant] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/notifications/campaigns?locale=${locale}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("UNAVAILABLE");
    const payload = (await response.json()) as ApiSuccess<NotificationCampaignPage>;
    setPage(payload.data);
    if (!payload.data.capabilities.audiences.includes(audience)) {
      setAudience(payload.data.capabilities.audiences[0] ?? "CUSTOMERS");
    }
  }, [audience, locale]);

  useEffect(() => {
    load()
      .catch(() => setError(text.unavailable))
      .finally(() => setLoading(false));
  }, [load, text.unavailable]);

  const isMarketingCategory = category === "NEW_VEHICLE" || category === "OFFER";
  const preview = useMemo(
    () => ({
      title: locale === "ar" ? titleAr : titleEn,
      body: locale === "ar" ? bodyAr : bodyEn,
    }),
    [bodyAr, bodyEn, locale, titleAr, titleEn],
  );

  function toggleChannel(channel: CampaignChannel) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  async function sendCampaign() {
    setError("");
    setResult(null);
    if (
      titleAr.trim().length < 3 ||
      titleEn.trim().length < 3 ||
      bodyAr.trim().length < 10 ||
      bodyEn.trim().length < 10 ||
      !channels.length
    ) {
      setError(text.required);
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/notifications/campaigns", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          audience,
          titleAr,
          titleEn,
          bodyAr,
          bodyEn,
          targetPath: targetPath.trim() || undefined,
          channels,
          important,
          marketing: marketing || isMarketingCategory,
        }),
      });
      const payload = (await response.json()) as
        ApiSuccess<NotificationCampaignCreateResult> | { message?: string | string[] };
      if (!response.ok || !("data" in payload)) {
        const message = "message" in payload ? payload.message : undefined;
        throw new Error(Array.isArray(message) ? message[0] : message || text.unavailable);
      }
      setResult(payload.data);
      setTitleAr("");
      setTitleEn("");
      setBodyAr("");
      setBodyEn("");
      setTargetPath("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.unavailable);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="campaign-studio">
      <header className="campaign-studio__heading">
        <div>
          <span>{text.eyebrow}</span>
          <h2>{text.title}</h2>
          <p>{text.subtitle}</p>
        </div>
        <b aria-hidden="true">R / SEND</b>
      </header>

      <div className="campaign-studio__grid">
        <div className="campaign-composer">
          <header>
            <span>01</span>
            <h3>{text.compose}</h3>
          </header>

          <div className="campaign-choice-grid">
            <label>
              <span>{text.category}</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as NotificationCampaignCategory)
                }
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {text.categories[item]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{text.audience}</span>
              <select
                value={audience}
                onChange={(event) =>
                  setAudience(event.target.value as NotificationCampaignAudience)
                }
              >
                {(page?.capabilities.audiences ?? ["CUSTOMERS"]).map((item) => (
                  <option key={item} value={item}>
                    {text.audiences[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="campaign-channels">
            <legend>{text.channels}</legend>
            <div>
              {allChannels.map((channel) => (
                <button
                  aria-pressed={channels.includes(channel)}
                  className={channels.includes(channel) ? "is-selected" : ""}
                  key={channel}
                  onClick={() => toggleChannel(channel)}
                  type="button"
                >
                  <i />
                  {text.channelLabels[channel]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="campaign-language-grid">
            <div dir="rtl">
              <label>
                <span>{text.titleAr}</span>
                <input
                  maxLength={100}
                  onChange={(event) => setTitleAr(event.target.value)}
                  value={titleAr}
                />
              </label>
              <label>
                <span>{text.bodyAr}</span>
                <textarea
                  maxLength={800}
                  onChange={(event) => setBodyAr(event.target.value)}
                  rows={5}
                  value={bodyAr}
                />
              </label>
            </div>
            <div dir="ltr">
              <label>
                <span>{text.titleEn}</span>
                <input
                  maxLength={100}
                  onChange={(event) => setTitleEn(event.target.value)}
                  value={titleEn}
                />
              </label>
              <label>
                <span>{text.bodyEn}</span>
                <textarea
                  maxLength={800}
                  onChange={(event) => setBodyEn(event.target.value)}
                  rows={5}
                  value={bodyEn}
                />
              </label>
            </div>
          </div>

          <label className="campaign-target">
            <span>{text.target}</span>
            <input
              dir="ltr"
              maxLength={180}
              onChange={(event) => setTargetPath(event.target.value)}
              placeholder={text.targetHint}
              value={targetPath}
            />
          </label>

          <div className="campaign-toggles">
            <label>
              <input
                checked={important || category === "URGENT"}
                disabled={category === "URGENT"}
                onChange={(event) => setImportant(event.target.checked)}
                type="checkbox"
              />
              <span>{text.important}</span>
            </label>
            <label>
              <input
                checked={marketing || isMarketingCategory}
                disabled={isMarketingCategory}
                onChange={(event) => setMarketing(event.target.checked)}
                type="checkbox"
              />
              <span>{text.marketing}</span>
            </label>
          </div>
          <p className="campaign-consent">{text.marketingHint}</p>

          {error ? <p className="campaign-feedback is-error">{error}</p> : null}
          {result ? (
            <p className="campaign-feedback is-success">
              {text.sent}: {result.recipientCount} {text.recipients} · {result.queuedDeliveries}{" "}
              {text.queued}
            </p>
          ) : null}
          <button
            className="campaign-send"
            disabled={sending || loading}
            onClick={() => void sendCampaign()}
            type="button"
          >
            <span>{sending ? text.sending : text.send}</span>
            <b>↗</b>
          </button>
        </div>

        <aside className="campaign-preview">
          <header>
            <span>02</span>
            <h3>{text.preview}</h3>
          </header>
          <div
            className={`campaign-preview__device${important || category === "URGENT" ? " is-important" : ""}`}
          >
            <div className="campaign-preview__signal">
              <b>R</b>
              <span>RAHAL LIVE</span>
              <i />
            </div>
            {preview.title && preview.body ? (
              <article>
                <small>{text.categories[category]}</small>
                <h4>{preview.title}</h4>
                <p>{preview.body}</p>
                <footer>
                  {channels.map((channel) => (
                    <span key={channel}>{text.channelLabels[channel]}</span>
                  ))}
                </footer>
              </article>
            ) : (
              <p className="campaign-preview__empty">{text.previewEmpty}</p>
            )}
          </div>
          <div className="campaign-preview__rules">
            <span>✓ {text.consent}</span>
            <span>{isMarketingCategory || marketing ? "MARKETING / OPT-IN" : "OPERATIONAL"}</span>
          </div>
        </aside>
      </div>

      <section className="campaign-history">
        <header>
          <span>03</span>
          <h3>{text.history}</h3>
        </header>
        {!page?.items.length ? (
          <p>{loading ? "…" : text.noHistory}</p>
        ) : (
          <div>
            {page.items.map((item) => (
              <article key={item.id}>
                <header>
                  <span>{text.categories[item.category]}</span>
                  <time dateTime={item.createdAt}>
                    {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.createdAt))}
                  </time>
                </header>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
                <div className="campaign-history__meta">
                  <span>{text.audiences[item.audience]}</span>
                  <span>
                    {item.recipientCount} {text.recipients}
                  </span>
                  <span>
                    {text.by}: {item.createdBy}
                  </span>
                </div>
                <footer>
                  <b>{text.delivery}</b>
                  <span className="is-sent">{item.delivery.sent} ✓</span>
                  <span>{item.delivery.queued} …</span>
                  <span className="is-failed">{item.delivery.failed} !</span>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
