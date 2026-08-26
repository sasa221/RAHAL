"use client";

import type { CustomerReservationDraftDetail } from "@rahal/contracts";
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
    resumingDraft: "جاري استرجاع مسودتك الآمنة...",
    resumedDraft: "تم استرجاع المسودة ويمكنك المتابعة من آخر خطوة.",
    resumeFailed: "تعذر استرجاع هذه المسودة. ربما انتهى موعدها أو تم إلغاؤها من جهاز آخر.",
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
    documentsNext: "المستندات تُراجع في فرع رحال بعد إرسال الطلب. المسودة لم تُرسل للمبيعات بعد.",
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
    documentsStep: "الخطوة 4 من 6: المستندات الخاصة",
    documentsTitle: "مراجعة المستندات في الفرع",
    documentsCopy:
      "لا تُرفع مستندات الهوية من الموقع حاليًا. أحضرها إلى فرع رحال لمراجعتها قبل أي تأكيد.",
    developmentRules: "قواعد مستندات تطويرية قابلة للتعديل من الإدارة قبل الإطلاق.",
    chooseFile: "اختر ملفًا خاصًا",
    replaceFile: "استبدل الملف",
    removeFile: "احذف الملف",
    uploadedFile: "تم الرفع بأمان",
    uploadFailed: "تعذر رفع المستند. تأكد من النوع والحجم وحاول مرة أخرى.",
    removeFailed: "تعذر حذف المستند الآن.",
    confirmRemove: "هل تريد حذف هذا المستند الخاص؟ لا يمكن التراجع عن هذا الإجراء.",
    uploadsDisabled:
      "رفع مستندات الهوية متوقف في نسخة التسليم حتى اعتماد التخزين الخاص وفحص الملفات. لا ترسل مستنداتك بالبريد أو واتساب.",
    uploadingFile: "جارٍ الرفع الآمن...",
    documentFormats: "JPEG أو PNG أو PDF — بحد أقصى",
    documentsComplete: "تتم مراجعة المستندات المطلوبة في فرع رحال قبل التأكيد النهائي.",
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
    resumingDraft: "Restoring your secure draft...",
    resumedDraft: "Your draft is restored. Continue from the last completed step.",
    resumeFailed:
      "This draft could not be restored. It may have expired or been removed on another device.",
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
    documentsNext:
      "Documents are reviewed at the Rahal branch after you send the request. The draft is not with sales yet.",
    documentsStep: "Step 4 of 6: branch document review",
    documentsTitle: "Documents reviewed at the branch",
    documentsCopy:
      "Identity documents are not uploaded on the site right now. Bring them to the Rahal branch for review before confirmation.",
    developmentRules:
      "Development document rules; administrators can configure the final rules before launch.",
    chooseFile: "Choose private file",
    replaceFile: "Replace file",
    removeFile: "Remove file",
    uploadedFile: "Uploaded securely",
    uploadFailed: "The document could not be uploaded. Check its type and size, then try again.",
    removeFailed: "The document could not be removed right now.",
    confirmRemove: "Remove this private document? This action cannot be undone.",
    uploadsDisabled:
      "Identity-document upload is disabled in this delivery build until private storage and file scanning are approved. Do not send documents by email or WhatsApp.",
    uploadingFile: "Uploading securely...",
    documentFormats: "JPEG, PNG, or PDF — maximum",
    documentsComplete:
      "Required documents are reviewed at the Rahal branch before final confirmation.",
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

