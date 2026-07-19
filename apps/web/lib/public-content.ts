export type PublicLocale = "ar" | "en";

type LocalizedText = Record<PublicLocale, string>;

export type PublicVehicle = {
  id: string;
  name: LocalizedText;
  category: LocalizedText;
  categoryKey: "economy" | "sedan" | "suv";
  image: string;
  imageAlt: LocalizedText;
  dailyRateEgp: number;
  weeklyRateEgp: number;
  minimumDays: number;
  seats: number;
  bags: number;
  year: number;
  transmission: LocalizedText;
  driverPolicy: LocalizedText;
  driverPolicyKey: "optional" | "required" | "self-drive";
  fuelPolicy: LocalizedText;
  mileagePolicy: LocalizedText;
  status: "available" | "review";
};

export const publicVehicles: PublicVehicle[] = [
  {
    id: "silver-executive",
    categoryKey: "sedan",
    name: { ar: "سيدان تنفيذية فضية", en: "Silver Executive Sedan" },
    category: { ar: "سيدان", en: "Sedan" },
    image: "/images/silver-sedan.jpg",
    imageAlt: { ar: "سيارة سيدان فضية حديثة", en: "Modern silver executive sedan" },
    dailyRateEgp: 4500,
    weeklyRateEgp: 28000,
    minimumDays: 2,
    seats: 5,
    bags: 3,
    year: 2026,
    transmission: { ar: "أوتوماتيك", en: "Automatic" },
    driverPolicy: { ar: "السائق اختياري", en: "Optional driver" },
    driverPolicyKey: "optional",
    fuelPolicy: { ar: "تُعاد بنفس مستوى الوقود", en: "Return at the same fuel level" },
    mileagePolicy: { ar: "250 كم يوميًا", en: "250 km per day" },
    status: "available",
  },
  {
    id: "graphite-suv",
    categoryKey: "suv",
    name: { ar: "دفع رباعي جرافيت", en: "Graphite Family SUV" },
    category: { ar: "دفع رباعي", en: "SUV" },
    image: "/images/black-suv.jpg",
    imageAlt: { ar: "سيارة دفع رباعي سوداء حديثة", en: "Modern graphite-black SUV" },
    dailyRateEgp: 5800,
    weeklyRateEgp: 36000,
    minimumDays: 3,
    seats: 7,
    bags: 5,
    year: 2026,
    transmission: { ar: "أوتوماتيك", en: "Automatic" },
    driverPolicy: { ar: "السائق اختياري", en: "Optional driver" },
    driverPolicyKey: "optional",
    fuelPolicy: { ar: "تُعاد بنفس مستوى الوقود", en: "Return at the same fuel level" },
    mileagePolicy: { ar: "300 كم يوميًا", en: "300 km per day" },
    status: "available",
  },
  {
    id: "white-compact",
    categoryKey: "economy",
    name: { ar: "سيدان اقتصادية بيضاء", en: "White Compact Sedan" },
    category: { ar: "اقتصادية", en: "Economy" },
    image: "/images/white-sedan.jpg",
    imageAlt: { ar: "سيارة سيدان بيضاء اقتصادية", en: "Modern white compact sedan" },
    dailyRateEgp: 1900,
    weeklyRateEgp: 11800,
    minimumDays: 2,
    seats: 5,
    bags: 2,
    year: 2025,
    transmission: { ar: "أوتوماتيك", en: "Automatic" },
    driverPolicy: { ar: "بدون سائق", en: "Self-drive only" },
    driverPolicyKey: "self-drive",
    fuelPolicy: { ar: "تُعاد بنفس مستوى الوقود", en: "Return at the same fuel level" },
    mileagePolicy: { ar: "200 كم يوميًا", en: "200 km per day" },
    status: "review",
  },
];

