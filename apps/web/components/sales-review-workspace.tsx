"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEgp, localizedPath, type PublicLocale } from "../lib/public-content";
import { ProtectedDocumentStudio } from "./protected-document-studio";
import { WorkspaceShell } from "./workspace-shell";
import { WorkspaceState } from "./workspace-state";

type QueueStatus =
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "PRE_APPROVED"
  | "ALTERNATIVE_OFFERED"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

type QueueItem = {
  id: string;
  reference: string;
  status: QueueStatus;
  submittedAt: string;
  pickupAt: string;
  returnAt: string;
  driverRequested: boolean;
  estimate: { currency: "EGP"; total: number };
  vehicle: { id: string; name: string };
  branch: { id: string; name: string };
  customer: { name: string; emailMasked: string; phoneMasked: string };
  assignedToCurrentUser: boolean;
};

type Review = QueueItem & {
  canReviewDocuments: boolean;
  protectedUploadsEnabled: boolean;
  customer: QueueItem["customer"] & {
    nationality: string | null;
    customerCategory: "EGYPTIAN" | "FOREIGN" | null;
    addressMasked: string | null;
    emergencyContactNameMasked: string | null;
    emergencyContactPhoneMasked: string | null;
  };
  verification: { email: boolean };
  consents: {
    policyVersion: string | null;
    requiredAccepted: boolean;
    nonEgyptianAcknowledged: boolean;
  };
  documents: Array<{
    id: string;
    type: string;
    status: string;
    uploadedAt: string;
    rejectionReason: string | null;
  }>;
  timeline: Array<{
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
  alternativeOffer: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN";
    proposedPickupAt: string;
    proposedReturnAt: string;
    estimate: { currency: "EGP"; total: number; dailyRate: number };
    vehicle: { id: string; name: string };
    note: string | null;
    expiresAt: string;
    respondedAt: string | null;
  } | null;
  branchProgress: {
    expectedDepositEgp: number | null;
    attendedAt: string | null;
    deposit: {
      amountEgp: number;
      receiptNumber: string;
      recordedAt: string;
    } | null;
    contract: {
      status: "DRAFT" | "READY_FOR_SIGNATURE" | "SIGNED" | "VOIDED";
      signedAt: string | null;
    } | null;
    booking: {
      reference: string;
      status: "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
      confirmedAt: string;
    } | null;
    operations: Array<{
      type: "DELIVERY" | "RETURN";
      odometerKm: number;
      fuelLevelPercent: number;
      conditionNote: string;
      recordedAt: string;
    }>;
  };
};

type OfferVehicle = {
  id: string;
  name: { ar: string; en: string };
  dailyRateEgp: number;
  status: "available" | "review";
};

type DecisionResult = {
  id: string;
  reference: string;
  status: "MORE_INFORMATION_REQUIRED" | "PRE_APPROVED" | "REJECTED";
  decidedAt: string;
  expiresAt: string | null;
};

type BranchChecklistResult = {
  attendedAt: string;
  depositRecordedAt: string;
  contractSignedAt: string;
};

type BookingConfirmationResult = {
  status: "CONFIRMED";
  booking: {
    reference: string;
    status: "CONFIRMED";
    confirmedAt: string;
  };
};

type BookingOperationResult = {
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  action: "DELIVER" | "RETURN" | "COMPLETE" | "CANCEL" | "NO_SHOW";
  recordedAt: string;
};