type ReservationReviewData = {
  draftId: string;
  reference: string;
  status: "DRAFT";
  vehicle: { id: string; name: string };
  branch: { id: string; name: string };
  pickupAt: string;
  returnAt: string;
  driverRequested: boolean;
  estimate: { currency: "EGP"; total: number; finalAmountConfirmedAtBranch: true };
  customer: {
    fullName: string;
    emailMasked: string;
    phoneMasked: string;
    nationality: string | null;
    customerCategory: "EGYPTIAN" | "FOREIGN" | null;
    addressMasked: string | null;
    emergencyContactNameMasked: string | null;
    emergencyContactPhoneMasked: string | null;
  };
  verification: { email: boolean; phone: boolean };
  documents: Array<{ type: string; label: string; status: string }>;
  consents: {
    policyVersion: string | null;
    requiredAccepted: boolean;
    marketingAccepted: boolean;
    nonEgyptianAcknowledged: boolean;
  };
  blockers: string[];
  canSubmit: boolean;
};

const finalReviewCopy = {
  ar: {
    step: "الخطوة 5 من 6: المراجعة النهائية",
    title: "راجع طلبك قبل إرساله للمبيعات",
    copy: "نعرض بيانات التواصل بصورة مخفية. لن تظهر مستنداتك أو أرقام هويتك هنا.",
    loading: "جارٍ تجهيز المراجعة النهائية...",
    failed: "تعذر تحميل المراجعة النهائية. حاول مرة أخرى.",
    trip: "تفاصيل الرحلة",
    customer: "بيانات العميل المحمية",
    readiness: "جاهزية الطلب",
    documents: "المستندات",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    address: "العنوان",
    emergency: "جهة اتصال الطوارئ",
    verified: "موثّق",
    pending: "بانتظار التوثيق",
    uploaded: "مرفوع بأمان",
    missing: "مطلوب",
    estimate: "التقدير الحالي",
    branchAmount: "المبلغ النهائي يراجعه فريق المبيعات في فرع رحال. لا يوجد دفع إلكتروني.",
    ready: "الطلب المبدئي جاهز للإرسال. تُراجع المستندات في الفرع.",
    blocked: "أكمل البنود التالية قبل الإرسال:",
    submit: "أرسل طلب الحجز للمراجعة",
    submitting: "جارٍ إرسال الطلب بأمان...",
    submitFailed: "تعذر إرسال الطلب. راجع المتطلبات وحاول مرة أخرى.",
    submittedTitle: "تم إرسال طلبك للمراجعة",
    submittedCopy:
      "استلم فريق المبيعات طلبك. ستتم مراجعة المستندات في الفرع، وهذا ليس حجزًا مؤكدًا بعد.",
    submittedAt: "وقت الإرسال",
    pendingReview: "مستندات للمراجعة في الفرع",
    confirmationNotice:
      "التأكيد النهائي يتطلب مراجعة المبيعات والحضور للفرع وتسجيل العربون وتوقيع مستندات الإيجار.",
    driver: "السائق",
    withDriver: "مع سائق",
    selfDrive: "بدون سائق",
    declarationTitle: "إقرار قبل إرسال الطلب",
    declarationCopy: "أؤكد أنني لا أحمل الجنسية المصرية.",
    declarationConfirm: "أؤكد وأرسل الطلب",
    declarationCancel: "العودة للمراجعة",
  },
  en: {
    step: "Step 5 of 6: final review",
    title: "Review your request before sending it to sales",
    copy: "Contact details are masked. Your documents and identity numbers never appear here.",
    loading: "Preparing the final review...",
    failed: "The final review could not be loaded. Please try again.",
    trip: "Trip details",
    customer: "Protected customer details",
    readiness: "Request readiness",
    documents: "Documents",
    email: "Email",
    phone: "Phone",
    address: "Address",
    emergency: "Emergency contact",
    verified: "Verified",
    pending: "Verification pending",
    uploaded: "Uploaded securely",
    missing: "Required",
    estimate: "Current estimate",
    branchAmount:
      "Sales confirms the final amount at the Rahal branch. There is no online payment.",
    ready: "The preliminary request is ready to send. Documents are reviewed at the branch.",
    blocked: "Complete these items before submission:",
    submit: "Send reservation request for review",
    submitting: "Sending request securely...",
    submitFailed: "The request could not be submitted. Review the requirements and try again.",
    submittedTitle: "Your request was sent for review",
    submittedCopy:
      "The sales team received your request. Documents are reviewed at the branch, and this is not a confirmed booking yet.",
    submittedAt: "Submitted at",
    pendingReview: "Documents for branch review",
    confirmationNotice:
      "Final confirmation requires sales review, branch attendance, deposit recording, and signed rental documents.",
    driver: "Driver",
    withDriver: "With driver",
    selfDrive: "Self-drive",
    declarationTitle: "Declaration before submission",
    declarationCopy: "I confirm I do not hold Egyptian nationality.",
    declarationConfirm: "Confirm and send request",
    declarationCancel: "Return to review",
  },
} as const;

