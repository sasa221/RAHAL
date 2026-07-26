"use client";

import type { ApiSuccess, CustomerAccountOverview } from "@rahal/contracts";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { Icon } from "./public-home";
import { WorkspaceShell } from "./workspace-shell";

const copy = {
  ar: {
    eyebrow: "مساحتك الشخصية",
    title: "حسابك، مضبوط على طريقتك.",
    subtitle:
      "حدّث بيانات التواصل في الحالات الطارئة واختر كيف تصلك أخبار رحلتك، بدون تغيير بيانات الدخول الموثّقة.",
    member: "عضو منذ",
    complete: "اكتمال الملف",
    verified: "موثّق",
    pending: "بانتظار التوثيق",
    profileTitle: "البيانات الشخصية",
    profileCopy:
      "نستخدم هذه البيانات لخدمة طلباتك فقط. أي طلب جديد يحتفظ بنسخة مستقلة من البيانات وقت الإرسال.",
    fullNameEn: "الاسم بالإنجليزية",
    fullNameAr: "الاسم بالعربية",
    birthDate: "تاريخ الميلاد",
    nationality: "الجنسية",
    address: "العنوان",
    emergencyName: "اسم جهة اتصال الطوارئ",
    emergencyPhone: "رقم طوارئ دولي",
    language: "لغة الحساب المفضلة",
    arabic: "العربية",
    english: "English",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    lockedContact: "تغيير بيانات الدخول الموثّقة يحتاج مسار توثيق منفصل.",
    saveProfile: "حفظ البيانات",
    notificationsTitle: "طريقة وصول التحديثات",
    notificationsCopy:
      "الإشعارات التشغيلية تختلف عن التسويق. تفعيل قناة يعني السماح باستخدامها عندما يكون مزودها متاحًا.",
    inApp: "داخل حساب رحال",
    inAppCopy: "قناة أساسية لحالة الطلب والحجز ولا يمكن إيقافها.",
    emailChannel: "البريد الإلكتروني",
    emailCopy: "تحديثات الطلب والحضور والتأكيد.",
    whatsapp: "واتساب",
    whatsappCopy: "تنبيهات تشغيلية عبر القالب المعتمد.",
    push: "إشعارات الجهاز",
    pushCopy: "تحتاج موافقة المتصفح وربط الجهاز لاحقًا.",
    marketing: "عروض رحال الاختيارية",
    marketingCopy: "موافقة مستقلة ويمكن سحبها في أي وقت.",
    quietTitle: "ساعات الهدوء",
    quietCopy: "تؤجل القنوات الاختيارية خلال هذه الفترة؛ التنبيهات المهمة قد تصل فورًا.",
    quietStart: "من",
    quietEnd: "إلى",
    noQuiet: "بدون ساعات هدوء",
    saveNotifications: "حفظ تفضيلات التواصل",
    securityTitle: "تحتاج تغيّر كلمة المرور أو تراجع الأجهزة؟",
    securityCopy: "انتقل إلى مركز الأمان لإدارة الجلسات بدون كشف عناوين IP أو رموز الدخول.",
    securityAction: "فتح مركز الأمان",
    loading: "جاري تجهيز حسابك...",
    unauthorized: "سجّل الدخول بحساب عميل للوصول إلى هذه الصفحة.",
    unavailable: "تعذر تحميل إعدادات الحساب الآن.",
    saving: "جاري الحفظ...",
    profileSaved: "تم حفظ بيانات حسابك.",
    notificationsSaved: "تم حفظ تفضيلات التواصل.",
    failed: "تعذر الحفظ. راجع البيانات وحاول مرة أخرى.",
    signIn: "تسجيل الدخول",
  },
  en: {
    eyebrow: "YOUR PERSONAL SPACE",
    title: "Your account, tuned to you.",
    subtitle:
      "Keep emergency details current and choose how journey updates reach you without changing verified sign-in details.",
    member: "Member since",
    complete: "Profile complete",
    verified: "Verified",
    pending: "Verification pending",
    profileTitle: "Personal details",
    profileCopy:
      "We use these details to serve your requests. Each submitted request keeps its own point-in-time snapshot.",
    fullNameEn: "English name",
    fullNameAr: "Arabic name",
    birthDate: "Date of birth",
    nationality: "Nationality",
    address: "Address",
    emergencyName: "Emergency contact name",
    emergencyPhone: "International emergency number",
    language: "Preferred account language",
    arabic: "العربية",
    english: "English",
    email: "Email address",
    phone: "Phone number",
    lockedContact: "Changing verified sign-in contacts requires a separate verification flow.",
    saveProfile: "Save personal details",
    notificationsTitle: "How updates reach you",
    notificationsCopy:
      "Operational messages are separate from marketing. Enabling a channel permits its use when its approved provider is available.",
    inApp: "Inside your Rahal account",
    inAppCopy: "The essential request and booking channel cannot be disabled.",
    emailChannel: "Email",
    emailCopy: "Request, branch attendance, and confirmation updates.",
    whatsapp: "WhatsApp",
    whatsappCopy: "Operational alerts through an approved template.",
    push: "Device notifications",
    pushCopy: "Requires browser permission and a linked device later.",
    marketing: "Optional Rahal offers",
    marketingCopy: "Separate consent that you can withdraw at any time.",
    quietTitle: "Quiet hours",
    quietCopy:
      "Optional channels wait during this window; important operational alerts may arrive immediately.",
    quietStart: "From",
    quietEnd: "To",
    noQuiet: "No quiet hours",
    saveNotifications: "Save communication preferences",
    securityTitle: "Need to change your password or review devices?",
    securityCopy:
      "Open the security center to manage sessions without exposing raw IP addresses or access tokens.",
    securityAction: "Open security center",
    loading: "Preparing your account...",
    unauthorized: "Sign in with a customer account to open this page.",
    unavailable: "Account settings are currently unavailable.",
    saving: "Saving...",
    profileSaved: "Your account details were saved.",
    notificationsSaved: "Your communication preferences were saved.",
    failed: "The changes could not be saved. Check the details and try again.",
    signIn: "Sign in",
  },
} as const;

