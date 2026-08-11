"use client";

import type {
  ApiSuccess,
  NotificationCampaignAudience,
  NotificationCampaignCategory,
  NotificationCampaignCreateResult,
  NotificationCampaignPage,
  NotificationCampaignRecipientOption,
  NotificationCampaignRecipientPage,
} from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiErrorMessage } from "../lib/api-error";
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
    deliveryScope: "مين يستقبل الرسالة؟",
    everyone: "مجموعة كاملة",
    onePerson: "مستخدم محدد",
    recipientSearch: "ابحث بالاسم أو البريد أو رقم الهاتف",
    recipientSearchHint: "الأدمن يقدر يختار عميل أو موظف مبيعات، والسيلز يقدر يختار عميلًا فقط.",
    recipientEmpty: "لا يوجد مستخدم مطابق للبحث.",
    recipientRequired: "اختر المستخدم الذي تريد إرسال الإشعار إليه.",
    recipientMarketingBlocked: "هذا المستخدم لم يوافق على إشعارات العربيات الجديدة والعروض.",
    customerRole: "عميل",
    salesRole: "مبيعات",
    optedIn: "موافق على العروض",
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
    noRecipients: "لا يوجد عملاء نشطون لاستقبال هذه الرسالة حتى الآن.",
    noMarketingRecipients:
      "لا يوجد عملاء نشطون وافقوا على استقبال العروض والرسائل التسويقية حتى الآن.",
    permissionRequired: "هذا الحساب لا يملك صلاحية إرسال الحملات.",
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
      INDIVIDUAL: "مستخدم محدد",
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
    deliveryScope: "Who should receive it?",
    everyone: "Full audience",
    onePerson: "Specific user",
    recipientSearch: "Search by name, email or phone",
    recipientSearchHint:
      "Admins can select a customer or sales employee. Sales can select customers only.",
    recipientEmpty: "No matching user was found.",
    recipientRequired: "Select the user who should receive this notification.",
    recipientMarketingBlocked: "This user has not opted in to new-vehicle and offer updates.",
    customerRole: "Customer",
    salesRole: "Sales",
    optedIn: "Marketing opt-in",
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
    noRecipients: "No active recipients match this audience.",
    noMarketingRecipients: "No active recipients have opted in to marketing updates.",
    permissionRequired: "This account does not have campaign sending access.",
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
      INDIVIDUAL: "Specific user",
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

function isApiSuccess<T>(payload: unknown): payload is ApiSuccess<T> {
  return Boolean(payload && typeof payload === "object" && "data" in payload);
}

function localizedCampaignError(message: string, text: (typeof copy)[PublicLocale]) {
  if (message === "No active recipients match this audience.") return text.noRecipients;
  if (message === "No active recipients have opted in to marketing updates.") {
    return text.noMarketingRecipients;
  }
  if (message.includes("permission") || message.includes("staff account")) {
    return text.permissionRequired;
  }
  return message;
}