const submissionBlockerCopy = {
  ar: {
    EMAIL_VERIFICATION_REQUIRED: "توثيق البريد الإلكتروني",
    CUSTOMER_DETAILS_REQUIRED: "استكمال بيانات العميل",
    REQUIRED_CONSENTS_REQUIRED: "الموافقة على السياسات المطلوبة",
    NON_EGYPTIAN_DECLARATION_REQUIRED: "تأكيد إقرار عدم حمل الجنسية المصرية",
    APPROVED_POLICY_REQUIRED: "اعتماد النسخة النهائية من السياسات قبل الإطلاق",
    REQUIRED_DOCUMENTS_REQUIRED: "رفع كل المستندات المطلوبة",
    VEHICLE_UNAVAILABLE: "اختيار موعد متاح لهذه السيارة",
  },
  en: {
    EMAIL_VERIFICATION_REQUIRED: "Verify the email address",
    CUSTOMER_DETAILS_REQUIRED: "Complete customer details",
    REQUIRED_CONSENTS_REQUIRED: "Accept all required policies",
    NON_EGYPTIAN_DECLARATION_REQUIRED: "Confirm the non-Egyptian nationality declaration",
    APPROVED_POLICY_REQUIRED: "Publish the approved production policy version",
    REQUIRED_DOCUMENTS_REQUIRED: "Upload every required document",
    VEHICLE_UNAVAILABLE: "Choose dates when this vehicle is available",
  },
} as const;

function formatReservationDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatReservationDateTime(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isDateInputValue(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)));
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function maskDraftPhone(value: string) {
  if (value.length < 7) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

export function ReservationStart({
  locale,
  vehicle,
  requestedPickup,
  requestedReturn,
  requestedDriver,
  requestedDraft,
}: {
  locale: PublicLocale;
  vehicle: PublicVehicle;
  requestedPickup?: string;
  requestedReturn?: string;
  requestedDriver?: string;
  requestedDraft?: string;
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
  const [customerCategory, setCustomerCategory] = useState<"EGYPTIAN" | "FOREIGN">("FOREIGN");
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
  const [documentChecklist, setDocumentChecklist] = useState<{
    developmentRules: boolean;
    uploadsEnabled: boolean;
    uploadUnavailableReason: string | null;
    complete: boolean;
    requirements: Array<{
      key: string;
      type: string;
      label: string;
      allowedMimeTypes: string[];
      maxSizeBytes: number;
      uploaded: boolean;
      document?: {
        id: string;
        sizeBytes: number;
        status: string;
      };
    }>;
  } | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [reservationReview, setReservationReview] = useState<ReservationReviewData | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [showNonEgyptianDeclaration, setShowNonEgyptianDeclaration] = useState(false);
  const [nonEgyptianAcknowledged, setNonEgyptianAcknowledged] = useState(false);
  const [submittedReservation, setSubmittedReservation] = useState<{
    id: string;
    reference: string;
    status: "PENDING_REVIEW";
    submittedAt: string;
  } | null>(null);
  const [resumingDraft, setResumingDraft] = useState(Boolean(requestedDraft));
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeConsent, setResumeConsent] = useState<
    CustomerReservationDraftDetail["consents"] | null
  >(null);
  const selectionParams = new URLSearchParams({
    vehicle: vehicle.id,
    pickup,
    return: returnDate,
    driver: driver === "with-driver" ? "with-driver" : driver === "self-drive" ? "self" : "any",
  });
  if (requestedDraft) selectionParams.set("draft", requestedDraft);
  const alternateHref = `${localizedPath(locale === "ar" ? "en" : "ar", "/reservation")}?${selectionParams.toString()}`;
  const backParams = new URLSearchParams(selectionParams);
  backParams.delete("vehicle");
  const backHref = `${localizedPath(locale, "/cars")}/${vehicle.id}?${backParams.toString()}`;

  useEffect(() => {
    if (!requestedDraft) return;
    const controller = new AbortController();
    setResumingDraft(true);
    setResumeError(null);
    fetch(
      `/api/reservations/customer/drafts/${encodeURIComponent(requestedDraft)}?locale=${locale}`,
      {
        credentials: "include",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: CustomerReservationDraftDetail;
          error?: { message?: string };
        };
        if (!response.ok || !payload.data || payload.data.vehicle.id !== vehicle.id) {
          throw new Error(payload.error?.message ?? "draft unavailable");
        }
        const draft = payload.data;
        setPickup(draft.pickupAt.slice(0, 10));
        setReturnDate(draft.returnAt.slice(0, 10));
        setDriver(draft.driverRequested ? "with-driver" : "self-drive");
        setSavedDraft({
          id: draft.id,
          reference: draft.reference,
          estimatedTotalEgp: draft.estimate.total,
        });
        setReviewing(true);
        if (draft.customerDetails) {
          setNationality(draft.customerDetails.nationality);
          // New reservation journeys are available to non-Egyptian nationals; keep legacy
          // category data readable but never carry the old customer-facing choice forward.
          setCustomerCategory("FOREIGN");
          setAddress(draft.customerDetails.address);
          setEmergencyContactName(draft.customerDetails.emergencyContactName);
          setEmergencyContactPhone(draft.customerDetails.emergencyContactPhone);
          setSavedDetails({
            emailMasked: draft.customerDetails.emailMasked,
            phoneMasked: draft.customerDetails.phoneMasked,
            emergencyContactPhoneMasked: maskDraftPhone(
              draft.customerDetails.emergencyContactPhone,
            ),
          });
        }
        setResumeConsent(draft.consents);
        setMarketingAccepted(draft.consents.marketingAccepted);
        if (draft.consents.requiredAccepted && draft.consents.policyVersion) {
          setSavedConsents({
            policyVersion: draft.consents.policyVersion,
            marketingAccepted: draft.consents.marketingAccepted,
          });
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResumeError(copy.resumeFailed);
      })
      .finally(() => setResumingDraft(false));
    return () => controller.abort();
  }, [copy.resumeFailed, locale, requestedDraft, vehicle.id]);

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
        if (
          resumeConsent?.requiredAccepted &&
          resumeConsent.policyVersion === payload.data.version
        ) {
          setAcceptedPolicies(
            Object.fromEntries(payload.data.policies.map((policy) => [policy.key, true])),
          );
        } else {
          setAcceptedPolicies({});
          if (resumeConsent?.requiredAccepted) {
            setSavedConsents(null);
            setDocumentChecklist(null);
          }
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPolicyError(copy.policiesFailed);
      });
    return () => controller.abort();
  }, [copy.policiesFailed, locale, resumeConsent, savedDetails]);

  useEffect(() => {
    if (!savedDraft || !savedConsents) return;
    const controller = new AbortController();
    setDocumentError(null);
    fetch(`/api/reservations/drafts/${encodeURIComponent(savedDraft.id)}/documents`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: typeof documentChecklist };
        if (!response.ok || !payload.data) throw new Error("document checklist unavailable");
        setDocumentChecklist(payload.data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDocumentError(copy.uploadFailed);
      });
    return () => controller.abort();
  }, [copy.uploadFailed, savedConsents, savedDraft]);

  useEffect(() => {
    if (!savedDraft || !documentChecklist || submittedReservation) return;
    const controller = new AbortController();
    setReviewError(null);
    fetch(`/api/reservations/drafts/${encodeURIComponent(savedDraft.id)}/review`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: ReservationReviewData };
        if (!response.ok || !payload.data) throw new Error("reservation review unavailable");
        setReservationReview(payload.data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReviewError(finalReviewCopy[locale].failed);
      });
    return () => controller.abort();
  }, [documentChecklist, locale, savedDraft, submittedReservation]);

  function resetSavedDraft() {
    setReviewing(false);
    setSavedDraft(null);
    setSavedDetails(null);
    setSavedConsents(null);
    setDocumentChecklist(null);
    setReservationReview(null);
    setReviewError(null);
    setSubmittedReservation(null);
    setConsentBundle(null);
    setAcceptedPolicies({});
    setSaveError(null);
    setAuthRequired(false);
  }

  function invalidateCustomerDetails() {
    setSavedDetails(null);
    setSavedConsents(null);
    setDocumentChecklist(null);
    setConsentBundle(null);
    setAcceptedPolicies({});
    setConsentError(null);
    setDocumentError(null);
    setReservationReview(null);
    setReviewError(null);
    setSubmittedReservation(null);
  }

  function invalidateConsents() {
    setSavedConsents(null);
    setDocumentChecklist(null);
    setDocumentError(null);
    setReservationReview(null);
    setReviewError(null);
    setSubmittedReservation(null);
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
            customerCategory,
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

  async function uploadPrivateDocument(type: string, file: File | undefined) {
    if (!savedDraft || !file || !documentChecklist?.uploadsEnabled || uploadingType !== null) {
      return false;
    }
    setUploadingType(type);
    setDocumentError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(
        `/api/reservations/drafts/${encodeURIComponent(savedDraft.id)}/documents/${encodeURIComponent(type)}`,
        { method: "POST", credentials: "include", body },
      );
      const payload = (await response.json()) as {
        data?: NonNullable<typeof documentChecklist>;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        setDocumentError(payload.error?.message ?? copy.uploadFailed);
        return false;
      }
      setDocumentChecklist(payload.data);
      return true;
    } catch {
      setDocumentError(copy.uploadFailed);
      return false;
    } finally {
      setUploadingType(null);
    }
  }

  async function removePrivateDocument(documentId: string) {
    if (!savedDraft || uploadingType !== null || !window.confirm(copy.confirmRemove)) return;
    setDocumentError(null);
    try {
      const response = await fetch(
        `/api/reservations/drafts/${encodeURIComponent(savedDraft.id)}/documents/${encodeURIComponent(documentId)}`,
        { method: "DELETE", credentials: "include" },
      );
      const payload = (await response.json()) as { data?: NonNullable<typeof documentChecklist> };
      if (!response.ok || !payload.data) {
        setDocumentError(copy.removeFailed);
        return;
      }
      setDocumentChecklist(payload.data);
    } catch {
      setDocumentError(copy.removeFailed);
    }
  }

  async function submitReservationRequest() {
    const declarationOnly = Boolean(
      reservationReview &&
      reservationReview.blockers.length === 1 &&
      reservationReview.blockers[0] === "NON_EGYPTIAN_DECLARATION_REQUIRED",
    );
    if (!savedDraft || (!reservationReview?.canSubmit && !declarationOnly)) return;
    if (!nonEgyptianAcknowledged) {
      setShowNonEgyptianDeclaration(true);
      return;
    }
    setSubmittingRequest(true);
    setReviewError(null);
    try {
      const response = await fetch(
        `/api/reservations/drafts/${encodeURIComponent(savedDraft.id)}/submit`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nonEgyptianAcknowledged: true }),
        },
      );
      const payload = (await response.json()) as {
        data?: {
          id: string;
          reference: string;
          status: "PENDING_REVIEW";
          submittedAt: string;
        };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        setReviewError(payload.error?.message ?? finalReviewCopy[locale].submitFailed);
        return;
      }
      setSubmittedReservation(payload.data);
    } catch {
      setReviewError(finalReviewCopy[locale].submitFailed);
    } finally {
      setSubmittingRequest(false);
    }
  }

  const declarationOnly = Boolean(
    reservationReview &&
    reservationReview.blockers.length === 1 &&
    reservationReview.blockers[0] === "NON_EGYPTIAN_DECLARATION_REQUIRED",
  );

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
                {savedConsents
                  ? copy.documentsStep
                  : savedDetails
                    ? copy.stepThree
                    : savedDraft
                      ? copy.stepTwo
                      : copy.step}
              </span>
              <h1>{copy.title}</h1>
              <p>{copy.copy}</p>
              <div className="reservation-progress" aria-label={copy.step}>
                {Array.from({ length: 6 }, (_, index) => (
                  <span
                    className={
                      index <=
                      (submittedReservation
                        ? 5
                        : reservationReview
                          ? 4
                          : savedConsents
                            ? 3
                            : savedDetails
                              ? 2
                              : savedDraft
                                ? 1
                                : 0)
                        ? "is-active"
                        : ""
                    }
                    key={index}
                  >
                    <b>{String(index + 1).padStart(2, "0")}</b>
                  </span>
                ))}
              </div>
              {resumingDraft || requestedDraft ? (
                <p
                  className={`reservation-resume-state${resumeError ? " is-error" : ""}`}
                  role={resumeError ? "alert" : "status"}
                >
                  <span aria-hidden="true">{resumeError ? "!" : "↻"}</span>
                  {resumeError
                    ? resumeError
                    : resumingDraft
                      ? copy.resumingDraft
                      : copy.resumedDraft}
                </p>
              ) : null}
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
                            invalidateCustomerDetails();
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
                            invalidateCustomerDetails();
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
                            invalidateCustomerDetails();
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
                            invalidateCustomerDetails();
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
                                    invalidateConsents();
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
                                invalidateConsents();
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
                  {savedConsents && documentChecklist ? (
                    <section className="reservation-form reservation-documents">
                      <div className="reservation-form-heading">
                        <span>04</span>
                        <div>
                          <h2>{copy.documentsTitle}</h2>
                          <p>{copy.documentsCopy}</p>
                        </div>
                      </div>
                      {documentChecklist.developmentRules ? (
                        <div className="reservation-assurance__notice">{copy.developmentRules}</div>
                      ) : null}
                      {!documentChecklist.uploadsEnabled ? (
                        <div className="reservation-assurance__notice" role="status">
                          <strong>{copy.uploadsDisabled}</strong>
                        </div>
                      ) : null}
                      <div className="reservation-document-list">
                        {documentChecklist.requirements.map((requirement) => (
                          <article className="reservation-document" key={requirement.key}>
                            <div>
                              <strong>{requirement.label}</strong>
                              <small>
                                {copy.documentFormats}{" "}
                                {Math.round(requirement.maxSizeBytes / 1024 / 1024)} MB
                              </small>
                              {requirement.document ? (
                                <p>
                                  {copy.uploadedFile} ·{" "}
                                  {Math.max(1, Math.round(requirement.document.sizeBytes / 1024))}{" "}
                                  KB
                                </p>
                              ) : null}
                            </div>
                            <div className="reservation-document__actions">
                              <label className="button button--dark">
                                {uploadingType === requirement.type
                                  ? copy.uploadingFile
                                  : requirement.uploaded
                                    ? copy.replaceFile
                                    : copy.chooseFile}
                                <input
                                  accept={requirement.allowedMimeTypes.join(",")}
                                  disabled={
                                    !documentChecklist.uploadsEnabled || uploadingType !== null
                                  }
                                  onChange={async (event) => {
                                    const file = event.currentTarget.files?.[0];
                                    const uploaded = await uploadPrivateDocument(
                                      requirement.type,
                                      file,
                                    );
                                    if (uploaded) event.currentTarget.value = "";
                                  }}
                                  type="file"
                                />
                              </label>
                              {requirement.document ? (
                                <button
                                  className="button button--outline"
                                  disabled={uploadingType !== null}
                                  onClick={() =>
                                    void removePrivateDocument(requirement.document!.id)
                                  }
                                  type="button"
                                >
                                  {copy.removeFile}
                                </button>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                      {documentChecklist.complete ? (
                        <div className="reservation-assurance__notice">
                          <strong>{copy.documentsComplete}</strong>
                        </div>
                      ) : null}
                      {documentError ? <p>{documentError}</p> : null}
                    </section>
                  ) : null}
                  {savedDraft && documentChecklist ? (
                    <section className="reservation-form reservation-final-review">
                      <div className="reservation-form-heading">
                        <span>05</span>
                        <div>
                          <h2>{finalReviewCopy[locale].title}</h2>
                          <p>{finalReviewCopy[locale].copy}</p>
                        </div>
                      </div>
                      {submittedReservation ? (
                        <div className="reservation-submit-success" aria-live="polite">
                          <span>{finalReviewCopy[locale].pendingReview}</span>
                          <h3>{finalReviewCopy[locale].submittedTitle}</h3>
                          <p>{finalReviewCopy[locale].submittedCopy}</p>
                          <dl>
                            <div>
                              <dt>{copy.reference}</dt>
                              <dd>{submittedReservation.reference}</dd>
                            </div>
                            <div>
                              <dt>{finalReviewCopy[locale].submittedAt}</dt>
                              <dd>
                                {formatReservationDateTime(
                                  submittedReservation.submittedAt,
                                  locale,
                                )}
                              </dd>
                            </div>
                          </dl>
                          <strong>{finalReviewCopy[locale].confirmationNotice}</strong>
                        </div>
                      ) : reservationReview ? (
                        <>
                          <div className="reservation-review-grid">
                            <article className="reservation-review-card">
                              <span>{finalReviewCopy[locale].trip}</span>
                              <h3>{reservationReview.vehicle.name}</h3>
                              <dl>
                                <div>
                                  <dt>{copy.pickup}</dt>
                                  <dd>
                                    {formatReservationDateTime(reservationReview.pickupAt, locale)}
                                  </dd>
                                </div>
                                <div>
                                  <dt>{copy.return}</dt>
                                  <dd>
                                    {formatReservationDateTime(reservationReview.returnAt, locale)}
                                  </dd>
                                </div>
                                <div>
                                  <dt>{copy.branch}</dt>
                                  <dd>{reservationReview.branch.name}</dd>
                                </div>
                                <div>
                                  <dt>{finalReviewCopy[locale].driver}</dt>
                                  <dd>
                                    {reservationReview.driverRequested
                                      ? finalReviewCopy[locale].withDriver
                                      : finalReviewCopy[locale].selfDrive}
                                  </dd>
                                </div>
                              </dl>
                            </article>
                            <article className="reservation-review-card">
                              <span>{finalReviewCopy[locale].customer}</span>
                              <h3>{reservationReview.customer.fullName}</h3>
                              <dl>
                                <div>
                                  <dt>{finalReviewCopy[locale].email}</dt>
                                  <dd>{reservationReview.customer.emailMasked}</dd>
                                </div>
                                <div>
                                  <dt>{finalReviewCopy[locale].phone}</dt>
                                  <dd>{reservationReview.customer.phoneMasked}</dd>
                                </div>
                                <div>
                                  <dt>{finalReviewCopy[locale].address}</dt>
                                  <dd>{reservationReview.customer.addressMasked ?? "—"}</dd>
                                </div>
                                <div>
                                  <dt>{finalReviewCopy[locale].emergency}</dt>
                                  <dd>
                                    {reservationReview.customer.emergencyContactNameMasked ?? "—"}
                                    {reservationReview.customer.emergencyContactPhoneMasked
                                      ? ` · ${reservationReview.customer.emergencyContactPhoneMasked}`
                                      : ""}
                                  </dd>
                                </div>
                              </dl>
                            </article>
                            <article className="reservation-review-card reservation-review-card--wide">
                              <span>{finalReviewCopy[locale].documents}</span>
                              <ul className="reservation-review-documents">
                                {reservationReview.documents.map((document) => (
                                  <li key={document.type}>
                                    <strong>{document.label}</strong>
                                    <small>
                                      {document.status === "MISSING" ||
                                      document.status === "REJECTED"
                                        ? finalReviewCopy[locale].missing
                                        : finalReviewCopy[locale].uploaded}
                                    </small>
                                  </li>
                                ))}
                              </ul>
                            </article>
                          </div>
                          <div className="reservation-review-total">
                            <span>{finalReviewCopy[locale].estimate}</span>
                            <strong>{formatEgp(reservationReview.estimate.total, locale)}</strong>
                            <p>{finalReviewCopy[locale].branchAmount}</p>
                          </div>
                          <div
                            className={`reservation-readiness${reservationReview.canSubmit ? " is-ready" : ""}`}
                          >
                            <span>{finalReviewCopy[locale].readiness}</span>
                            {reservationReview.canSubmit ? (
                              <strong>{finalReviewCopy[locale].ready}</strong>
                            ) : (
                              <>
                                <strong>{finalReviewCopy[locale].blocked}</strong>
                                <ul>
                                  {reservationReview.blockers.map((blocker) => (
                                    <li key={blocker}>
                                      {submissionBlockerCopy[locale][
                                        blocker as keyof (typeof submissionBlockerCopy)[typeof locale]
                                      ] ?? blocker}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                          <button
                            className="button button--gold reservation-submit-button"
                            disabled={
                              (!reservationReview.canSubmit && !declarationOnly) ||
                              submittingRequest
                            }
                            onClick={() => void submitReservationRequest()}
                            type="button"
                          >
                            {submittingRequest
                              ? finalReviewCopy[locale].submitting
                              : finalReviewCopy[locale].submit}
                            <Icon name="arrow" size={18} />
                          </button>
                          {showNonEgyptianDeclaration ? (
                            <div
                              className="reservation-declaration-dialog"
                              role="dialog"
                              aria-modal="true"
                            >
                              <div className="reservation-declaration-dialog__panel">
                                <span className="reservation-declaration-dialog__eyebrow">
                                  {finalReviewCopy[locale].declarationTitle}
                                </span>
                                <p>{finalReviewCopy[locale].declarationCopy}</p>
                                <label className="reservation-declaration-dialog__check">
                                  <input
                                    checked={nonEgyptianAcknowledged}
                                    onChange={(event) =>
                                      setNonEgyptianAcknowledged(event.target.checked)
                                    }
                                    type="checkbox"
                                  />
                                  <span>{finalReviewCopy[locale].declarationCopy}</span>
                                </label>
                                <div className="reservation-declaration-dialog__actions">
                                  <button
                                    className="button button--gold"
                                    disabled={!nonEgyptianAcknowledged || submittingRequest}
                                    onClick={() => void submitReservationRequest()}
                                    type="button"
                                  >
                                    {finalReviewCopy[locale].declarationConfirm}
                                  </button>
                                  <button
                                    className="button button--outline"
                                    onClick={() => setShowNonEgyptianDeclaration(false)}
                                    type="button"
                                  >
                                    {finalReviewCopy[locale].declarationCancel}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p>{finalReviewCopy[locale].loading}</p>
                      )}
                      {reviewError ? (
                        <p className="reservation-review-error">{reviewError}</p>
                      ) : null}
                    </section>
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