type PageState = "LOADING" | "READY" | "UNAUTHORIZED" | "ERROR";

export function CustomerAccountWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [overview, setOverview] = useState<CustomerAccountOverview | null>(null);
  const [state, setState] = useState<PageState>("LOADING");
  const [saving, setSaving] = useState<"profile" | "notifications" | null>(null);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const [preferences, setPreferences] = useState<CustomerAccountOverview["notifications"] | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          setState("UNAUTHORIZED");
          return;
        }
        if (!response.ok) throw new Error("ACCOUNT_UNAVAILABLE");
        const payload = (await response.json()) as ApiSuccess<CustomerAccountOverview>;
        setOverview(payload.data);
        setPreferences(payload.data.notifications);
        setState("READY");
      })
      .catch(() => setState("ERROR"));
    return () => controller.abort();
  }, []);

  const completeness = useMemo(() => {
    if (!overview) return 0;
    const profile = overview.profile;
    const values = [
      profile.fullNameEn,
      profile.fullNameAr,
      profile.dateOfBirth,
      profile.nationality,
      profile.address,
      profile.emergencyContactName,
      profile.emergencyContactPhone,
    ];
    return Math.round((values.filter(Boolean).length / values.length) * 100);
  }, [overview]);

  function showSuccess(message: string) {
    setNotice(message);
    setFailed(false);
    window.setTimeout(() => setNotice(""), 4500);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("profile");
    setFailed(false);
    setNotice("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullNameEn: String(data.get("fullNameEn") ?? ""),
          fullNameAr: String(data.get("fullNameAr") ?? "") || null,
          preferredLocale: String(data.get("preferredLocale") ?? locale),
          dateOfBirth: String(data.get("dateOfBirth") ?? "") || null,
          nationality: String(data.get("nationality") ?? "") || null,
          address: String(data.get("address") ?? "") || null,
          emergencyContactName: String(data.get("emergencyContactName") ?? "") || null,
          emergencyContactPhone: String(data.get("emergencyContactPhone") ?? "") || null,
        }),
      });
      if (!response.ok) throw new Error("PROFILE_FAILED");
      const payload = (await response.json()) as ApiSuccess<CustomerAccountOverview>;
      setOverview(payload.data);
      setPreferences(payload.data.notifications);
      showSuccess(text.profileSaved);
    } catch {
      setFailed(true);
      setNotice(text.failed);
    } finally {
      setSaving(null);
    }
  }

  async function saveNotifications() {
    if (!preferences) return;
    setSaving("notifications");
    setFailed(false);
    setNotice("");
    try {
      const response = await fetch("/api/account/notifications", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled: preferences.emailEnabled,
          whatsappEnabled: preferences.whatsappEnabled,
          pushEnabled: preferences.pushEnabled,
          marketingEnabled: preferences.marketingEnabled,
          quietHoursStart: preferences.quietHoursStart,
          quietHoursEnd: preferences.quietHoursEnd,
        }),
      });
      if (!response.ok) throw new Error("PREFERENCES_FAILED");
      const payload = (await response.json()) as ApiSuccess<CustomerAccountOverview>;
      setOverview(payload.data);
      setPreferences(payload.data.notifications);
      showSuccess(text.notificationsSaved);
    } catch {
      setFailed(true);
      setNotice(text.failed);
    } finally {
      setSaving(null);
    }
  }

  function updatePreference<K extends keyof CustomerAccountOverview["notifications"]>(
    key: K,
    value: CustomerAccountOverview["notifications"][K],
  ) {
    setPreferences((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <WorkspaceShell activePage="profile" kind="customer" locale={locale}>
      <div className="customer-account-workspace" dir={locale === "ar" ? "rtl" : "ltr"}>
        {state !== "READY" || !overview || !preferences ? (
          <section className={`account-profile-state is-${state.toLowerCase()}`}>
            <span>R</span>
            <p>
              {state === "LOADING"
                ? text.loading
                : state === "UNAUTHORIZED"
                  ? text.unauthorized
                  : text.unavailable}
            </p>
            {state === "UNAUTHORIZED" ? (
              <a href={localizedPath(locale, "/auth")}>{text.signIn}</a>
            ) : null}
          </section>
        ) : (
          <>
            <section className="account-profile-hero">
              <div>
                <span>{text.eyebrow}</span>
                <h1>{text.title}</h1>
                <p>{text.subtitle}</p>
              </div>
              <aside>
                <div className="account-profile-monogram">
                  {overview.profile.fullNameEn.charAt(0).toUpperCase()}
                </div>
                <strong>{overview.profile.fullNameEn}</strong>
                <span>
                  {text.member}{" "}
                  {new Date(overview.profile.memberSince).toLocaleDateString(
                    locale === "ar" ? "ar-EG" : "en-EG",
                    { year: "numeric", month: "long" },
                  )}
                </span>
                <div className="account-profile-progress">
                  <span style={{ width: `${completeness}%` }} />
                </div>
                <small>
                  {completeness}% {text.complete}
                </small>
              </aside>
            </section>

            {notice ? (
              <div className={`account-profile-notice${failed ? " is-error" : ""}`}>{notice}</div>
            ) : null}

            <div className="account-profile-grid">
              <form className="account-profile-form" onSubmit={saveProfile}>
                <header>
                  <span>01</span>
                  <div>
                    <h2>{text.profileTitle}</h2>
                    <p>{text.profileCopy}</p>
                  </div>
                </header>
                <div className="account-contact-locks">
                  {[
                    [text.email, overview.profile.email, overview.profile.emailVerified],
                    [text.phone, overview.profile.phone, overview.profile.phoneVerified],
                  ].map(([label, value, verified]) => (
                    <article key={String(label)}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                      <small className={verified ? "is-verified" : ""}>
                        <Icon name={verified ? "check" : "clock"} size={14} />
                        {verified ? text.verified : text.pending}
                      </small>
                    </article>
                  ))}
                </div>
                <p className="account-locked-note">
                  <Icon name="shield" size={17} />
                  {text.lockedContact}
                </p>
                <div className="account-profile-fields">
                  <label>
                    <span>{text.fullNameEn}</span>
                    <input
                      defaultValue={overview.profile.fullNameEn}
                      maxLength={120}
                      minLength={2}
                      name="fullNameEn"
                      required
                    />
                  </label>
                  <label>
                    <span>{text.fullNameAr}</span>
                    <input
                      defaultValue={overview.profile.fullNameAr ?? ""}
                      dir="rtl"
                      maxLength={120}
                      minLength={2}
                      name="fullNameAr"
                    />
                  </label>
                  <label>
                    <span>{text.birthDate}</span>
                    <input
                      defaultValue={overview.profile.dateOfBirth ?? ""}
                      max={new Date().toISOString().slice(0, 10)}
                      name="dateOfBirth"
                      type="date"
                    />
                  </label>
                  <label>
                    <span>{text.nationality}</span>
                    <input
                      defaultValue={overview.profile.nationality ?? ""}
                      maxLength={80}
                      minLength={2}
                      name="nationality"
                    />
                  </label>
                  <label className="is-wide">
                    <span>{text.address}</span>
                    <textarea
                      defaultValue={overview.profile.address ?? ""}
                      maxLength={300}
                      minLength={10}
                      name="address"
                    />
                  </label>
                  <label>
                    <span>{text.emergencyName}</span>
                    <input
                      defaultValue={overview.profile.emergencyContactName ?? ""}
                      maxLength={120}
                      minLength={2}
                      name="emergencyContactName"
                    />
                  </label>
                  <label>
                    <span>{text.emergencyPhone}</span>
                    <input
                      defaultValue={overview.profile.emergencyContactPhone ?? ""}
                      name="emergencyContactPhone"
                      pattern="^\+[1-9]\d{7,14}$"
                      placeholder="+20..."
                      type="tel"
                    />
                  </label>
                  <label className="is-wide">
                    <span>{text.language}</span>
                    <select defaultValue={overview.profile.preferredLocale} name="preferredLocale">
                      <option value="ar">{text.arabic}</option>
                      <option value="en">{text.english}</option>
                    </select>
                  </label>
                </div>
                <button disabled={saving !== null} type="submit">
                  {saving === "profile" ? text.saving : text.saveProfile}
                  <span>→</span>
                </button>
              </form>

              <section className="account-notification-panel">
                <header>
                  <span>02</span>
                  <div>
                    <h2>{text.notificationsTitle}</h2>
                    <p>{text.notificationsCopy}</p>
                  </div>
                </header>
                <div className="account-channel-list">
                  <ChannelToggle
                    checked
                    copy={text.inAppCopy}
                    disabled
                    icon="document"
                    label={text.inApp}
                    onChange={() => undefined}
                  />
                  <ChannelToggle
                    checked={preferences.emailEnabled}
                    copy={text.emailCopy}
                    icon="document"
                    label={text.emailChannel}
                    onChange={(checked) => updatePreference("emailEnabled", checked)}
                  />
                  <ChannelToggle
                    checked={preferences.whatsappEnabled}
                    copy={text.whatsappCopy}
                    icon="whatsapp"
                    label={text.whatsapp}
                    onChange={(checked) => updatePreference("whatsappEnabled", checked)}
                  />
                  <ChannelToggle
                    checked={preferences.pushEnabled}
                    copy={text.pushCopy}
                    icon="phone"
                    label={text.push}
                    onChange={(checked) => updatePreference("pushEnabled", checked)}
                  />
                </div>
                <label className="account-marketing-toggle">
                  <input
                    checked={preferences.marketingEnabled}
                    onChange={(event) => updatePreference("marketingEnabled", event.target.checked)}
                    type="checkbox"
                  />
                  <span aria-hidden="true" />
                  <div>
                    <strong>{text.marketing}</strong>
                    <p>{text.marketingCopy}</p>
                  </div>
                </label>
                <div className="account-quiet-hours">
                  <div>
                    <Icon name="clock" size={19} />
                    <div>
                      <strong>{text.quietTitle}</strong>
                      <p>{text.quietCopy}</p>
                    </div>
                  </div>
                  <label>
                    <span>{text.quietStart}</span>
                    <input
                      onChange={(event) =>
                        updatePreference("quietHoursStart", event.target.value || null)
                      }
                      type="time"
                      value={preferences.quietHoursStart ?? ""}
                    />
                  </label>
                  <label>
                    <span>{text.quietEnd}</span>
                    <input
                      onChange={(event) =>
                        updatePreference("quietHoursEnd", event.target.value || null)
                      }
                      type="time"
                      value={preferences.quietHoursEnd ?? ""}
                    />
                  </label>
                  <button
                    onClick={() => {
                      updatePreference("quietHoursStart", null);
                      updatePreference("quietHoursEnd", null);
                    }}
                    type="button"
                  >
                    {text.noQuiet}
                  </button>
                </div>
                <button
                  className="account-save-notifications"
                  disabled={saving !== null}
                  onClick={() => void saveNotifications()}
                  type="button"
                >
                  {saving === "notifications" ? text.saving : text.saveNotifications}
                  <span>→</span>
                </button>
              </section>
            </div>

            <section className="account-security-bridge">
              <div>
                <span>03</span>
                <div>
                  <h2>{text.securityTitle}</h2>
                  <p>{text.securityCopy}</p>
                </div>
              </div>
              <a href={localizedPath(locale, "/account/security")}>
                {text.securityAction}
                <Icon name="arrow" size={18} />
              </a>
            </section>
          </>
        )}
      </div>
    </WorkspaceShell>
  );
}

function ChannelToggle({
  checked,
  copy,
  disabled = false,
  icon,
  label,
  onChange,
}: {
  checked: boolean;
  copy: string;
  disabled?: boolean;
  icon: "document" | "whatsapp" | "phone";
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`account-channel${disabled ? " is-locked" : ""}`}>
      <Icon name={icon} size={21} />
      <div>
        <strong>{label}</strong>
        <p>{copy}</p>
      </div>
      <input
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span aria-hidden="true" />
    </label>
  );
}
