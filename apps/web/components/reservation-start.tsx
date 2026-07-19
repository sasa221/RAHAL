"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  dateInputValue,
  formatEgp,
  getPublicContent,
  localizedPath,
  type PublicLocale,
  type PublicVehicle,
} from "../lib/public-content";
import { ExperienceMotion } from "./experience-motion";
import { Footer, Header, Icon } from "./public-home";

const requestCopy = {
  ar: {
    saveDraft: "احفظ المسودة بأمان",
    savingDraft: "جارٍ حفظ المسودة...",
    savedDraft: "تم حفظ المسودة",
    reference: "رقم المسودة",
    estimate: "التقدير الحالي",
    signIn: "سجّل الدخول للمتابعة",
    authRequired: "سجّل الدخول بحساب العميل لحفظ اختياراتك.",
    saveFailed: "تعذر حفظ المسودة الآن. حاول مرة أخرى.",
    chooseDriver: "اختر هل تريد سائقًا قبل حفظ المسودة.",
    draftNotice: "هذه مسودة فقط وليست طلبًا مرسلًا أو حجزًا مؤكدًا.",
    stepTwo: "الخطوة 2 من 6: بيانات العميل",
    detailsTitle: "بيانات العميل الآمنة",
    detailsCopy:
      "لن نطلب رقم بطاقة أو جواز هنا. بيانات الحساب الموثوقة يأخذها السيرفر من جلستك مباشرة.",
    nationality: "الجنسية",
    address: "العنوان",
    emergencyName: "اسم شخص للطوارئ",
    emergencyPhone: "رقم هاتف الطوارئ الدولي",
    saveDetails: "احفظ بيانات العميل",
    savingDetails: "جارٍ حفظ البيانات...",
    detailsSaved: "تم حفظ بيانات العميل بأمان",
    detailsFailed: "تعذر حفظ بيانات العميل. حاول مرة أخرى.",
    protectedContact: "بيانات التواصل المحفوظة",
    stepThree: "الخطوة 3 من 6: الموافقات",
    consentsTitle: "راجع نسخة السياسات ووافق بوضوح",
    consentsCopy: "كل موافقة إلزامية منفصلة ومسجلة مع رقم النسخة. موافقة التسويق اختيارية دائمًا.",
    developmentPolicy: "نسخة تطويرية للمعاينة وليست النص القانوني النهائي للإطلاق.",
    acceptPolicy: "أوافق على هذه السياسة",
    marketingConsent: "أوافق اختياريًا على رسائل وعروض رحال التسويقية",
    saveConsents: "احفظ الموافقات",
    savingConsents: "جارٍ حفظ الموافقات...",
    consentsSaved: "تم حفظ الموافقات المطلوبة",
    consentsFailed: "تعذر حفظ الموافقات. راجع النسخة وحاول مرة أخرى.",
    policiesLoading: "جارٍ تحميل السياسات...",
    policiesFailed: "تعذر تحميل حزمة السياسات الحالية.",
    documentsNext: "الخطوة التالية هي المستندات الخاصة. المسودة لم تُرسل للمبيعات بعد.",
    title: "ابدأ طلب الحجز",
    copy: "راجع اختيار العربية والمواعيد ونظام السائق، وبعدها احفظ الخطوة الأولى بأمان في حسابك.",
    step: "الخطوة 1 من 6: المواعيد",
    vehicle: "العربية المختارة",
    pickup: "تاريخ الاستلام",
    return: "تاريخ الإرجاع",
    driver: "نظام السائق",
    optional: "أحدد لاحقًا مع المبيعات",
    withDriver: "أرغب في سائق",
    selfDrive: "بدون سائق",
    branch: "مكان الاستلام والإرجاع",
    branchValue: "فرع رحال فقط",
    review: "راجع الاختيارات",
    summary: "مراجعة الخطوة الأولى",
    notSubmitted: "لم يتم إرسال الطلب بعد",
    next: "الخطوات التالية ستشمل الحساب، بيانات العميل، رفع المستندات الآمن، الموافقة على الشروط والمراجعة النهائية.",
    notice:
      "الطلب لا يصبح حجزًا مؤكدًا إلا بعد مراجعة المبيعات والحضور للفرع وتسجيل العربون وتوقيع المستندات.",
    back: "العودة إلى تفاصيل العربية",
    visualEyebrow: "اختيارك الحالي",
    perDay: "في اليوم",
    minimum: "أقل مدة",
    days: "أيام",
    formTitle: "حدد تفاصيل رحلتك",
    formCopy: "اختار المواعيد ونظام السائق، وبعدها راجع كل اختيار قبل استكمال الطلب.",
    reviewReady: "اختياراتك جاهزة للمراجعة",
  },
  en: {
    saveDraft: "Save draft securely",
    savingDraft: "Saving draft...",
    savedDraft: "Draft saved",
    reference: "Draft reference",
    estimate: "Current estimate",
    signIn: "Sign in to continue",
    authRequired: "Sign in with a customer account to save your selections.",
    saveFailed: "The draft could not be saved. Please try again.",
    chooseDriver: "Choose whether you want a driver before saving the draft.",
    draftNotice: "This is only a draft. It is not a submitted request or a confirmed booking.",
    stepTwo: "Step 2 of 6: customer details",
    detailsTitle: "Secure customer details",
    detailsCopy:
      "No identity or passport number is requested here. The server reads trusted account contacts directly from your session.",
    nationality: "Nationality",
    address: "Address",
    emergencyName: "Emergency contact name",
    emergencyPhone: "Emergency contact international phone",
    saveDetails: "Save customer details",
    savingDetails: "Saving details...",
    detailsSaved: "Customer details saved securely",
    detailsFailed: "Customer details could not be saved. Please try again.",
    protectedContact: "Saved contact details",
    stepThree: "Step 3 of 6: consent",
    consentsTitle: "Review the policy version and consent clearly",
    consentsCopy:
      "Every required consent is separate and recorded with its version. Marketing consent is always optional.",
    developmentPolicy: "Development preview only; this is not the final production legal text.",
    acceptPolicy: "I agree to this policy",
    marketingConsent: "I optionally agree to Rahal marketing messages and offers",
    saveConsents: "Save consents",
    savingConsents: "Saving consents...",
    consentsSaved: "Required consents saved",
    consentsFailed: "Consents could not be saved. Review the version and try again.",
    policiesLoading: "Loading policies...",
    policiesFailed: "The current policy bundle could not be loaded.",
    documentsNext: "Private documents are next. The draft has not been sent to sales yet.",
    title: "Start reservation request",
    copy: "Review the selected vehicle, dates, and driver option, then securely save this first step to your account.",
    step: "Step 1 of 6: rental dates",
    vehicle: "Selected vehicle",
    pickup: "Pickup date",
    return: "Return date",
    driver: "Driver option",
    optional: "Decide later with sales",
    withDriver: "I would like a driver",
    selfDrive: "Without driver",
    branch: "Pickup and return location",
    branchValue: "Rahal branch only",
    review: "Review selections",
    summary: "Step-one review",
    notSubmitted: "The request has not been submitted",
    next: "Next steps will cover the account, customer details, secure documents, consent, and final review.",
    notice:
      "A request becomes confirmed only after sales review, branch attendance, deposit recording, and signed documents.",
    back: "Back to vehicle details",
    visualEyebrow: "YOUR CURRENT SELECTION",
    perDay: "per day",
    minimum: "Minimum rental",
    days: "days",
    formTitle: "Shape the details of your journey",
    formCopy: "Choose the dates and driver option, then review every selection before continuing.",
    reviewReady: "Your selections are ready for review",
  },
} as const;

function formatReservationDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function isDateInputValue(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)));
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function ReservationStart({
  locale,
  vehicle,
  requestedPickup,
  requestedReturn,
  requestedDriver,
}: {
  locale: PublicLocale;
  vehicle: PublicVehicle;
  requestedPickup?: string;
  requestedReturn?: string;
  requestedDriver?: string;
}) {
  const content = getPublicContent(locale);
  const copy = requestCopy[locale];
  const minimumDate = dateInputValue(1);
  const initialPickup =
    isDateInputValue(requestedPickup) && requestedPickup >= minimumDate
      ? requestedPickup
      : dateInputValue(2);
  const minimumReturnDate = addDays(initialPickup, vehicle.minimumDays);
  const initialReturn =
    isDateInputValue(requestedReturn) && requestedReturn >= minimumReturnDate
      ? requestedReturn
      : minimumReturnDate;
  const [pickup, setPickup] = useState(initialPickup);
  const [returnDate, setReturnDate] = useState(initialReturn);
  const [driver, setDriver] = useState(
    vehicle.driverPolicyKey === "self-drive"
      ? "self-drive"
      : vehicle.driverPolicyKey === "required"
        ? "with-driver"
        : requestedDriver === "with-driver"
          ? "with-driver"
          : requestedDriver === "self"
            ? "self-drive"
            : "later",
  );
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [savedDraft, setSavedDraft] = useState<{
    id: string;
    reference: string;
    estimatedTotalEgp: number;
  } | null>(null);
  const [nationality, setNationality] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [savedDetails, setSavedDetails] = useState<{
    emailMasked: string;
    phoneMasked: string;
    emergencyContactPhoneMasked: string;
  } | null>(null);
  const [consentBundle, setConsentBundle] = useState<{
    version: string;
    developmentOnly: boolean;
    policies: Array<{ key: string; title: string; body: string }>;
  } | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [acceptedPolicies, setAcceptedPolicies] = useState<Record<string, boolean>>({});
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [savingConsents, setSavingConsents] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [savedConsents, setSavedConsents] = useState<{
    policyVersion: string;
    marketingAccepted: boolean;
  } | null>(null);
  const selectionParams = new URLSearchParams({
    vehicle: vehicle.id,
    pickup,
    return: returnDate,
    driver: driver === "with-driver" ? "with-driver" : driver === "self-drive" ? "self" : "any",
  });
  const alternateHref = `${localizedPath(locale === "ar" ? "en" : "ar", "/reservation")}?${selectionParams.toString()}`;
  const backParams = new URLSearchParams(selectionParams);
  backParams.delete("vehicle");
  const backHref = `${localizedPath(locale, "/cars")}/${vehicle.id}?${backParams.toString()}`;

  useEffect(() => {
    if (!savedDetails) return;
    const controller = new AbortController();
    setPolicyError(null);
    fetch(`/api/reservations/consent-policies/${locale}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: {
            version: string;
            developmentOnly: boolean;
            policies: Array<{ key: string; title: string; body: string }>;
          };
        };
        if (!response.ok || !payload.data) throw new Error("policy bundle unavailable");
        setConsentBundle(payload.data);
        setAcceptedPolicies({});
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPolicyError(copy.policiesFailed);
      });
    return () => controller.abort();
  }, [copy.policiesFailed, locale, savedDetails]);

  function resetSavedDraft() {
    setReviewing(false);
    setSavedDraft(null);
    setSaveError(null);
    setAuthRequired(false);
  }

  async function saveDraft() {
    if (driver === "later") {
      setSaveError(copy.chooseDriver);
      return;
    }
    setSaving(true);
    setSaveError(null);
    setAuthRequired(false);
    try {
      const response = await fetch("/api/reservations/drafts", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          pickupDate: pickup,
          returnDate,
          driverRequested: driver === "with-driver",
        }),
      });
      const payload = (await response.json()) as {
        data?: { id: string; reference: string; estimatedTotalEgp: number };
        error?: { message?: string };
      };
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (!response.ok || !payload.data) {
        setSaveError(payload.error?.message ?? copy.saveFailed);
        return;
      }
      setSavedDraft(payload.data);
    } catch {
      setSaveError(copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomerDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!savedDraft) return;
    setSavingDetails(true);
    setDetailsError(null);
    try {
      const response = await fetch(
        `/api/reservations/drafts/${encodeURIComponent(savedDraft.id)}/customer-details`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            nationality,
            address,
            emergencyContactName,
            emergencyContactPhone,
          }),
        },
      );
      const payload = (await response.json()) as {
        data?: {
          emailMasked: string;
          phoneMasked: string;
          emergencyContactPhoneMasked: string;
        };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        setDetailsError(payload.error?.message ?? copy.detailsFailed);
        return;
      }
      setSavedDetails(payload.data);
    } catch {
      setDetailsError(copy.detailsFailed);
    } finally {
      setSavingDetails(false);
    }
  }

  async function savePolicyConsents(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!savedDraft || !consentBundle) return;
    setSavingConsents(true);
    setConsentError(null);
    const accepted = (key: string) => acceptedPolicies[key] === true;
    try {
      const response = await fetch(
        `/api/reservations/drafts/${encodeURIComponent(savedDraft.id)}/consents`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            policyVersion: consentBundle.version,
            termsAccepted: accepted("RENTAL_TERMS"),
            privacyAccepted: accepted("PRIVACY"),
            documentAccepted: accepted("DOCUMENT_PROCESSING"),
            operationalAccepted: accepted("RESERVATION_PROCESS"),
            marketingAccepted,
          }),
        },
      );
      const payload = (await response.json()) as {
        data?: { policyVersion: string; marketingAccepted: boolean };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        setConsentError(payload.error?.message ?? copy.consentsFailed);
        return;
      }
      setSavedConsents(payload.data);
    } catch {
      setConsentError(copy.consentsFailed);
    } finally {
      setSavingConsents(false);
    }
  }

  return (
    <div
      className="public-site public-inner-page reservation-experience-page"
      dir={content.dir}
      lang={content.htmlLang}
    >
      <ExperienceMotion />
      <a className="skip-link" href="#reservation-main">
        {content.skip}
      </a>
      <Header locale={locale} languageHref={alternateHref} />

      <main className="reservation-page" id="reservation-main">
        <div className="reservation-stage">
          <aside className="reservation-stage__visual">
            <Image
              alt={vehicle.imageAlt[locale]}
              className="reservation-stage__image"
              fill
              priority
              sizes="(max-width: 820px) 100vw, 44vw"
              src={vehicle.image}
            />
            <span className="reservation-stage__overlay" aria-hidden="true" />
            <span className="reservation-stage__grain" aria-hidden="true" />
            <div className="reservation-stage__vehicle" data-reveal>
              <span>{copy.visualEyebrow}</span>
              <h2>{vehicle.name[locale]}</h2>
              <p>{vehicle.driverPolicy[locale]}</p>
              <div>
                <p>
                  <strong>{formatEgp(vehicle.dailyRateEgp, locale)}</strong>
                  <small>{copy.perDay}</small>
                </p>
                <p>
                  <strong>{vehicle.minimumDays}</strong>
                  <small>
                    {copy.minimum} / {copy.days}
                  </small>
                </p>
              </div>
              <a href={backHref}>
                <Icon name="arrow" size={17} />
                {copy.back}
              </a>
            </div>
            <span className="reservation-stage__edition" aria-hidden="true">
              RAHAL / REQUEST 01
            </span>
          </aside>

          <div className="reservation-stage__workspace">
            <header className="reservation-page__intro" data-reveal>
              <span className="eyebrow">
                {savedDetails ? copy.stepThree : savedDraft ? copy.stepTwo : copy.step}
              </span>
              <h1>{copy.title}</h1>
              <p>{copy.copy}</p>
              <div className="reservation-progress" aria-label={copy.step}>
                {Array.from({ length: 6 }, (_, index) => (
                  <span
                    className={index <= (savedDetails ? 2 : savedDraft ? 1 : 0) ? "is-active" : ""}
                    key={index}
                  >
                    <b>{String(index + 1).padStart(2, "0")}</b>
                  </span>
                ))}
              </div>
            </header>

            <div className="reservation-form-heading">
              <span>01</span>
              <div>
                <h2>{copy.formTitle}</h2>
                <p>{copy.formCopy}</p>
              </div>
            </div>

            <form
              className="reservation-form"
              onSubmit={(event) => {
                event.preventDefault();
                setReviewing(true);
              }}
            >
              <div className="reservation-form__vehicle">
                <span>{copy.vehicle}</span>
                <strong>{vehicle.name[locale]}</strong>
                <small>{vehicle.driverPolicy[locale]}</small>
              </div>
              <div className="reservation-form__dates">
                <label className="field">
                  <span>{copy.pickup}</span>
                  <input
                    lang={content.htmlLang}
                    min={minimumDate}
                    onChange={(event) => {
                      const nextPickup = event.target.value;
                      const nextMinimumReturn = addDays(nextPickup, vehicle.minimumDays);
                      setPickup(nextPickup);
                      if (returnDate < nextMinimumReturn) setReturnDate(nextMinimumReturn);
                      resetSavedDraft();
                    }}
                    required
                    type="date"
                    value={pickup}
                  />
                  <small className="field__localized">
                    {formatReservationDate(pickup, locale)}
                  </small>
                </label>
                <label className="field">
                  <span>{copy.return}</span>
                  <input
                    lang={content.htmlLang}
                    min={addDays(pickup || minimumDate, vehicle.minimumDays)}
                    onChange={(event) => {
                      setReturnDate(event.target.value);
                      resetSavedDraft();
                    }}
                    required
                    type="date"
                    value={returnDate}
                  />
                  <small className="field__localized">
                    {formatReservationDate(returnDate, locale)}
                  </small>
                </label>
              </div>
              <div className="reservation-form__options">
                <label className="field">
                  <span>{copy.driver}</span>
                  <select
                    disabled={
                      vehicle.driverPolicyKey === "self-drive" ||
                      vehicle.driverPolicyKey === "required"
                    }
                    onChange={(event) => {
                      setDriver(event.target.value);
                      resetSavedDraft();
                    }}
                    value={driver}
                  >
                    {vehicle.driverPolicyKey === "self-drive" ? (
                      <option value="self-drive">{copy.selfDrive}</option>
                    ) : vehicle.driverPolicyKey === "required" ? (
                      <option value="with-driver">{copy.withDriver}</option>
                    ) : (
                      <>
                        <option value="later">{copy.optional}</option>
                        <option value="with-driver">{copy.withDriver}</option>
                        <option value="self-drive">{copy.selfDrive}</option>
                      </>
                    )}
                  </select>
                </label>
                <label className="field">
                  <span>{copy.branch}</span>
                  <input disabled value={copy.branchValue} />
                </label>
              </div>
              <button className="button button--gold" type="submit">
                {copy.review}
                <Icon name="arrow" size={18} />
              </button>
            </form>

            <aside
              aria-live="polite"
              className={`reservation-assurance${reviewing ? " is-reviewing" : ""}`}
            >
              <div className="reservation-assurance__heading">
                <Icon name="shield" size={26} />
                <div>
                  <span>{reviewing ? copy.reviewReady : copy.notSubmitted}</span>
                  <h2>{reviewing ? copy.summary : copy.notSubmitted}</h2>
                </div>
              </div>
              {reviewing ? (
                <dl>
                  <div>
                    <dt>{copy.pickup}</dt>
                    <dd>{formatReservationDate(pickup, locale)}</dd>
                  </div>
                  <div>
                    <dt>{copy.return}</dt>
                    <dd>{formatReservationDate(returnDate, locale)}</dd>
                  </div>
                  <div>
                    <dt>{copy.driver}</dt>
                    <dd>
                      {driver === "with-driver"
                        ? copy.withDriver
                        : driver === "self-drive"
                          ? copy.selfDrive
                          : copy.optional}
                    </dd>
                  </div>
                </dl>
              ) : null}
              <p>{copy.next}</p>
              <div className="reservation-assurance__notice">{copy.notice}</div>
              {reviewing ? (
                <div aria-live="polite">
                  {savedDraft ? (
                    <div className="reservation-assurance__notice">
                      <strong>{copy.savedDraft}</strong>
                      <p>
                        {copy.reference}: {savedDraft.reference}
                      </p>
                      <p>
                        {copy.estimate}: {formatEgp(savedDraft.estimatedTotalEgp, locale)}
                      </p>
                      <small>{copy.draftNotice}</small>
                    </div>
                  ) : (
                    <button
                      className="button button--dark"
                      disabled={saving}
                      onClick={() => void saveDraft()}
                      type="button"
                    >
                      {saving ? copy.savingDraft : copy.saveDraft}
                      <Icon name="arrow" size={18} />
                    </button>
                  )}
                  {authRequired ? (
                    <p>
                      {copy.authRequired} <a href={localizedPath(locale, "/auth")}>{copy.signIn}</a>
                    </p>
                  ) : null}
                  {saveError ? <p>{saveError}</p> : null}
                  {savedDraft ? (
                    <form className="reservation-form" onSubmit={saveCustomerDetails}>
                      <div className="reservation-form-heading">
                        <span>02</span>
                        <div>
                          <h2>{copy.detailsTitle}</h2>
                          <p>{copy.detailsCopy}</p>
                        </div>
                      </div>
                      <label className="field">
                        <span>{copy.nationality}</span>
                        <input
                          autoComplete="country-name"
                          minLength={2}
                          onChange={(event) => {
                            setNationality(event.target.value);
                            setSavedDetails(null);
                          }}
                          required
                          value={nationality}
                        />
                      </label>
                      <label className="field">
                        <span>{copy.address}</span>
                        <input
                          autoComplete="street-address"
                          minLength={5}
                          onChange={(event) => {
                            setAddress(event.target.value);
                            setSavedDetails(null);
                          }}
                          required
                          value={address}
                        />
                      </label>
                      <label className="field">
                        <span>{copy.emergencyName}</span>
                        <input
                          autoComplete="name"
                          minLength={2}
                          onChange={(event) => {
                            setEmergencyContactName(event.target.value);
                            setSavedDetails(null);
                          }}
                          required
                          value={emergencyContactName}
                        />
                      </label>
                      <label className="field">
                        <span>{copy.emergencyPhone}</span>
                        <input
                          autoComplete="tel"
                          inputMode="tel"
                          onChange={(event) => {
                            setEmergencyContactPhone(event.target.value);
                            setSavedDetails(null);
                          }}
                          pattern="\+?[1-9][0-9]{7,14}"
                          required
                          value={emergencyContactPhone}
                        />
                      </label>
                      <button
                        className="button button--dark"
                        disabled={savingDetails}
                        type="submit"
                      >
                        {savingDetails ? copy.savingDetails : copy.saveDetails}
                        <Icon name="arrow" size={18} />
                      </button>
                      {savedDetails ? (
                        <div className="reservation-assurance__notice">
                          <strong>{copy.detailsSaved}</strong>
                          <p>{copy.protectedContact}</p>
                          <small>
                            {savedDetails.emailMasked} · {savedDetails.phoneMasked} ·{" "}
                            {savedDetails.emergencyContactPhoneMasked}
                          </small>
                        </div>
                      ) : null}
                      {detailsError ? <p>{detailsError}</p> : null}
                    </form>
                  ) : null}
                  {savedDetails ? (
                    <form className="reservation-form" onSubmit={savePolicyConsents}>
                      <div className="reservation-form-heading">
                        <span>03</span>
                        <div>
                          <h2>{copy.consentsTitle}</h2>
                          <p>{copy.consentsCopy}</p>
                        </div>
                      </div>
                      {!consentBundle && !policyError ? <p>{copy.policiesLoading}</p> : null}
                      {policyError ? <p>{policyError}</p> : null}
                      {consentBundle ? (
                        <>
                          {consentBundle.developmentOnly ? (
                            <div className="reservation-assurance__notice">
                              {copy.developmentPolicy} · {consentBundle.version}
                            </div>
                          ) : null}
                          {consentBundle.policies.map((policy) => (
                            <label className="reservation-assurance__notice" key={policy.key}>
                              <strong>{policy.title}</strong>
                              <p>{policy.body}</p>
                              <span>
                                <input
                                  checked={acceptedPolicies[policy.key] === true}
                                  onChange={(event) => {
                                    setAcceptedPolicies((current) => ({
                                      ...current,
                                      [policy.key]: event.target.checked,
                                    }));
                                    setSavedConsents(null);
                                  }}
                                  required
                                  type="checkbox"
                                />{" "}
                                {copy.acceptPolicy}
                              </span>
                            </label>
                          ))}
                          <label className="reservation-assurance__notice">
                            <input
                              checked={marketingAccepted}
                              onChange={(event) => {
                                setMarketingAccepted(event.target.checked);
                                setSavedConsents(null);
                              }}
                              type="checkbox"
                            />{" "}
                            {copy.marketingConsent}
                          </label>
                          <button
                            className="button button--dark"
                            disabled={savingConsents}
                            type="submit"
                          >
                            {savingConsents ? copy.savingConsents : copy.saveConsents}
                            <Icon name="arrow" size={18} />
                          </button>
                        </>
                      ) : null}
                      {savedConsents ? (
                        <div className="reservation-assurance__notice">
                          <strong>{copy.consentsSaved}</strong>
                          <p>
                            {savedConsents.policyVersion} · {copy.documentsNext}
                          </p>
                        </div>
                      ) : null}
                      {consentError ? <p>{consentError}</p> : null}
                    </form>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