export function NotificationCampaignStudio({
  locale,
  kind,
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
  const [deliveryScope, setDeliveryScope] = useState<"AUDIENCE" | "INDIVIDUAL">("AUDIENCE");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientOptions, setRecipientOptions] = useState<NotificationCampaignRecipientOption[]>(
    [],
  );
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [selectedRecipient, setSelectedRecipient] =
    useState<NotificationCampaignRecipientOption | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/notifications/campaigns?locale=${locale}`, {
      credentials: "include",
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiSuccess<NotificationCampaignPage> | unknown;
    if (!response.ok || !isApiSuccess<NotificationCampaignPage>(payload)) {
      throw new Error(apiErrorMessage(payload, text.unavailable));
    }
    setPage(payload.data);
    if (!payload.data.capabilities.audiences.includes(audience)) {
      setAudience(payload.data.capabilities.audiences[0] ?? "CUSTOMERS");
    }
  }, [audience, locale, text.unavailable]);

  useEffect(() => {
    load()
      .catch((reason) =>
        setError(
          localizedCampaignError(reason instanceof Error ? reason.message : text.unavailable, text),
        ),
      )
      .finally(() => setLoading(false));
  }, [load, text.unavailable]);

  useEffect(() => {
    if (deliveryScope !== "INDIVIDUAL") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setRecipientLoading(true);
      const params = new URLSearchParams({ locale });
      if (recipientQuery.trim()) params.set("query", recipientQuery.trim());
      fetch(`/api/notifications/campaign-recipients?${params}`, {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as
            ApiSuccess<NotificationCampaignRecipientPage> | unknown;
          if (!response.ok || !isApiSuccess<NotificationCampaignRecipientPage>(payload)) {
            throw new Error(apiErrorMessage(payload, text.unavailable));
          }
          setRecipientOptions(payload.data.items);
        })
        .catch((reason) => {
          if (controller.signal.aborted) return;
          setRecipientOptions([]);
          setError(reason instanceof Error ? reason.message : text.unavailable);
        })
        .finally(() => {
          if (!controller.signal.aborted) setRecipientLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [deliveryScope, locale, recipientQuery, text.unavailable]);

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
    if (deliveryScope === "INDIVIDUAL" && !selectedRecipient) {
      setError(text.recipientRequired);
      return;
    }
    if (
      deliveryScope === "INDIVIDUAL" &&
      selectedRecipient &&
      isMarketingCategory &&
      !selectedRecipient.marketingEnabled
    ) {
      setError(text.recipientMarketingBlocked);
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
          recipientId: deliveryScope === "INDIVIDUAL" ? selectedRecipient?.id : undefined,
        }),
      });
      const payload = (await response.json()) as
        ApiSuccess<NotificationCampaignCreateResult> | unknown;
      if (!response.ok || !isApiSuccess<NotificationCampaignCreateResult>(payload)) {
        throw new Error(apiErrorMessage(payload, text.unavailable));
      }
      setResult(payload.data);
      setTitleAr("");
      setTitleEn("");
      setBodyAr("");
      setBodyEn("");
      setTargetPath("");
      setSelectedRecipient(null);
      setRecipientQuery("");
      await load();
    } catch (reason) {
      setError(
        localizedCampaignError(reason instanceof Error ? reason.message : text.unavailable, text),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="campaign-studio" data-workspace={kind}>
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
            {deliveryScope === "AUDIENCE" ? (
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
            ) : null}
          </div>

          <fieldset className="campaign-recipient-scope">
            <legend>{text.deliveryScope}</legend>
            <div className="campaign-recipient-scope__switch">
              <button
                aria-pressed={deliveryScope === "AUDIENCE"}
                onClick={() => {
                  setDeliveryScope("AUDIENCE");
                  setSelectedRecipient(null);
                }}
                type="button"
              >
                {text.everyone}
              </button>
              <button
                aria-pressed={deliveryScope === "INDIVIDUAL"}
                onClick={() => setDeliveryScope("INDIVIDUAL")}
                type="button"
              >
                {text.onePerson}
              </button>
            </div>
            {deliveryScope === "INDIVIDUAL" ? (
              <div className="campaign-recipient-picker">
                <label>
                  <span>{text.recipientSearch}</span>
                  <input
                    autoComplete="off"
                    onChange={(event) => {
                      setRecipientQuery(event.target.value);
                      setSelectedRecipient(null);
                    }}
                    placeholder={text.recipientSearch}
                    type="search"
                    value={recipientQuery}
                  />
                </label>
                <p>{text.recipientSearchHint}</p>
                <div className="campaign-recipient-results" role="listbox">
                  {recipientOptions.map((recipient) => (
                    <button
                      aria-selected={selectedRecipient?.id === recipient.id}
                      className={selectedRecipient?.id === recipient.id ? "is-selected" : ""}
                      key={recipient.id}
                      onClick={() => setSelectedRecipient(recipient)}
                      role="option"
                      type="button"
                    >
                      <span>{recipient.name}</span>
                      <small>
                        {recipient.role === "CUSTOMER" ? text.customerRole : text.salesRole} ·{" "}
                        {recipient.maskedContact}
                      </small>
                      {recipient.marketingEnabled ? <b>{text.optedIn}</b> : null}
                    </button>
                  ))}
                  {!recipientLoading && !recipientOptions.length ? (
                    <span>{text.recipientEmpty}</span>
                  ) : null}
                  {recipientLoading ? <span>…</span> : null}
                </div>
              </div>
            ) : null}
          </fieldset>

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
            disabled={
              sending || loading || !page || (deliveryScope === "INDIVIDUAL" && !selectedRecipient)
            }
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