const shared = {
  ar: {
    htmlLang: "ar-EG",
    dir: "rtl" as const,
    languageHref: "/en",
    languageLabel: "English",
    brandTagline: "لتأجير السيارات",
    skip: "انتقل إلى المحتوى",
    navigationLabel: "التنقل الرئيسي",
    menuLabel: "فتح القائمة",
    nav: [
      ["السيارات", "#fleet"],
      ["الفئات", "#categories"],
      ["طريقة الحجز", "#process"],
      ["الفرع", "#branch"],
    ],
    signIn: "تسجيل الدخول قريبًا",
    heroEyebrow: "رحلتك تبدأ باختيار مطمئن",
    heroTitle: "العربية المناسبة، في الوقت المناسب.",
    heroCopy:
      "اختار من أسطول رحال، حدّد المدة، وابعت طلبك لفريق المبيعات للمراجعة والتأكيد في الفرع.",
    heroPrimary: "استعرض السيارات",
    heroSecondary: "اعرف طريقة الحجز",
    heroBadge: "اختيار موثوق لرحلتك",
    searchTitle: "دور على عربية متاحة",
    searchDescription: "الاستلام والإرجاع من فرع رحال فقط",
    pickup: "تاريخ الاستلام",
    return: "تاريخ الإرجاع",
    driver: "نظام السائق",
    driverAny: "أي نظام",
    driverSelf: "بدون سائق",
    driverWith: "بسائق",
    search: "تحقق من المتاح",
    dateHint: "اختر تاريخًا صالحًا",
    fleetEyebrow: "سيارات مختارة",
    fleetTitle: "أسطول يناسب كل مشوار",
    fleetCopy: "اختيارات مدروسة للراحة والمساحة وطبيعة كل مشوار.",
    viewAll: "عرض كل السيارات",
    available: "متاحة للطلب",
    review: "قيد المراجعة",
    seats: "مقاعد",
    perDay: "في اليوم",
    viewDetails: "عرض التفاصيل",
    categoryEyebrow: "اختيار أسهل",
    categoryTitle: "ابدأ بنوع العربية",
    categories: [
      ["اقتصادية", "موفرة وعملية للمشاوير اليومية", "01"],
      ["سيدان", "راحة وأناقة لاجتماعاتك وسفرك", "02"],
      ["دفع رباعي", "مساحة أكبر للعائلة والرحلات", "03"],
      ["بسائق", "اختيار مرن حسب سياسة كل سيارة", "04"],
    ],
    processEyebrow: "طلب واضح من البداية",
    processTitle: "الحجز في أربع خطوات",
    processCopy: "طلبك لا يصبح حجزًا مؤكدًا إلا بعد المراجعة وإتمام الإجراءات داخل الفرع.",
    processNotice: "إرسال الطلب لا يعني تأكيد الحجز.",
    steps: [
      ["اختار العربية والمدة", "شوف الخيارات والأسعار التقديرية وحدد المواعيد المناسبة."],
      ["ابعت طلبك", "سجّل بياناتك وأكمل المتطلبات المطلوبة بصورة آمنة."],
      ["مراجعة المبيعات", "فريق رحال يراجع التوافر والبيانات ويتواصل معك."],
      ["التأكيد في الفرع", "احضر للفرع وسجّل العربون ووقّع مستندات التأجير."],
    ],
    trustEyebrow: "ليه رحال؟",
    trustTitle: "تجربة مباشرة وواضحة",
    trustItems: [
      ["أسعار بالجنيه المصري", "كل الأسعار التقديرية معروضة بالجنيه المصري فقط."],
      ["مراجعة بشرية للطلب", "موظف المبيعات يراجع طلبك قبل أي تأكيد نهائي."],
      ["مستندات محمية", "بياناتك ومستنداتك لا تظهر للعامة ولا تدخل في بيانات العرض."],
    ],
    branchEyebrow: "فرع رحال",
    branchTitle: "كل الإجراءات في مكان واحد",
    branchCopy:
      "الاستلام والإرجاع وتسجيل العربون وتوقيع المستندات تتم داخل فرع رحال. العنوان وساعات العمل النهائية تُحدّث قبل الإطلاق.",
    branchNote: "بيانات الفرع النهائية قيد التأكيد",
    call: "اتصل بنا",
    whatsapp: "تواصل عبر واتساب",
    directions: "موقع الفرع قريبًا",
    footerCopy: "رحال لتأجير السيارات في مصر — اختيار واضح ومتابعة حقيقية.",
    quickLinks: "روابط سريعة",
    contact: "تواصل معنا",
    legal: "نسخة تجريبية — السيارات والبيانات المعروضة وهمية.",
  },
  en: {
    htmlLang: "en-EG",
    dir: "ltr" as const,
    languageHref: "/",
    languageLabel: "العربية",
    brandTagline: "Car rental",
    skip: "Skip to content",
    navigationLabel: "Main navigation",
    menuLabel: "Open menu",
    nav: [
      ["Fleet", "#fleet"],
      ["Categories", "#categories"],
      ["How it works", "#process"],
      ["Branch", "#branch"],
    ],
    signIn: "Sign in soon",
    heroEyebrow: "Your journey starts with a confident choice",
    heroTitle: "The right car, right when you need it.",
    heroCopy:
      "Choose from the Rahal fleet, set your dates, and send a request for sales review and branch confirmation.",
    heroPrimary: "Browse vehicles",
    heroSecondary: "How requests work",
    heroBadge: "A trusted choice for every journey",
    searchTitle: "Find an available car",
    searchDescription: "Pickup and return at the Rahal branch only",
    pickup: "Pickup date",
    return: "Return date",
    driver: "Driver option",
    driverAny: "Any option",
    driverSelf: "Without driver",
    driverWith: "With driver",
    search: "Check availability",
    dateHint: "Choose a valid date",
    fleetEyebrow: "Curated vehicles",
    fleetTitle: "A fleet for every journey",
    fleetCopy: "Considered choices for comfort, space, and the way you prefer to travel.",
    viewAll: "View all vehicles",
    available: "Available to request",
    review: "Under review",
    seats: "seats",
    perDay: "per day",
    viewDetails: "View details",
    categoryEyebrow: "Start simply",
    categoryTitle: "Choose by vehicle type",
    categories: [
      ["Economy", "Practical, efficient choices for everyday drives", "01"],
      ["Sedan", "Comfort and polish for business and travel", "02"],
      ["SUV", "More room for families and longer journeys", "03"],
      ["With driver", "A flexible option based on each vehicle policy", "04"],
    ],
    processEyebrow: "A clear request from the start",
    processTitle: "Reserve in four steps",
    processCopy:
      "Your request is confirmed only after review and completion of the required branch procedures.",
    processNotice: "Submitting a request does not confirm a booking.",
    steps: [
      ["Choose car and dates", "Review options and estimated prices, then choose suitable dates."],
      ["Send your request", "Enter your details and complete the required information securely."],
      ["Sales review", "The Rahal team checks availability and details, then contacts you."],
      [
        "Confirm at the branch",
        "Visit the branch, record the deposit, and sign the rental documents.",
      ],
    ],
    trustEyebrow: "Why Rahal?",
    trustTitle: "A straightforward rental experience",
    trustItems: [
      ["EGP pricing", "Every displayed estimate uses Egyptian pounds only."],
      ["Human request review", "A sales employee reviews each request before final confirmation."],
      ["Protected documents", "Your documents stay private and never appear in public fleet data."],
    ],
    branchEyebrow: "Rahal branch",
    branchTitle: "Every procedure in one place",
    branchCopy:
      "Pickup, return, deposit recording, and document signing happen at the Rahal branch. Final address and opening hours will be confirmed before launch.",
    branchNote: "Final branch details pending confirmation",
    call: "Call us",
    whatsapp: "Chat on WhatsApp",
    directions: "Branch location coming soon",
    footerCopy: "Rahal car rental in Egypt — a clear choice with real follow-up.",
    quickLinks: "Quick links",
    contact: "Contact",
    legal: "Demo version — all displayed vehicles and records are fictional.",
  },
} as const;

export function getPublicContent(locale: PublicLocale) {
  return shared[locale];
}

export function localizedPath(locale: PublicLocale, path = "/") {
  if (locale === "ar") return path;
  return path === "/" ? "/en" : `/en${path}`;
}

export function getPublicNavigation(locale: PublicLocale) {
  return [
    [locale === "ar" ? "السيارات" : "Fleet", localizedPath(locale, "/cars")],
    [locale === "ar" ? "الفئات" : "Categories", `${localizedPath(locale)}#categories`],
    [locale === "ar" ? "طريقة الحجز" : "How it works", `${localizedPath(locale)}#process`],
    [locale === "ar" ? "الفرع" : "Branch", `${localizedPath(locale)}#branch`],
  ] as const;
}

export function formatEgp(value: number, locale: PublicLocale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function dateInputValue(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}