const copy = {
  ar: {
    brand: "رحال / المبيعات",
    home: "الموقع الرئيسي",
    language: "English",
    eyebrow: "مساحة عمل فريق المبيعات",
    title: "راجع كل طلب بوضوح قبل أي قرار.",
    subtitle: "هذه القائمة للطلبات المرسلة فقط. استلام الطلب يبدأ المراجعة ولا يؤكد الحجز.",
    queue: "قائمة المراجعة",
    totalMetric: "كل الطلبات",
    pendingMetric: "بانتظار المراجعة",
    reviewingMetric: "قيد المراجعة",
    actionMetric: "جاهز لإجراءات الفرع",
    all: "الكل",
    pending: "بانتظار المراجعة",
    reviewing: "قيد المراجعة",
    moreInfo: "معلومات إضافية مطلوبة",
    alternativeStatus: "عرض بديل مرسل",
    confirmedStatus: "حجز مؤكد",
    activeStatus: "إيجار نشط",
    completedStatus: "مكتمل",
    cancelledStatus: "ملغي",
    noShowStatus: "عدم حضور",
    loading: "جارٍ تحميل طلبات المبيعات...",
    empty: "لا توجد طلبات في هذه القائمة الآن.",
    signIn: "سجّل الدخول بحساب موظف المبيعات",
    forbidden: "هذا القسم متاح لحسابات المبيعات والإدارة فقط.",
    unavailable: "تعذر تحميل مساحة المبيعات الآن.",
    submitted: "تم الإرسال",
    pickup: "الاستلام",
    return: "الإرجاع",
    estimate: "التقدير",
    branch: "الفرع",
    customer: "العميل",
    open: "افتح المراجعة",
    availableOwner: "متاح للاستلام",
    yourOwner: "مراجعتك",
    teamOwner: "مسند لموظف مبيعات",
    select: "اختر طلبًا من القائمة لمراجعة تفاصيله المحمية.",
    protected: "تفاصيل محمية",
    contact: "التواصل المخفي",
    nationality: "الجنسية",
    address: "العنوان المخفي",
    emergency: "الطوارئ",
    verification: "التوثيق",
    email: "البريد",
    phone: "الهاتف",
    verified: "موثّق",
    notVerified: "غير موثّق",
    documents: "حالة المستندات",
    noDocuments: "لا توجد مستندات مسجلة.",
    inspectDocument: "فحص المستند",
    accessReason: "سبب الوصول للمستند",
    accessPlaceholder: "اكتب سببًا تشغيليًا واضحًا لا يقل عن 10 أحرف",
    viewProtected: "عرض محمي",
    verifyDocument: "قبول المستند",
    rejectDocument: "رفض وطلب بديل",
    closePreview: "إغلاق المعاينة",
    documentActionFailed: "تعذر تنفيذ إجراء المستند.",
    consent: "نسخة الموافقات",
    nationalityDeclaration: "إقرار عدم حمل الجنسية المصرية",
    declarationConfirmed: "تم التأكيد",
    declarationMissing: "غير مؤكد",
    timeline: "سجل الطلب",
    claim: "استلم الطلب للمراجعة",
    claiming: "جارٍ استلام الطلب...",
    assigned: "هذا الطلب مسند إليك",
    claimNoticeTitle: "استلام واحد، مسؤولية واضحة.",
    claimNoticeCopy:
      "بمجرد استلامك للطلب يُقفل تلقائيًا أمام باقي فريق المبيعات. تظل الإدارة قادرة على مراجعة سجل الوصول والقرارات عند الحاجة.",
    claimFailed: "تعذر استلام الطلب؛ ربما استلمه موظف آخر.",
    safety:
      "لا تظهر روابط الملفات أو أرقام الهوية هنا. الحجز النهائي يتطلب الحضور للفرع والعربون والعقد الموقع.",
    decisionTitle: "قرار المراجعة",
    decisionCopy: "اكتب رسالة واضحة للعميل ثم اختر الإجراء المناسب. لا يؤكد أي إجراء هنا الحجز.",
    decisionNote: "رسالة العميل",
    decisionPlaceholder: "اشرح المطلوب أو سبب القرار بوضوح (10 أحرف على الأقل)",
    decisionHint: "ستُحفظ الرسالة في سجل محادثات الطلب ويصل للعميل إشعار منفصل.",
    requestInfo: "اطلب معلومات إضافية",
    preApprove: "موافقة مبدئية لمدة 48 ساعة",
    reject: "ارفض الطلب",
    deciding: "جارٍ تسجيل القرار...",
    decisionFailed: "تعذر تسجيل القرار. راجع الرسالة وحالة إسناد الطلب.",
    decisionDone: "تم تسجيل القرار وإبلاغ العميل",
    expires: "تنتهي الموافقة المبدئية",
    moreInfoDone: "بانتظار معلومات إضافية من العميل.",
    preApprovedDone: "الطلب موافق عليه مبدئيًا فقط، وليس حجزًا مؤكدًا.",
    rejectedDone: "تم إغلاق الطلب وشرح السبب للعميل.",
    moreInfoStatus: "معلومات إضافية مطلوبة",
    preApprovedStatus: "موافقة مبدئية",
    rejectedStatus: "مرفوض",
    driver: "مع سائق",
    selfDrive: "بدون سائق",
    alternativeTitle: "اقترح بديلًا",
    alternativeCopy: "اختر سيارة ومواعيد مناسبة. العرض صالح 48 ساعة ولا يؤكد الحجز.",
    alternativeVehicle: "السيارة البديلة",
    alternativePickup: "موعد الاستلام المقترح",
    alternativeReturn: "موعد الإرجاع المقترح",
    alternativeNote: "رسالة العرض للعميل",
    alternativePlaceholder: "اشرح سبب العرض وما الذي تغير بوضوح",
    sendAlternative: "إرسال العرض البديل",
    sendingAlternative: "جاري إرسال العرض...",
    alternativeSent: "تم إرسال العرض البديل للعميل لمدة 48 ساعة.",
    alternativeFailed: "تعذر إرسال العرض. راجع السيارة والمواعيد والرسالة.",
    currentAlternative: "العرض البديل الحالي",
    offerExpires: "ينتهي",
    branchTitle: "إتمام إجراءات الفرع",
    branchCopy:
      "سجّل الحضور وإيصال العربون والعقد الموقع أولًا. التأكيد النهائي إجراء منفصل ويعيد فحص إتاحة السيارة.",
    attendance: "حضور العميل للفرع",
    attendanceConfirmed: "تم التأكد من حضور العميل",
    deposit: "العربون",
    depositAmount: "قيمة العربون المطلوبة",
    receiptNumber: "رقم إيصال الفرع",
    receiptPlaceholder: "مثال: RCP-2026-00124",
    contract: "العقد",
    contractConfirmed: "تم توقيع عقد الإيجار داخل الفرع",
    contractUpload: "نسخة العقد الموقّع",
    contractUploadHint: "PDF فقط، بحد أقصى 10 MB. يُحفظ في مساحة خاصة ولا يظهر كرابط عام.",
    contractChoose: "اختيار ملف PDF",
    contractUploadAction: "رفع العقد وحمايته",
    contractUploading: "جارٍ حماية العقد...",
    contractStored: "تم حفظ العقد الموقّع",
    contractProtected: "النسخة محمية ومربوطة بهذا الطلب فقط.",
    contractUploadFailed: "تعذر حفظ العقد. تأكد أنه ملف PDF صالح وأن الطلب ما زال نشطًا.",
    contractUploadsDisabled:
      "رفع العقود متوقف في نسخة التسليم حتى اعتماد التخزين الخاص وفحص الملفات.",
    contractAccessReason: "اكتب سبب فتح العقد (10 أحرف على الأقل)",
    contractOpen: "فتح النسخة المحمية",
    contractOpening: "جارٍ فتح العقد...",
    contractPreview: "معاينة العقد الموقّع المحمي",
    contractAccessFailed: "تعذر فتح العقد أو لم يتم تسجيل سبب واضح للوصول.",
    recordBranch: "حفظ إجراءات الفرع",
    recordingBranch: "جارٍ حفظ الإجراءات...",
    branchRecorded: "تم تسجيل الحضور والعربون والعقد بنجاح.",
    branchFailed: "تعذر حفظ إجراءات الفرع. راجع المبلغ ورقم الإيصال وحالة الطلب.",
    confirmBooking: "تأكيد الحجز نهائيًا",
    confirmingBooking: "جارٍ تأكيد الحجز...",
    confirmationWarning: "هذا الإجراء ينشئ حجزًا مؤكدًا ويمنع تعارض السيارة في نفس المدة.",
    bookingConfirmed: "تم تأكيد الحجز",
    bookingReference: "رقم الحجز",
    confirmationFailed: "تعذر تأكيد الحجز. قد تكون السيارة غير متاحة أو إجراءات الفرع غير مكتملة.",
    operationsTitle: "تشغيل الحجز",
    operationsCopy:
      "سجّل قراءة العداد والوقود وحالة السيارة عند التسليم والإرجاع. كل خطوة محفوظة باسم الموظف ووقتها.",
    delivery: "تسليم السيارة",
    vehicleReturn: "إرجاع السيارة",
    completeRental: "إكمال الإيجار",
    cancelBooking: "إلغاء الحجز",
    markNoShow: "تسجيل عدم حضور",
    odometer: "قراءة العداد بالكيلومتر",
    fuelLevel: "مستوى الوقود %",
    conditionNote: "ملاحظة حالة السيارة أو سبب الإجراء",
    operationPlaceholder: "اكتب وصفًا واضحًا لا يقل عن 10 أحرف",
    recordOperation: "تسجيل الإجراء",
    recordingOperation: "جارٍ تسجيل الإجراء...",
    operationFailed: "تعذر تسجيل الإجراء. راجع حالة الحجز والبيانات المدخلة.",
    operationDone: "تم تسجيل الإجراء وتحديث حالة العميل.",
    deliveryReading: "بيانات التسليم",
    returnReading: "بيانات الإرجاع",
  },
  en: {
    brand: "RAHAL / SALES",
    home: "Public website",
    language: "العربية",
    eyebrow: "SALES REVIEW WORKSPACE",
    title: "Review every request clearly before any decision.",
    subtitle:
      "Only submitted requests appear here. Claiming starts review and never confirms a booking.",
    queue: "Review queue",
    totalMetric: "All requests",
    pendingMetric: "Pending review",
    reviewingMetric: "Under review",
    actionMetric: "Ready for branch",
    all: "All",
    pending: "Pending review",
    reviewing: "Under review",
    moreInfo: "More information required",
    alternativeStatus: "Alternative offered",
    confirmedStatus: "Confirmed booking",
    activeStatus: "Active rental",
    completedStatus: "Completed",
    cancelledStatus: "Cancelled",
    noShowStatus: "No show",
    loading: "Loading sales requests...",
    empty: "There are no requests in this queue right now.",
    signIn: "Sign in with a sales employee account",
    forbidden: "This workspace is available only to sales and administrator accounts.",
    unavailable: "The sales workspace could not be loaded right now.",
    submitted: "Submitted",
    pickup: "Pickup",
    return: "Return",
    estimate: "Estimate",
    branch: "Branch",
    customer: "Customer",
    open: "Open review",
    availableOwner: "Available to claim",
    yourOwner: "Your review",
    teamOwner: "Owned by sales",
    select: "Choose a request from the queue to inspect its protected details.",
    protected: "Protected details",
    contact: "Masked contact",
    nationality: "Nationality",
    address: "Masked address",
    emergency: "Emergency contact",
    verification: "Verification",
    email: "Email",
    phone: "Phone",
    verified: "Verified",
    notVerified: "Not verified",
    documents: "Document status",
    noDocuments: "No documents are recorded.",
    inspectDocument: "Inspect document",
    accessReason: "Reason for document access",
    accessPlaceholder: "Enter a clear operational reason of at least 10 characters",
    viewProtected: "Protected preview",
    verifyDocument: "Verify document",
    rejectDocument: "Reject and request replacement",
    closePreview: "Close preview",
    documentActionFailed: "The document action could not be completed.",
    consent: "Consent version",
    nationalityDeclaration: "Non-Egyptian nationality declaration",
    declarationConfirmed: "Confirmed",
    declarationMissing: "Not confirmed",
    timeline: "Request timeline",
    claim: "Claim request for review",
    claiming: "Claiming request...",
    assigned: "This request is assigned to you",
    claimNoticeTitle: "One owner. Clear accountability.",
    claimNoticeCopy:
      "Claiming immediately locks this request to you and removes it from every other sales queue. Administrators retain read-only oversight of access and decisions.",
    claimFailed: "The request could not be claimed; another employee may have taken it.",
    safety:
      "File links and identity numbers never appear here. Final booking requires branch attendance, deposit, and a signed contract.",
    decisionTitle: "Review decision",
    decisionCopy:
      "Write a clear customer message, then choose the appropriate action. No action here confirms a booking.",
    decisionNote: "Customer message",
    decisionPlaceholder: "Clearly explain what is needed or why (at least 10 characters)",
    decisionHint:
      "The message is stored in the request conversation and a separate notification is queued.",
    requestInfo: "Request more information",
    preApprove: "Pre-approve for 48 hours",
    reject: "Reject request",
    deciding: "Recording decision...",
    decisionFailed: "The decision could not be recorded. Check the message and assignment state.",
    decisionDone: "Decision recorded and customer notified",
    expires: "Pre-approval expires",
    moreInfoDone: "Waiting for more information from the customer.",
    preApprovedDone: "The request is only pre-approved; it is not a confirmed booking.",
    rejectedDone: "The request was closed and the reason was sent to the customer.",
    moreInfoStatus: "More information required",
    preApprovedStatus: "Pre-approved",
    rejectedStatus: "Rejected",
    driver: "With driver",
    selfDrive: "Self-drive",
    alternativeTitle: "Propose an alternative",
    alternativeCopy:
      "Choose a suitable vehicle and dates. The offer lasts 48 hours and never confirms a booking.",
    alternativeVehicle: "Alternative vehicle",
    alternativePickup: "Proposed pickup",
    alternativeReturn: "Proposed return",
    alternativeNote: "Offer message to customer",
    alternativePlaceholder: "Clearly explain why this alternative is being offered",
    sendAlternative: "Send alternative offer",
    sendingAlternative: "Sending offer...",
    alternativeSent: "The 48-hour alternative offer was sent to the customer.",
    alternativeFailed: "The offer could not be sent. Check the vehicle, dates, and message.",
    currentAlternative: "Current alternative offer",
    offerExpires: "Expires",
    branchTitle: "Complete branch requirements",
    branchCopy:
      "Record attendance, the deposit receipt, and the signed contract first. Final confirmation is separate and rechecks vehicle availability.",
    attendance: "Customer branch attendance",
    attendanceConfirmed: "Customer attendance was verified",
    deposit: "Deposit",
    depositAmount: "Required deposit amount",
    receiptNumber: "Branch receipt number",
    receiptPlaceholder: "Example: RCP-2026-00124",
    contract: "Contract",
    contractConfirmed: "The rental contract was signed at the branch",
    contractUpload: "Signed contract copy",
    contractUploadHint:
      "PDF only, up to 10 MB. It stays in private storage and is never exposed as a public link.",
    contractChoose: "Choose PDF file",
    contractUploadAction: "Upload and protect contract",
    contractUploading: "Protecting contract...",
    contractStored: "Signed contract protected",
    contractProtected: "The private copy is linked only to this request.",
    contractUploadFailed:
      "The contract could not be stored. Use a valid PDF and check that the request is still active.",
    contractUploadsDisabled:
      "Contract upload is disabled in this delivery build until private storage and file scanning are approved.",
    contractAccessReason: "Reason for opening the contract (at least 10 characters)",
    contractOpen: "Open protected copy",
    contractOpening: "Opening contract...",
    contractPreview: "Protected signed contract preview",
    contractAccessFailed:
      "The contract could not be opened or a clear access reason was not recorded.",
    recordBranch: "Save branch requirements",
    recordingBranch: "Saving branch requirements...",
    branchRecorded: "Attendance, deposit, and signed contract were recorded.",
    branchFailed:
      "Branch requirements could not be saved. Check the amount, receipt, and request status.",
    confirmBooking: "Confirm booking",
    confirmingBooking: "Confirming booking...",
    confirmationWarning:
      "This creates a confirmed booking and protects the vehicle period from conflicts.",
    bookingConfirmed: "Booking confirmed",
    bookingReference: "Booking reference",
    confirmationFailed:
      "The booking could not be confirmed. The vehicle may be unavailable or branch steps incomplete.",
    operationsTitle: "Booking operations",
    operationsCopy:
      "Record odometer, fuel, and vehicle condition at delivery and return. Every step keeps its staff actor and time.",
    delivery: "Deliver vehicle",
    vehicleReturn: "Record vehicle return",
    completeRental: "Complete rental",
    cancelBooking: "Cancel booking",
    markNoShow: "Mark no-show",
    odometer: "Odometer in kilometres",
    fuelLevel: "Fuel level %",
    conditionNote: "Vehicle condition or operation reason",
    operationPlaceholder: "Add a clear note of at least 10 characters",
    recordOperation: "Record operation",
    recordingOperation: "Recording operation...",
    operationFailed: "The operation could not be recorded. Check the booking state and fields.",
    operationDone: "Operation recorded and customer status updated.",
    deliveryReading: "Delivery reading",
    returnReading: "Return reading",
  },
} as const;

function formatDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: QueueStatus, locale: PublicLocale) {
  const labels = copy[locale];
  if (status === "UNDER_REVIEW") return labels.reviewing;
  if (status === "MORE_INFORMATION_REQUIRED") return labels.moreInfo;
  if (status === "ALTERNATIVE_OFFERED") return labels.alternativeStatus;
  if (status === "PRE_APPROVED") return labels.preApprovedStatus;
  if (status === "CONFIRMED") return labels.confirmedStatus;
  if (status === "ACTIVE") return labels.activeStatus;
  if (status === "COMPLETED") return labels.completedStatus;
  if (status === "CANCELLED") return labels.cancelledStatus;
  if (status === "NO_SHOW") return labels.noShowStatus;
  return labels.pending;
}

export function SalesReviewWorkspace({
  locale,
  workspaceKind = "sales",
}: {
  locale: PublicLocale;
  workspaceKind?: "sales" | "admin";
}) {
  const text = copy[locale];
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<"ALL" | QueueStatus>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [decidingAction, setDecidingAction] = useState<string | null>(null);
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState<"AUTH" | "FORBIDDEN" | "GENERAL" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fleet, setFleet] = useState<OfferVehicle[]>([]);
  const [offerVehicleId, setOfferVehicleId] = useState("");
  const [offerPickup, setOfferPickup] = useState("");
  const [offerReturn, setOfferReturn] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [offering, setOffering] = useState(false);
  const [offerCreatedExpires, setOfferCreatedExpires] = useState<string | null>(null);
  const [customerAttended, setCustomerAttended] = useState(false);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [contractAccessReason, setContractAccessReason] = useState("");
  const [contractUrl, setContractUrl] = useState<string | null>(null);
  const [viewingContract, setViewingContract] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [branchNote, setBranchNote] = useState("");
  const [recordingBranch, setRecordingBranch] = useState(false);
  const [confirmingBooking, setConfirmingBooking] = useState(false);
  const [branchFeedback, setBranchFeedback] = useState<"RECORDED" | "CONFIRMED" | null>(null);
  const [operationNote, setOperationNote] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [fuelLevelPercent, setFuelLevelPercent] = useState("");
  const [operatingAction, setOperatingAction] = useState<
    "DELIVER" | "RETURN" | "COMPLETE" | "CANCEL" | "NO_SHOW" | null
  >(null);
  const [operationFeedback, setOperationFeedback] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reservations/sales/queue?locale=${locale}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: QueueItem[] };
        if (response.status === 401) return setError("AUTH");
        if (response.status === 403) return setError("FORBIDDEN");
        if (!response.ok || !payload.data) return setError("GENERAL");
        setQueue(payload.data);
        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get("request");
        const requestedFilter = params.get("filter");
        if (requestedFilter === "OPEN" || requestedFilter === "ATTENTION") {
          setFilter("ALL");
        } else if (
          [
            "PENDING_REVIEW",
            "UNDER_REVIEW",
            "MORE_INFORMATION_REQUIRED",
            "PRE_APPROVED",
            "ALTERNATIVE_OFFERED",
            "CONFIRMED",
            "ACTIVE",
            "COMPLETED",
            "CANCELLED",
            "NO_SHOW",
          ].includes(requestedFilter ?? "")
        ) {
          setFilter(requestedFilter as QueueStatus);
        }
        const initial = payload.data.find((item) => item.id === requestedId) ?? payload.data[0];
        if (initial) void openReview(initial.id);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError("GENERAL");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [locale]);

  useEffect(() => {
    fetch("/api/vehicles", { credentials: "include" })
      .then(async (response) =>
        response.ok ? ((await response.json()) as { data?: OfferVehicle[] }) : {},
      )
      .then((payload) =>
        setFleet(payload.data?.filter((vehicle) => vehicle.status === "available") ?? []),
      )
      .catch(() => setFleet([]));
  }, []);

  useEffect(
    () => () => {
      if (contractUrl) URL.revokeObjectURL(contractUrl);
    },
    [contractUrl],
  );

  const filteredQueue = useMemo(() => {
    const queryFilter =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("filter");
    if (queryFilter === "OPEN")
      return queue.filter((item) =>
        [
          "PENDING_REVIEW",
          "UNDER_REVIEW",
          "MORE_INFORMATION_REQUIRED",
          "PRE_APPROVED",
          "ALTERNATIVE_OFFERED",
        ].includes(item.status),
      );
    if (queryFilter === "ATTENTION")
      return queue.filter((item) => ["ACTIVE", "PRE_APPROVED"].includes(item.status));
    return queue.filter((item) => filter === "ALL" || item.status === filter);
  }, [filter, queue]);
  const pendingCount = queue.filter((item) => item.status === "PENDING_REVIEW").length;
  const reviewingCount = queue.filter((item) => item.status === "UNDER_REVIEW").length;
  const customerActionCount = queue.filter((item) => item.status === "PRE_APPROVED").length;
  const branchRequirementsComplete = Boolean(
    review?.branchProgress.attendedAt &&
    review.branchProgress.deposit &&
    review.branchProgress.contract?.status === "SIGNED",
  );
  const returnOperation = review?.branchProgress.operations.find(
    (operation) => operation.type === "RETURN",
  );

  function selectFilter(value: "ALL" | QueueStatus) {
    setFilter(value);
    const url = new URL(window.location.href);
    if (value === "ALL") url.searchParams.delete("filter");
    else url.searchParams.set("filter", value);
    url.searchParams.delete("attention");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function openReview(id: string) {
    setSelectedId(id);
    setReview(null);
    setDecisionNote("");
    setDecisionResult(null);
    setReviewLoading(true);
    setActionError(null);
    setOfferCreatedExpires(null);
    setBranchFeedback(null);
    setCustomerAttended(false);
    setContractFile(null);
    setContractAccessReason("");
    setContractUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setReceiptNumber("");
    setBranchNote("");
    setOperationNote("");
    setOdometerKm("");
    setFuelLevelPercent("");
    setOperationFeedback(false);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(id)}?locale=${locale}`,
        {
          credentials: "include",
        },
      );
      const payload = (await response.json()) as { data?: Review };
      if (!response.ok || !payload.data) throw new Error("review unavailable");
      setReview(payload.data);
      setOfferVehicleId(payload.data.vehicle.id);
      setOfferPickup(payload.data.pickupAt.slice(0, 10));
      setOfferReturn(payload.data.returnAt.slice(0, 10));
      setCustomerAttended(Boolean(payload.data.branchProgress.attendedAt));
      setReceiptNumber(payload.data.branchProgress.deposit?.receiptNumber ?? "");
    } catch {
      setActionError(text.unavailable);
    } finally {
      setReviewLoading(false);
    }
  }

  async function claimReview() {
    if (!review) return;
    setClaiming(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/claim?locale=${locale}`,
        { method: "POST", credentials: "include" },
      );
      const payload = (await response.json()) as { data?: Review };
      if (!response.ok || !payload.data) throw new Error("claim unavailable");
      setReview(payload.data);
      setQueue((current) =>
        current.map((item) =>
          item.id === payload.data!.id
            ? {
                ...item,
                status: payload.data!.status,
                assignedToCurrentUser: true,
              }
            : item,
        ),
      );
    } catch {
      setActionError(text.claimFailed);
    } finally {
      setClaiming(false);
    }
  }

  async function submitDecision(action: "REQUEST_INFORMATION" | "PRE_APPROVE" | "REJECT") {
    if (!review || decisionNote.trim().length < 10) {
      setActionError(text.decisionFailed);
      return;
    }
    setDecidingAction(action);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/decision`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, note: decisionNote.trim() }),
        },
      );
      const payload = (await response.json()) as { data?: DecisionResult };
      if (!response.ok || !payload.data) throw new Error("decision unavailable");
      setDecisionResult(payload.data);
      setQueue((current) =>
        payload.data!.status === "REJECTED"
          ? current.filter((item) => item.id !== payload.data!.id)
          : current.map((item) =>
              item.id === payload.data!.id
                ? {
                    ...item,
                    status: payload.data!.status as "MORE_INFORMATION_REQUIRED" | "PRE_APPROVED",
                  }
                : item,
            ),
      );
      if (payload.data.status !== "REJECTED") {
        setReview((current) =>
          current
            ? {
                ...current,
                status: payload.data!.status as "MORE_INFORMATION_REQUIRED" | "PRE_APPROVED",
              }
            : current,
        );
      }
    } catch {
      setActionError(text.decisionFailed);
    } finally {
      setDecidingAction(null);
    }
  }

  async function submitAlternativeOffer() {
    if (
      !review ||
      !offerVehicleId ||
      !offerPickup ||
      !offerReturn ||
      offerNote.trim().length < 10
    ) {
      setActionError(text.alternativeFailed);
      return;
    }
    setOffering(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/alternative-offers`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            vehicleId: offerVehicleId,
            pickupDate: offerPickup,
            returnDate: offerReturn,
            note: offerNote.trim(),
          }),
        },
      );
      const payload = (await response.json()) as { data?: { expiresAt: string } };
      if (!response.ok || !payload.data) throw new Error("offer unavailable");
      setOfferCreatedExpires(payload.data.expiresAt);
      setReview((current) => (current ? { ...current, status: "ALTERNATIVE_OFFERED" } : current));
      setQueue((current) =>
        current.map((item) =>
          item.id === review.id ? { ...item, status: "ALTERNATIVE_OFFERED" } : item,
        ),
      );
    } catch {
      setActionError(text.alternativeFailed);
    } finally {
      setOffering(false);
    }
  }

  async function uploadSignedContract() {
    if (!review || !review.protectedUploadsEnabled || !contractFile || uploadingContract) {
      setActionError(text.contractUploadFailed);
      return;
    }
    setUploadingContract(true);
    setActionError(null);
    const form = new FormData();
    form.append("file", contractFile);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/signed-contract`,
        {
          method: "POST",
          credentials: "include",
          body: form,
        },
      );
      const payload = (await response.json()) as { data?: { signedAt: string } };
      if (!response.ok || !payload.data) throw new Error("contract unavailable");
      setReview((current) =>
        current
          ? {
              ...current,
              branchProgress: {
                ...current.branchProgress,
                contract: { status: "SIGNED", signedAt: payload.data!.signedAt },
              },
            }
          : current,
      );
      setContractFile(null);
    } catch {
      setActionError(text.contractUploadFailed);
    } finally {
      setUploadingContract(false);
    }
  }

  async function viewSignedContract() {
    if (!review || contractAccessReason.trim().length < 10) {
      setActionError(text.contractAccessFailed);
      return;
    }
    setViewingContract(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/signed-contract/access`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: contractAccessReason.trim() }),
        },
      );
      if (!response.ok) throw new Error("contract unavailable");
      const nextUrl = URL.createObjectURL(await response.blob());
      setContractUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
    } catch {
      setActionError(text.contractAccessFailed);
    } finally {
      setViewingContract(false);
    }
  }

  async function recordBranchRequirements() {
    if (
      !review ||
      !customerAttended ||
      review.branchProgress.contract?.status !== "SIGNED" ||
      !review.branchProgress.expectedDepositEgp ||
      receiptNumber.trim().length < 3
    ) {
      setActionError(text.branchFailed);
      return;
    }
    setRecordingBranch(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/branch-checklist`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            customerAttended: true,
            depositAmountEgp: review.branchProgress.expectedDepositEgp,
            receiptNumber: receiptNumber.trim(),
            note: branchNote.trim() || undefined,
          }),
        },
      );
      const payload = (await response.json()) as { data?: BranchChecklistResult };
      if (!response.ok || !payload.data) throw new Error("branch checklist unavailable");
      setReview((current) =>
        current
          ? {
              ...current,
              branchProgress: {
                ...current.branchProgress,
                attendedAt: payload.data!.attendedAt,
                deposit: {
                  amountEgp: current.branchProgress.expectedDepositEgp!,
                  receiptNumber: receiptNumber.trim(),
                  recordedAt: payload.data!.depositRecordedAt,
                },
                contract: {
                  status: "SIGNED",
                  signedAt: payload.data!.contractSignedAt,
                },
              },
            }
          : current,
      );
      setBranchFeedback("RECORDED");
    } catch {
      setActionError(text.branchFailed);
    } finally {
      setRecordingBranch(false);
    }
  }

  async function confirmFinalBooking() {
    if (!review) return;
    setConfirmingBooking(true);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/confirm`,
        { method: "POST", credentials: "include" },
      );
      const payload = (await response.json()) as { data?: BookingConfirmationResult };
      if (!response.ok || !payload.data) throw new Error("confirmation unavailable");
      setReview((current) =>
        current
          ? {
              ...current,
              status: "CONFIRMED",
              branchProgress: {
                ...current.branchProgress,
                booking: payload.data!.booking,
              },
            }
          : current,
      );
      setQueue((current) =>
        current.map((item) => (item.id === review.id ? { ...item, status: "CONFIRMED" } : item)),
      );
      setBranchFeedback("CONFIRMED");
    } catch {
      setActionError(text.confirmationFailed);
    } finally {
      setConfirmingBooking(false);
    }
  }

  async function submitBookingOperation(
    action: "DELIVER" | "RETURN" | "COMPLETE" | "CANCEL" | "NO_SHOW",
  ) {
    if (!review || operationNote.trim().length < 10) {
      setActionError(text.operationFailed);
      return;
    }
    const requiresReadings = action === "DELIVER" || action === "RETURN";
    const parsedOdometer = Number(odometerKm);
    const parsedFuel = Number(fuelLevelPercent);
    if (
      requiresReadings &&
      (!Number.isInteger(parsedOdometer) ||
        parsedOdometer < 0 ||
        !Number.isInteger(parsedFuel) ||
        parsedFuel < 0 ||
        parsedFuel > 100)
    ) {
      setActionError(text.operationFailed);
      return;
    }
    setOperatingAction(action);
    setActionError(null);
    setOperationFeedback(false);
    try {
      const response = await fetch(
        `/api/reservations/sales/${encodeURIComponent(review.id)}/operations`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            ...(requiresReadings
              ? { odometerKm: parsedOdometer, fuelLevelPercent: parsedFuel }
              : {}),
            note: operationNote.trim(),
          }),
        },
      );
      const payload = (await response.json()) as { data?: BookingOperationResult };
      if (!response.ok || !payload.data) throw new Error("operation unavailable");
      const terminal = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(payload.data.status);
      setReview((current) =>
        current
          ? {
              ...current,
              status: payload.data!.status,
              branchProgress: {
                ...current.branchProgress,
                booking: current.branchProgress.booking
                  ? {
                      ...current.branchProgress.booking,
                      status: payload.data!.status,
                    }
                  : null,
                operations: requiresReadings
                  ? [
                      ...current.branchProgress.operations,
                      {
                        type: action === "DELIVER" ? "DELIVERY" : "RETURN",
                        odometerKm: parsedOdometer,
                        fuelLevelPercent: parsedFuel,
                        conditionNote: operationNote.trim(),
                        recordedAt: payload.data!.recordedAt,
                      },
                    ]
                  : current.branchProgress.operations,
              },
            }
          : current,
      );
      setQueue((current) =>
        terminal
          ? current.filter((item) => item.id !== review.id)
          : current.map((item) =>
              item.id === review.id ? { ...item, status: payload.data!.status } : item,
            ),
      );
      setOperationFeedback(true);
      setOperationNote("");
      setOdometerKm("");
      setFuelLevelPercent("");
    } catch {
      setActionError(text.operationFailed);
    } finally {
      setOperatingAction(null);
    }
  }

  return (
    <WorkspaceShell activePage="requests" kind={workspaceKind} locale={locale}>
      <div className="sales-workspace" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
        <section className="portal-overview sales-hero">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <a className="portal-primary-action" href="#requests">
            <span>{queue.length.toString().padStart(2, "0")}</span>
            {text.queue}
          </a>
        </section>

        <section className="portal-metrics" aria-label={text.queue}>
          <article>
            <span>01</span>
            <strong>{queue.length.toString().padStart(2, "0")}</strong>
            <p>{text.totalMetric}</p>
          </article>
          <article className={pendingCount ? "has-action" : ""}>
            <span>02</span>
            <strong>{pendingCount.toString().padStart(2, "0")}</strong>
            <p>{text.pendingMetric}</p>
          </article>
          <article>
            <span>03</span>
            <strong>{reviewingCount.toString().padStart(2, "0")}</strong>
            <p>{text.reviewingMetric}</p>
          </article>
          <article>
            <span>04</span>
            <strong>{customerActionCount.toString().padStart(2, "0")}</strong>
            <p>{text.actionMetric}</p>
          </article>
        </section>

        {loading ? <WorkspaceState kind="loading" title={text.loading} /> : null}
        {!loading && error ? (
          <WorkspaceState
            action={
              error === "AUTH" ? (
                <a className="sales-action" href={localizedPath(locale, "/auth")}>
                  {text.signIn}
                </a>
              ) : error === "GENERAL" ? (
                <button onClick={() => window.location.reload()} type="button">
                  {locale === "ar" ? "إعادة المحاولة" : "Try again"}
                </button>
              ) : (
                <a href={localizedPath(locale, "/")}>
                  {locale === "ar" ? "العودة للموقع" : "Return to website"}
                </a>
              )
            }
            kind={error === "FORBIDDEN" ? "no-permission" : "error"}
            title={
              error === "AUTH"
                ? text.signIn
                : error === "FORBIDDEN"
                  ? text.forbidden
                  : text.unavailable
            }
          />
        ) : null}

        {!loading && !error ? (
          <div className="sales-layout" id="requests">
            <section className="sales-queue" aria-label={text.queue}>
              <div className="sales-section-heading">
                <span>01</span>
                <h2>{text.queue}</h2>
                <b>{queue.length.toString().padStart(2, "0")}</b>
              </div>
              <div className="sales-filters" role="group" aria-label={text.queue}>
                {(
                  [
                    ["ALL", text.all],
                    ["PENDING_REVIEW", text.pending],
                    ["UNDER_REVIEW", text.reviewing],
                    ["MORE_INFORMATION_REQUIRED", text.moreInfo],
                    ["ALTERNATIVE_OFFERED", text.alternativeStatus],
                    ["PRE_APPROVED", text.preApprovedStatus],
                    ["CONFIRMED", text.confirmedStatus],
                    ["ACTIVE", text.activeStatus],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    aria-pressed={filter === value}
                    key={value}
                    onClick={() => selectFilter(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="sales-request-list">
                {filteredQueue.length ? (
                  filteredQueue.map((item) => (
                    <article
                      className={`sales-request-card${selectedId === item.id ? " is-selected" : ""}`}
                      key={item.id}
                    >
                      <div className="sales-request-card__top">
                        <span className={`sales-status sales-status--${item.status.toLowerCase()}`}>
                          {statusLabel(item.status, locale)}
                        </span>
                        <span
                          className={`sales-owner-chip ${
                            item.assignedToCurrentUser ? "is-yours" : ""
                          }`}
                        >
                          {item.assignedToCurrentUser
                            ? text.yourOwner
                            : item.status === "PENDING_REVIEW"
                              ? text.availableOwner
                              : text.teamOwner}
                        </span>
                        <small>{formatDate(item.submittedAt, locale)}</small>
                      </div>
                      <h3>{item.vehicle.name}</h3>
                      <strong>{item.reference}</strong>
                      <dl>
                        <div>
                          <dt>{text.customer}</dt>
                          <dd>{item.customer.name}</dd>
                        </div>
                        <div>
                          <dt>{text.pickup}</dt>
                          <dd>{formatDate(item.pickupAt, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.estimate}</dt>
                          <dd>{formatEgp(item.estimate.total, locale)}</dd>
                        </div>
                      </dl>
                      <button
                        className="sales-card-button"
                        onClick={() => void openReview(item.id)}
                        type="button"
                      >
                        {text.open}
                        <span aria-hidden="true">↗</span>
                      </button>
                    </article>
                  ))
                ) : (
                  <WorkspaceState
                    action={
                      filter !== "ALL" ? (
                        <button onClick={() => selectFilter("ALL")} type="button">
                          {locale === "ar" ? "عرض كل الطلبات" : "Show all requests"}
                        </button>
                      ) : null
                    }
                    kind={queue.length ? "no-results" : "empty"}
                    title={text.empty}
                  />
                )}
              </div>
            </section>

            <aside className="sales-review" aria-live="polite">
              <div className="sales-section-heading">
                <span>02</span>
                <h2>{text.protected}</h2>
              </div>
              {reviewLoading ? <div className="sales-state">{text.loading}</div> : null}
              {!reviewLoading && !review ? (
                <div className="sales-review-empty">{text.select}</div>
              ) : null}
              {review ? (
                <div className="sales-review-content">
                  <header>
                    <div className="sales-review-ownership">
                      <span className={`sales-status sales-status--${review.status.toLowerCase()}`}>
                        {statusLabel(review.status, locale)}
                      </span>
                      <span
                        className={`sales-owner-chip ${
                          review.assignedToCurrentUser ? "is-yours" : ""
                        }`}
                      >
                        {review.assignedToCurrentUser
                          ? text.yourOwner
                          : review.status === "PENDING_REVIEW"
                            ? text.availableOwner
                            : text.teamOwner}
                      </span>
                    </div>
                    <p>{review.reference}</p>
                    <h2>{review.vehicle.name}</h2>
                    <strong>{formatEgp(review.estimate.total, locale)}</strong>
                  </header>

                  <section>
                    <h3>{text.contact}</h3>
                    <dl className="sales-detail-list">
                      <div>
                        <dt>{text.customer}</dt>
                        <dd>{review.customer.name}</dd>
                      </div>
                      <div>
                        <dt>{text.email}</dt>
                        <dd>{review.customer.emailMasked}</dd>
                      </div>
                      <div>
                        <dt>{text.phone}</dt>
                        <dd>{review.customer.phoneMasked}</dd>
                      </div>
                      <div>
                        <dt>{text.nationality}</dt>
                        <dd>{review.customer.nationality ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>{text.address}</dt>
                        <dd>{review.customer.addressMasked ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>{text.emergency}</dt>
                        <dd>
                          {review.customer.emergencyContactNameMasked ?? "—"} ·{" "}
                          {review.customer.emergencyContactPhoneMasked ?? "—"}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {review.alternativeOffer ? (
                    <section className="sales-alternative-summary">
                      <h3>{text.currentAlternative}</h3>
                      <strong>{review.alternativeOffer.vehicle.name}</strong>
                      <dl className="sales-detail-list">
                        <div>
                          <dt>{text.alternativePickup}</dt>
                          <dd>{formatDate(review.alternativeOffer.proposedPickupAt, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.alternativeReturn}</dt>
                          <dd>{formatDate(review.alternativeOffer.proposedReturnAt, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.estimate}</dt>
                          <dd>{formatEgp(review.alternativeOffer.estimate.total, locale)}</dd>
                        </div>
                        <div>
                          <dt>{text.offerExpires}</dt>
                          <dd>{formatDate(review.alternativeOffer.expiresAt, locale)}</dd>
                        </div>
                      </dl>
                    </section>
                  ) : null}

                  <section>
                    <h3>{text.verification}</h3>
                    <div className="sales-verification-grid">
                      <span>
                        {text.email}
                        <b>{review.verification.email ? text.verified : text.notVerified}</b>
                      </span>
                      <span>
                        {text.consent}
                        <b>{review.consents.policyVersion ?? "—"}</b>
                      </span>
                      <span>
                        {text.nationalityDeclaration}
                        <b>
                          {review.consents.nonEgyptianAcknowledged
                            ? text.declarationConfirmed
                            : text.declarationMissing}
                        </b>
                      </span>
                    </div>
                  </section>

                  {review.canReviewDocuments ? (
                    <ProtectedDocumentStudio
                      decisionsEnabled={[
                        "PENDING_REVIEW",
                        "UNDER_REVIEW",
                        "MORE_INFORMATION_REQUIRED",
                      ].includes(review.status)}
                      documents={review.documents}
                      locale={locale}
                      onReviewed={() => openReview(review.id)}
                      reservationId={review.id}
                    />
                  ) : (
                    <section>
                      <h3>{text.documents}</h3>
                      <p>{text.noDocuments}</p>
                    </section>
                  )}

                  <section>
                    <h3>{text.timeline}</h3>
                    <ol className="sales-timeline">
                      {review.timeline.map((event) => (
                        <li key={`${event.toStatus}-${event.createdAt}`}>
                          <span>{formatDate(event.createdAt, locale)}</span>
                          <strong>{event.toStatus.replaceAll("_", " ")}</strong>
                          {event.note ? <p>{event.note}</p> : null}
                        </li>
                      ))}
                    </ol>
                  </section>

                  <div className="sales-safety-note">{text.safety}</div>
                  {review.assignedToCurrentUser ? (
                    <>
                      <div className="sales-assigned">✓ {text.assigned}</div>
                      {decisionResult ? (
                        <div className="sales-decision-success" aria-live="polite">
                          <span>{text.decisionDone}</span>
                          <h3>
                            {decisionResult.status === "MORE_INFORMATION_REQUIRED"
                              ? text.moreInfoStatus
                              : decisionResult.status === "PRE_APPROVED"
                                ? text.preApprovedStatus
                                : text.rejectedStatus}
                          </h3>
                          <p>
                            {decisionResult.status === "MORE_INFORMATION_REQUIRED"
                              ? text.moreInfoDone
                              : decisionResult.status === "PRE_APPROVED"
                                ? text.preApprovedDone
                                : text.rejectedDone}
                          </p>
                          {decisionResult.expiresAt ? (
                            <small>
                              {text.expires}: {formatDate(decisionResult.expiresAt, locale)}
                            </small>
                          ) : null}
                        </div>
                      ) : review.status === "UNDER_REVIEW" ? (
                        <>
                          <section className="sales-decision-panel">
                            <h3>{text.decisionTitle}</h3>
                            <p>{text.decisionCopy}</p>
                            <label>
                              <span>{text.decisionNote}</span>
                              <textarea
                                maxLength={500}
                                minLength={10}
                                onChange={(event) => {
                                  setDecisionNote(event.target.value);
                                  setActionError(null);
                                }}
                                placeholder={text.decisionPlaceholder}
                                rows={5}
                                value={decisionNote}
                              />
                              <small>
                                {text.decisionHint} · {decisionNote.length}/500
                              </small>
                            </label>
                            <div className="sales-decision-actions">
                              <button
                                disabled={
                                  decidingAction !== null || decisionNote.trim().length < 10
                                }
                                onClick={() => void submitDecision("REQUEST_INFORMATION")}
                                type="button"
                              >
                                {decidingAction === "REQUEST_INFORMATION"
                                  ? text.deciding
                                  : text.requestInfo}
                              </button>
                              <button
                                disabled={
                                  decidingAction !== null || decisionNote.trim().length < 10
                                }
                                onClick={() => void submitDecision("PRE_APPROVE")}
                                type="button"
                              >
                                {decidingAction === "PRE_APPROVE" ? text.deciding : text.preApprove}
                              </button>
                              <button
                                className="is-danger"
                                disabled={
                                  decidingAction !== null || decisionNote.trim().length < 10
                                }
                                onClick={() => void submitDecision("REJECT")}
                                type="button"
                              >
                                {decidingAction === "REJECT" ? text.deciding : text.reject}
                              </button>
                            </div>
                          </section>
                          <section className="sales-decision-panel sales-alternative-panel">
                            <h3>{text.alternativeTitle}</h3>
                            <p>{text.alternativeCopy}</p>
                            <div className="sales-alternative-fields">
                              <label>
                                <span>{text.alternativeVehicle}</span>
                                <select
                                  value={offerVehicleId}
                                  onChange={(event) => setOfferVehicleId(event.target.value)}
                                >
                                  {fleet.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                      {vehicle.name[locale]} ·{" "}
                                      {formatEgp(vehicle.dailyRateEgp, locale)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                <span>{text.alternativePickup}</span>
                                <input
                                  type="date"
                                  value={offerPickup}
                                  onChange={(event) => setOfferPickup(event.target.value)}
                                />
                              </label>
                              <label>
                                <span>{text.alternativeReturn}</span>
                                <input
                                  type="date"
                                  value={offerReturn}
                                  onChange={(event) => setOfferReturn(event.target.value)}
                                />
                              </label>
                            </div>
                            <label>
                              <span>{text.alternativeNote}</span>
                              <textarea
                                maxLength={500}
                                minLength={10}
                                value={offerNote}
                                onChange={(event) => setOfferNote(event.target.value)}
                                placeholder={text.alternativePlaceholder}
                              />
                            </label>
                            <button
                              className="sales-action sales-action--claim"
                              disabled={offering || offerNote.trim().length < 10 || !offerVehicleId}
                              onClick={() => void submitAlternativeOffer()}
                              type="button"
                            >
                              {offering ? text.sendingAlternative : text.sendAlternative}
                              <span>→</span>
                            </button>
                          </section>
                        </>
                      ) : null}
                      {offerCreatedExpires ? (
                        <div className="sales-decision-success">
                          <h3>{text.alternativeSent}</h3>
                          <small>
                            {text.offerExpires}: {formatDate(offerCreatedExpires, locale)}
                          </small>
                        </div>
                      ) : null}
                      {["PRE_APPROVED", "CONFIRMED"].includes(review.status) ? (
                        <section className="sales-branch-panel">
                          <div className="sales-branch-panel__heading">
                            <span>03</span>
                            <div>
                              <h3>{text.branchTitle}</h3>
                              <p>{text.branchCopy}</p>
                            </div>
                          </div>
                          <ol className="sales-branch-checklist">
                            <li className={review.branchProgress.attendedAt ? "is-complete" : ""}>
                              <span>{review.branchProgress.attendedAt ? "✓" : "1"}</span>
                              <div>
                                <strong>{text.attendance}</strong>
                                <small>
                                  {review.branchProgress.attendedAt
                                    ? formatDate(review.branchProgress.attendedAt, locale)
                                    : text.attendanceConfirmed}
                                </small>
                              </div>
                            </li>
                            <li className={review.branchProgress.deposit ? "is-complete" : ""}>
                              <span>{review.branchProgress.deposit ? "✓" : "2"}</span>
                              <div>
                                <strong>{text.deposit}</strong>
                                <small>
                                  {review.branchProgress.deposit
                                    ? `${formatEgp(review.branchProgress.deposit.amountEgp, locale)} · ${review.branchProgress.deposit.receiptNumber}`
                                    : review.branchProgress.expectedDepositEgp
                                      ? formatEgp(review.branchProgress.expectedDepositEgp, locale)
                                      : "—"}
                                </small>
                              </div>
                            </li>
                            <li
                              className={
                                review.branchProgress.contract?.status === "SIGNED"
                                  ? "is-complete"
                                  : ""
                              }
                            >
                              <span>
                                {review.branchProgress.contract?.status === "SIGNED" ? "✓" : "3"}
                              </span>
                              <div>
                                <strong>{text.contract}</strong>
                                <small>
                                  {review.branchProgress.contract?.signedAt
                                    ? formatDate(review.branchProgress.contract.signedAt, locale)
                                    : text.contractConfirmed}
                                </small>
                              </div>
                            </li>
                          </ol>

                          {review.status === "PRE_APPROVED" && !branchRequirementsComplete ? (
                            <div className="sales-branch-form">
                              <label className="sales-confirmation-check">
                                <input
                                  checked={customerAttended}
                                  onChange={(event) => setCustomerAttended(event.target.checked)}
                                  type="checkbox"
                                />
                                <span>{text.attendanceConfirmed}</span>
                              </label>
                              <label>
                                <span>{text.depositAmount}</span>
                                <input
                                  readOnly
                                  type="text"
                                  value={
                                    review.branchProgress.expectedDepositEgp
                                      ? formatEgp(review.branchProgress.expectedDepositEgp, locale)
                                      : ""
                                  }
                                />
                              </label>
                              <label>
                                <span>{text.receiptNumber}</span>
                                <input
                                  maxLength={80}
                                  onChange={(event) => setReceiptNumber(event.target.value)}
                                  placeholder={text.receiptPlaceholder}
                                  type="text"
                                  value={receiptNumber}
                                />
                              </label>
                              {review.branchProgress.contract?.status !== "SIGNED" ? (
                                <div className="sales-contract-upload">
                                  <div>
                                    <strong>{text.contractUpload}</strong>
                                    <small>{text.contractUploadHint}</small>
                                    {!review.protectedUploadsEnabled ? (
                                      <small role="status">{text.contractUploadsDisabled}</small>
                                    ) : null}
                                  </div>
                                  <label>
                                    <input
                                      accept="application/pdf"
                                      disabled={
                                        !review.protectedUploadsEnabled || uploadingContract
                                      }
                                      onChange={(event) =>
                                        setContractFile(event.target.files?.[0] ?? null)
                                      }
                                      type="file"
                                    />
                                    <span>{contractFile?.name ?? text.contractChoose}</span>
                                  </label>
                                  <button
                                    disabled={
                                      !review.protectedUploadsEnabled ||
                                      !contractFile ||
                                      uploadingContract
                                    }
                                    onClick={() => void uploadSignedContract()}
                                    type="button"
                                  >
                                    {uploadingContract
                                      ? text.contractUploading
                                      : text.contractUploadAction}
                                  </button>
                                </div>
                              ) : (
                                <div className="sales-contract-upload is-complete">
                                  <div>
                                    <strong>{text.contractStored}</strong>
                                    <small>{text.contractProtected}</small>
                                  </div>
                                  <label>
                                    <input
                                      aria-label={text.contractAccessReason}
                                      maxLength={300}
                                      minLength={10}
                                      onChange={(event) =>
                                        setContractAccessReason(event.target.value)
                                      }
                                      placeholder={text.contractAccessReason}
                                      type="text"
                                      value={contractAccessReason}
                                    />
                                  </label>
                                  <button
                                    disabled={
                                      viewingContract || contractAccessReason.trim().length < 10
                                    }
                                    onClick={() => void viewSignedContract()}
                                    type="button"
                                  >
                                    {viewingContract ? text.contractOpening : text.contractOpen}
                                  </button>
                                  {contractUrl ? (
                                    <iframe
                                      className="sales-contract-preview"
                                      src={contractUrl}
                                      title={text.contractPreview}
                                    />
                                  ) : null}
                                </div>
                              )}
                              <label>
                                <span>{text.decisionNote}</span>
                                <textarea
                                  maxLength={300}
                                  onChange={(event) => setBranchNote(event.target.value)}
                                  rows={3}
                                  value={branchNote}
                                />
                              </label>
                              <button
                                className="sales-action sales-action--claim"
                                disabled={
                                  recordingBranch ||
                                  !customerAttended ||
                                  review.branchProgress.contract?.status !== "SIGNED" ||
                                  receiptNumber.trim().length < 3 ||
                                  !review.branchProgress.expectedDepositEgp
                                }
                                onClick={() => void recordBranchRequirements()}
                                type="button"
                              >
                                {recordingBranch ? text.recordingBranch : text.recordBranch}
                                <span>→</span>
                              </button>
                            </div>
                          ) : null}

                          {review.status === "PRE_APPROVED" && branchRequirementsComplete ? (
                            <div className="sales-final-confirmation">
                              <p>{text.confirmationWarning}</p>
                              <button
                                disabled={confirmingBooking}
                                onClick={() => void confirmFinalBooking()}
                                type="button"
                              >
                                {confirmingBooking ? text.confirmingBooking : text.confirmBooking}
                              </button>
                            </div>
                          ) : null}

                          {review.branchProgress.booking ? (
                            <div className="sales-booking-confirmed">
                              <span>✓</span>
                              <div>
                                <small>{text.bookingConfirmed}</small>
                                <h3>{review.branchProgress.booking.reference}</h3>
                                <p>
                                  {text.bookingReference} ·{" "}
                                  {formatDate(review.branchProgress.booking.confirmedAt, locale)}
                                </p>
                              </div>
                            </div>
                          ) : null}
                          {branchFeedback === "RECORDED" ? (
                            <p className="sales-branch-feedback">{text.branchRecorded}</p>
                          ) : null}
                          {branchFeedback === "CONFIRMED" ? (
                            <p className="sales-branch-feedback">{text.bookingConfirmed}</p>
                          ) : null}
                        </section>
                      ) : null}
                      {["CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(
                        review.status,
                      ) ? (
                        <section className="sales-operations-panel">
                          <div className="sales-branch-panel__heading">
                            <span>04</span>
                            <div>
                              <h3>{text.operationsTitle}</h3>
                              <p>{text.operationsCopy}</p>
                            </div>
                          </div>

                          {review.branchProgress.operations.length ? (
                            <div className="sales-operation-readings">
                              {review.branchProgress.operations.map((operation) => (
                                <article key={operation.type}>
                                  <span>
                                    {operation.type === "DELIVERY"
                                      ? text.deliveryReading
                                      : text.returnReading}
                                  </span>
                                  <strong>{formatDate(operation.recordedAt, locale)}</strong>
                                  <dl>
                                    <div>
                                      <dt>{text.odometer}</dt>
                                      <dd>{operation.odometerKm.toLocaleString()} km</dd>
                                    </div>
                                    <div>
                                      <dt>{text.fuelLevel}</dt>
                                      <dd>{operation.fuelLevelPercent}%</dd>
                                    </div>
                                  </dl>
                                  <p>{operation.conditionNote}</p>
                                </article>
                              ))}
                            </div>
                          ) : null}

                          {review.status === "CONFIRMED" ||
                          (review.status === "ACTIVE" && !returnOperation) ? (
                            <div className="sales-operation-form">
                              <label>
                                <span>{text.odometer}</span>
                                <input
                                  min="0"
                                  onChange={(event) => setOdometerKm(event.target.value)}
                                  step="1"
                                  type="number"
                                  value={odometerKm}
                                />
                              </label>
                              <label>
                                <span>{text.fuelLevel}</span>
                                <input
                                  max="100"
                                  min="0"
                                  onChange={(event) => setFuelLevelPercent(event.target.value)}
                                  step="1"
                                  type="number"
                                  value={fuelLevelPercent}
                                />
                              </label>
                            </div>
                          ) : null}

                          {["CONFIRMED", "ACTIVE"].includes(review.status) ? (
                            <label className="sales-operation-note">
                              <span>{text.conditionNote}</span>
                              <textarea
                                maxLength={500}
                                minLength={10}
                                onChange={(event) => setOperationNote(event.target.value)}
                                placeholder={text.operationPlaceholder}
                                rows={4}
                                value={operationNote}
                              />
                              <small>{operationNote.length}/500</small>
                            </label>
                          ) : null}

                          {review.status === "CONFIRMED" ? (
                            <div className="sales-operation-actions">
                              <button
                                disabled={
                                  operatingAction !== null ||
                                  operationNote.trim().length < 10 ||
                                  odometerKm === "" ||
                                  fuelLevelPercent === ""
                                }
                                onClick={() => void submitBookingOperation("DELIVER")}
                                type="button"
                              >
                                {operatingAction === "DELIVER"
                                  ? text.recordingOperation
                                  : text.delivery}
                              </button>
                              <button
                                className="is-secondary"
                                disabled={
                                  operatingAction !== null || operationNote.trim().length < 10
                                }
                                onClick={() => void submitBookingOperation("CANCEL")}
                                type="button"
                              >
                                {operatingAction === "CANCEL"
                                  ? text.recordingOperation
                                  : text.cancelBooking}
                              </button>
                              <button
                                className="is-danger"
                                disabled={
                                  operatingAction !== null || operationNote.trim().length < 10
                                }
                                onClick={() => void submitBookingOperation("NO_SHOW")}
                                type="button"
                              >
                                {operatingAction === "NO_SHOW"
                                  ? text.recordingOperation
                                  : text.markNoShow}
                              </button>
                            </div>
                          ) : null}

                          {review.status === "ACTIVE" && !returnOperation ? (
                            <button
                              className="sales-operation-primary"
                              disabled={
                                operatingAction !== null ||
                                operationNote.trim().length < 10 ||
                                odometerKm === "" ||
                                fuelLevelPercent === ""
                              }
                              onClick={() => void submitBookingOperation("RETURN")}
                              type="button"
                            >
                              {operatingAction === "RETURN"
                                ? text.recordingOperation
                                : text.vehicleReturn}
                            </button>
                          ) : null}

                          {review.status === "ACTIVE" && returnOperation ? (
                            <button
                              className="sales-operation-primary"
                              disabled={
                                operatingAction !== null || operationNote.trim().length < 10
                              }
                              onClick={() => void submitBookingOperation("COMPLETE")}
                              type="button"
                            >
                              {operatingAction === "COMPLETE"
                                ? text.recordingOperation
                                : text.completeRental}
                            </button>
                          ) : null}

                          {operationFeedback ? (
                            <p className="sales-branch-feedback">{text.operationDone}</p>
                          ) : null}
                        </section>
                      ) : null}
                    </>
                  ) : review.status === "PENDING_REVIEW" ? (
                    <section className="sales-claim-lock">
                      <span aria-hidden="true">R</span>
                      <div>
                        <small>{text.availableOwner}</small>
                        <h3>{text.claimNoticeTitle}</h3>
                        <p>{text.claimNoticeCopy}</p>
                      </div>
                      <button
                        className="sales-action sales-action--claim"
                        disabled={claiming}
                        onClick={() => void claimReview()}
                        type="button"
                      >
                        {claiming ? text.claiming : text.claim}
                      </button>
                    </section>
                  ) : (
                    <div className="sales-assigned">✓ {text.teamOwner}</div>
                  )}
                  {actionError ? <p className="sales-action-error">{actionError}</p> : null}
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}
