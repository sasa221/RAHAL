import type { Metadata } from "next";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { ExperienceMotion } from "./experience-motion";
import { PublicBranchSurface } from "./public-branch-surface";
import { Footer, Header, Icon } from "./public-home";

export type PublicInformationPageKey =
  "about" | "how-it-works" | "contact" | "faq" | "terms" | "privacy" | "cancellation";

type Chapter = {
  number: string;
  title: string;
  body: string;
  points?: string[];
};

type InformationPageContent = {
  eyebrow: string;
  title: string;
  introduction: string;
  statement: string;
  chapters: Chapter[];
  notice?: {
    title: string;
    body: string;
  };
  ctaTitle: string;
  ctaBody: string;
  ctaLabel: string;
};

const content: Record<PublicInformationPageKey, Record<PublicLocale, InformationPageContent>> = {
  about: {
    ar: {
      eyebrow: "رحال من البداية",
      title: "تأجير سيارات واضح، بمتابعة بشرية حقيقية.",
      introduction:
        "رحال منصة مصرية ثنائية اللغة تساعدك تختار السيارة المناسبة وترسل طلبك بوضوح، بينما يظل القرار النهائي مرتبطًا بالمراجعة والحضور إلى الفرع.",
      statement: "اختيار مطمئن، معلومات واضحة، وإجراءات تتم في مكان واحد.",
      chapters: [
        {
          number: "01",
          title: "الفكرة",
          body: "نجمع عرض السيارات، التوافر، الطلب، المتابعة والمستندات في تجربة واحدة بدون ادعاء أن الطلب حجز مؤكد.",
        },
        {
          number: "02",
          title: "الطريقة",
          body: "فريق المبيعات يراجع كل طلب، وقد يطلب معلومات إضافية أو يقترح سيارة أو موعدًا بديلًا قبل الموافقة المبدئية.",
        },
        {
          number: "03",
          title: "الحدود الواضحة",
          body: "لا يوجد دفع أونلاين. الاستلام والإرجاع وتسجيل العربون وتوقيع مستندات الإيجار تتم داخل فرع رحال فقط.",
        },
      ],
      ctaTitle: "ابدأ من العربية المناسبة.",
      ctaBody: "قارن الأسعار التقديرية والسياسات قبل إرسال أي طلب.",
      ctaLabel: "استعرض السيارات",
    },
    en: {
      eyebrow: "RAHAL, FROM THE START",
      title: "Clear car rental, backed by real human follow-up.",
      introduction:
        "Rahal is a bilingual Egyptian platform that helps you choose a suitable car and submit a clear request, while final confirmation remains tied to review and a branch visit.",
      statement: "A confident choice, clear information, and one branch-led process.",
      chapters: [
        {
          number: "01",
          title: "The idea",
          body: "Fleet discovery, availability, requests, follow-up, and protected documents belong in one experience without presenting a request as a confirmed booking.",
        },
        {
          number: "02",
          title: "The method",
          body: "Sales reviews every request and may ask for more information or offer another car or date before preliminary approval.",
        },
        {
          number: "03",
          title: "Clear boundaries",
          body: "There is no online payment. Pickup, return, deposit recording, and rental-document signing happen only at the Rahal branch.",
        },
      ],
      ctaTitle: "Start with the right car.",
      ctaBody: "Compare estimated prices and policies before sending a request.",
      ctaLabel: "Browse vehicles",
    },
  },
  "how-it-works": {
    ar: {
      eyebrow: "من الاختيار إلى الاستلام",
      title: "كل خطوة لها معنى، ولا توجد تأكيدات وهمية.",
      introduction:
        "رحلة الطلب مقسمة بوضوح بين ما يفعله العميل، وما يراجعه فريق المبيعات، وما لا يكتمل إلا داخل الفرع.",
      statement: "إرسال الطلب يبدأ المراجعة فقط؛ لا يحجز السيارة ولا يؤكد الإيجار.",
      chapters: [
        {
          number: "01",
          title: "اختار السيارة والمدة",
          body: "راجع السعر التقديري، الحد الأدنى للمدة، سياسة السائق، المسافة والوقود، ثم حدد موعد الاستلام والإرجاع.",
        },
        {
          number: "02",
          title: "أكمل حسابك والطلب",
          body: "فعّل البريد والهاتف، أكمل بياناتك، ارفع المستندات المطلوبة بصورة محمية، واقرأ الموافقات قبل الإرسال.",
        },
        {
          number: "03",
          title: "مراجعة المبيعات",
          body: "موظف واحد يستلم المراجعة ويتحقق من البيانات والمستندات والتوافر، ثم يرد عليك بالقرار أو المطلوب.",
        },
        {
          number: "04",
          title: "إتمام الإجراءات في الفرع",
          body: "بعد الموافقة المبدئية تحضر إلى الفرع، ويُسجل العربون ويُوقّع العقد، ثم يعاد فحص التوافر قبل التأكيد النهائي.",
        },
      ],
      ctaTitle: "جاهز تبدأ أول خطوة؟",
      ctaBody: "اختيار السيارة لا يلزمك بالدفع ولا ينشئ حجزًا مؤكدًا.",
      ctaLabel: "اختار سيارتك",
    },
    en: {
      eyebrow: "FROM CHOICE TO PICKUP",
      title: "Every step has a purpose. Nothing is falsely confirmed.",
      introduction:
        "The request journey clearly separates customer actions, sales review, and the branch procedures required for final confirmation.",
      statement: "Submitting starts a review. It does not reserve the car or confirm the rental.",
      chapters: [
        {
          number: "01",
          title: "Choose the car and dates",
          body: "Review the estimate, minimum duration, driver policy, mileage, and fuel terms before selecting pickup and return dates.",
        },
        {
          number: "02",
          title: "Complete your account and request",
          body: "Verify email and phone, complete your details, upload required documents privately, and review every consent before submission.",
        },
        {
          number: "03",
          title: "Sales review",
          body: "One employee owns the review, checks information, documents, and availability, then responds with the decision or required follow-up.",
        },
        {
          number: "04",
          title: "Complete the branch process",
          body: "After preliminary approval, attend the branch, record the deposit, sign the contract, and pass a final availability check before confirmation.",
        },
      ],
      ctaTitle: "Ready for the first step?",
      ctaBody: "Choosing a car requires no online payment and creates no confirmed booking.",
      ctaLabel: "Choose your car",
    },
  },
  contact: {
    ar: {
      eyebrow: "تواصل مع رحال",
      title: "تواصل مباشر، ومتابعة مرتبطة بطلبك.",
      introduction:
        "يمكنك الاتصال أو بدء محادثة واتساب للاستفسارات العامة. متابعة الطلبات والقرارات الرسمية تظل موثقة داخل حسابك.",
      statement: "الاستلام والإرجاع وكل إجراءات التأكيد تتم في فرع رحال فقط.",
      chapters: [
        {
          number: "01",
          title: "الهاتف",
          body: "تظهر أرقام التواصل المعتمدة من إدارة رحال مباشرة في دليل الفرع أدناه.",
          points: [
            "للاستفسارات العامة ومتابعة مواعيد الحضور",
            "ساعات العمل النهائية تُعتمد قبل الإطلاق",
          ],
        },
        {
          number: "02",
          title: "واتساب",
          body: "تواصل عبر القناة الرسمية لرحال بدون إرسال صور بطاقات الهوية أو المستندات في المحادثة.",
          points: ["المستندات تُرفع من حسابك فقط", "لن نطلب بيانات دفع أو بطاقات بنكية"],
        },
        {
          number: "03",
          title: "الفرع",
          body: "عنوان الفرع والخريطة وساعات العمل في انتظار اعتماد المالك قبل إدخال بيانات الإنتاج.",
        },
      ],
      notice: {
        title: "خصوصيتك أولًا",
        body: "لا ترسل الرقم القومي أو جواز السفر أو رخصة القيادة عبر الهاتف أو واتساب. استخدم مساحة المستندات المحمية داخل طلبك.",
      },
      ctaTitle: "عندك طلب قائم؟",
      ctaBody: "افتح حسابك لمشاهدة آخر حالة والرسائل المرتبطة بالطلب.",
      ctaLabel: "افتح حسابك",
    },
    en: {
      eyebrow: "CONTACT RAHAL",
      title: "Direct contact, with follow-up tied to your request.",
      introduction:
        "Call or start a WhatsApp conversation for general questions. Official request status and decisions remain documented inside your account.",
      statement:
        "Pickup, return, and every confirmation procedure happen only at the Rahal branch.",
      chapters: [
        {
          number: "01",
          title: "Phone",
          body: "Approved contact numbers are published directly from Rahal's branch directory below.",
          points: [
            "General questions and branch-attendance coordination",
            "Final working hours will be approved before launch",
          ],
        },
        {
          number: "02",
          title: "WhatsApp",
          body: "Use Rahal's official channel without sending identity-card or document images in the conversation.",
          points: [
            "Documents are uploaded only through your account",
            "We never request card or online-payment details",
          ],
        },
        {
          number: "03",
          title: "Branch",
          body: "The production address, map, and working hours are waiting for owner confirmation before final data entry.",
        },
      ],
      notice: {
        title: "Privacy first",
        body: "Never send national ID, passport, or driving-licence details by phone or WhatsApp. Use the protected document area in your request.",
      },
      ctaTitle: "Already have a request?",
      ctaBody: "Open your account to see the latest status and request conversation.",
      ctaLabel: "Open your account",
    },
  },
  faq: {
    ar: {
      eyebrow: "إجابات بدون لف",
      title: "الأسئلة المهمة قبل إرسال طلبك.",
      introduction:
        "هذه الإجابات تشرح طريقة عمل المنصة. الشروط القانونية والأسعار النهائية تعتمد على النسخة المعتمدة والسيارة والفرع.",
      statement: "لو الإجابة تؤثر على طلب قائم، ارجع لحالة الطلب أو تواصل مع فريق رحال.",
      chapters: [
        {
          number: "01",
          title: "هل إرسال الطلب يؤكد الحجز؟",
          body: "لا. الطلب يدخل مراجعة المبيعات، والتأكيد النهائي يحتاج الحضور إلى الفرع والعربون والعقد وفحص التوافر مرة أخيرة.",
        },
        {
          number: "02",
          title: "هل يوجد دفع أونلاين؟",
          body: "لا. المنصة لا تجمع بيانات بطاقات ولا تنفذ دفعًا إلكترونيًا. العربون يُسجل داخل الفرع بإيصال.",
        },
        {
          number: "03",
          title: "أين الاستلام والإرجاع؟",
          body: "من فرع رحال فقط. لا يوجد استلام من المطار أو توصيل إلى عنوان خارجي ضمن الخدمة الحالية.",
        },
        {
          number: "04",
          title: "كيف تُحمى مستنداتي؟",
          body: "تُرفع داخل الطلب إلى تخزين خاص، ولا تظهر روابطها أو أرقام الهوية في الصفحات العامة أو الإشعارات.",
        },
        {
          number: "05",
          title: "ماذا يحدث لو السيارة غير متاحة؟",
          body: "يمكن للمبيعات اقتراح سيارة أو موعد بديل. قبولك للعرض يعيد الطلب للمراجعة ولا يؤكده تلقائيًا.",
        },
      ],
      ctaTitle: "لسه بتقارن؟",
      ctaBody: "صفحة كل سيارة تعرض السعر التقديري والسياسات الأساسية قبل بدء الطلب.",
      ctaLabel: "قارن السيارات",
    },
    en: {
      eyebrow: "STRAIGHT ANSWERS",
      title: "The important questions before you submit.",
      introduction:
        "These answers explain how the platform works. Final legal terms and amounts depend on the approved policy, vehicle, and branch process.",
      statement:
        "If an answer affects an active request, check its status or contact the Rahal team.",
      chapters: [
        {
          number: "01",
          title: "Does submission confirm a booking?",
          body: "No. Sales reviews the request, and final confirmation requires branch attendance, a deposit, a signed contract, and one last availability check.",
        },
        {
          number: "02",
          title: "Is online payment available?",
          body: "No. The platform collects no card details and processes no online payment. The branch records the deposit against a receipt.",
        },
        {
          number: "03",
          title: "Where do pickup and return happen?",
          body: "Only at the Rahal branch. Off-site delivery or collection is not part of the current service.",
        },
        {
          number: "04",
          title: "How are my documents protected?",
          body: "They are uploaded inside the request to private storage. Document links and full identity values never appear publicly or in notifications.",
        },
        {
          number: "05",
          title: "What if the selected car is unavailable?",
          body: "Sales may offer another car or date. Accepting an alternative returns the request to review and does not confirm it automatically.",
        },
      ],
      ctaTitle: "Still comparing?",
      ctaBody:
        "Every vehicle page explains the estimate and core policies before a request starts.",
      ctaLabel: "Compare vehicles",
    },
  },
  terms: {
    ar: {
      eyebrow: "شروط الإيجار",
      title: "قواعد واضحة قبل الموافقة، وليست نصًا قانونيًا مخفيًا.",
      introduction:
        "هذه الصفحة تعرض إطار التشغيل الحالي. النسخة القانونية الملزمة لا تُنشر للإنتاج قبل اعتماد المالك والمراجعة القانونية المصرية.",
      statement: "نسخة ما قبل الإطلاق — لا تُستخدم حاليًا كموافقة قانونية نهائية.",
      chapters: [
        {
          number: "01",
          title: "الطلب والتأكيد",
          body: "الطلب ليس حجزًا مؤكدًا. يظل خاضعًا للمراجعة والتوافر والحضور إلى الفرع وتسجيل العربون وتوقيع العقد.",
        },
        {
          number: "02",
          title: "السيارة والاستخدام",
          body: "يلتزم العميل بسياسة السائق والوقود والمسافة والمدة المسجلة للسيارة في وقت الطلب وبالحالة المثبتة عند التسليم.",
        },
        {
          number: "03",
          title: "المبالغ والعربون",
          body: "الأسعار على الموقع تقديرية بالجنيه المصري. القيمة النهائية والعربون والإيصال تُسجل داخل الفرع، ولا يوجد دفع أونلاين.",
        },
        {
          number: "04",
          title: "التسليم والإرجاع",
          body: "تتم قراءة العداد والوقود وحالة السيارة عند التسليم والإرجاع، وتُطبق السياسات المعتمدة على التأخير أو التلف أو المخالفة.",
        },
      ],
      notice: {
        title: "مطلوب قبل الإطلاق",
        body: "اعتماد الصياغة القانونية، قواعد السن والأهلية، التأخير، الأضرار، التأمين، المخالفات، والاسترداد أو الخصم من العربون.",
      },
      ctaTitle: "راجع السيارة قبل بدء الطلب.",
      ctaBody: "السياسات الخاصة بكل سيارة تظهر في صفحة التفاصيل.",
      ctaLabel: "استعرض السيارات",
    },
    en: {
      eyebrow: "RENTAL TERMS",
      title: "Clear rules before consent, never hidden legal copy.",
      introduction:
        "This page presents the current operational framework. Binding production terms will not be published before owner approval and qualified Egyptian legal review.",
      statement: "Pre-launch version — not currently used as final legal consent.",
      chapters: [
        {
          number: "01",
          title: "Request and confirmation",
          body: "A request is not a confirmed booking. It remains subject to review, availability, branch attendance, deposit recording, and a signed contract.",
        },
        {
          number: "02",
          title: "Vehicle and use",
          body: "The customer follows the driver, fuel, mileage, and duration rules recorded for the vehicle at request time and the handover condition record.",
        },
        {
          number: "03",
          title: "Amounts and deposit",
          body: "Website prices are EGP estimates. The final amount, deposit, and receipt are recorded at the branch. There is no online payment.",
        },
        {
          number: "04",
          title: "Delivery and return",
          body: "Odometer, fuel, and vehicle condition are recorded at delivery and return. Approved delay, damage, and violation policies then apply.",
        },
      ],
      notice: {
        title: "Required before launch",
        body: "Approval of eligibility, age, delay, damage, insurance, traffic-violation, and deposit settlement or refund wording.",
      },
      ctaTitle: "Review the car before requesting.",
      ctaBody: "Vehicle-specific operating policies appear on every detail page.",
      ctaLabel: "Browse vehicles",
    },
  },
  privacy: {
    ar: {
      eyebrow: "الخصوصية وحماية البيانات",
      title: "بياناتك لخدمة الطلب، وليست مادة للعرض.",
      introduction:
        "نبني رحال على تقليل البيانات، الصلاحيات المحددة، إخفاء الهوية، وتسجيل كل وصول حساس. الصياغة القانونية النهائية وسياسة الاحتفاظ تحتاجان اعتمادًا قبل الإطلاق.",
      statement: "لا نعرض المستندات أو أرقام الهوية الكاملة في الموقع العام أو الرسائل.",
      chapters: [
        {
          number: "01",
          title: "ما الذي نعالجه؟",
          body: "بيانات الحساب والتواصل، تفاصيل الطلب، بيانات الأهلية، والمستندات المطلوبة حسب نوع العميل وسياسة السيارة.",
        },
        {
          number: "02",
          title: "لماذا؟",
          body: "لإنشاء الطلب، التحقق من الأهلية، مراجعة المستندات، التواصل التشغيلي، ومنع التعارض أو إساءة الاستخدام.",
        },
        {
          number: "03",
          title: "من يصل؟",
          body: "الموظف المعيّن أو الإدارة وفق صلاحيات الخادم. كل فتح لمستند محمي يحتاج سببًا ويُسجل في سجل غير قابل للتعديل.",
        },
        {
          number: "04",
          title: "أين المستندات؟",
          body: "خارج قاعدة البيانات في تخزين خاص منفصل عن صور السيارات العامة، مع منع الروابط الدائمة والتنزيل افتراضيًا.",
        },
      ],
      notice: {
        title: "مطلوب قبل الإطلاق",
        body: "اعتماد إشعار الخصوصية، مدة الاحتفاظ والحذف، طلبات أصحاب البيانات، وموقع التخزين أو نقل البيانات عبر الحدود وفق القانون المصري.",
      },
      ctaTitle: "تحكم في حسابك.",
      ctaBody: "راجع جلساتك وتفضيلات التواصل من مساحة الأمان.",
      ctaLabel: "أمان الحساب",
    },
    en: {
      eyebrow: "PRIVACY AND DATA PROTECTION",
      title: "Your data serves the request. It is never display material.",
      introduction:
        "Rahal is designed around data minimization, explicit permissions, masking, and auditable sensitive access. Final legal wording and retention rules require approval before launch.",
      statement: "Documents and full identity values never appear publicly or in messages.",
      chapters: [
        {
          number: "01",
          title: "What do we process?",
          body: "Account and contact data, request details, eligibility information, and documents required by customer type and vehicle policy.",
        },
        {
          number: "02",
          title: "Why?",
          body: "To create requests, verify eligibility, review documents, communicate operationally, and prevent conflicts or misuse.",
        },
        {
          number: "03",
          title: "Who has access?",
          body: "The assigned employee or authorized administration through server-enforced permissions. Every protected-document view requires a reason and is logged.",
        },
        {
          number: "04",
          title: "Where are documents kept?",
          body: "Outside the database in private storage separated from public vehicle media, with permanent links and downloads disabled by default.",
        },
      ],
      notice: {
        title: "Required before launch",
        body: "Approval of the privacy notice, retention and deletion periods, data-subject request handling, and storage or cross-border transfer position under Egyptian law.",
      },
      ctaTitle: "Stay in control of your account.",
      ctaBody: "Review sessions and communication preferences in the security area.",
      ctaLabel: "Account security",
    },
  },
  cancellation: {
    ar: {
      eyebrow: "الإلغاء وعدم الحضور",
      title: "القرار مرتبط بمرحلة الطلب، وليس بزر واحد لكل الحالات.",
      introduction:
        "الإلغاء قبل التأكيد يختلف عن الإلغاء بعد تسجيل العربون أو تأكيد الحجز. السياسة المالية النهائية تحتاج اعتمادًا تشغيليًا وقانونيًا قبل الإطلاق.",
      statement: "لا توجد استردادات أونلاين لأن رحال لا يستقبل دفعًا أونلاين.",
      chapters: [
        {
          number: "01",
          title: "المسودة أو الطلب قيد المراجعة",
          body: "يمكن إنهاء المسودة قبل الإرسال. إلغاء الطلب المرسل يعتمد على حالته الحالية والسياسة المعتمدة في وقت الطلب.",
        },
        {
          number: "02",
          title: "بعد الموافقة المبدئية",
          body: "يجب التواصل مع رحال قبل انتهاء المهلة. انتهاء الموافقة المبدئية قد يغلق الطلب تلقائيًا بدون إنشاء حجز.",
        },
        {
          number: "03",
          title: "بعد تسجيل العربون والتأكيد",
          body: "أي تسوية أو خصم أو استرداد يسجل داخل الفرع ويرتبط بالإيصال والعقد والسياسة المعتمدة، وليس عبر الموقع.",
        },
        {
          number: "04",
          title: "عدم الحضور",
          body: "لا يُسجل عدم الحضور قبل موعد الاستلام. النتيجة المالية والتشغيلية تعتمد على النص النهائي المعتمد.",
        },
      ],
      notice: {
        title: "مطلوب قبل الإطلاق",
        body: "اعتماد المدد، رسوم الإلغاء، حالات استرداد العربون أو خصمه، التأخير، وعدم الحضور، ثم نشر نسخة مرقمة قابلة للتدقيق.",
      },
      ctaTitle: "تحتاج متابعة طلب؟",
      ctaBody: "حالة الطلب ورسائل المبيعات تظهر داخل حسابك.",
      ctaLabel: "متابعة الطلبات",
    },
    en: {
      eyebrow: "CANCELLATION AND NO-SHOW",
      title: "The outcome follows the request stage, not one button for every case.",
      introduction:
        "Cancellation before confirmation differs from cancellation after a deposit or confirmed booking. Final financial policy requires operational and legal approval before launch.",
      statement: "There are no online refunds because Rahal accepts no online payment.",
      chapters: [
        {
          number: "01",
          title: "Draft or request under review",
          body: "A draft can be abandoned before submission. Cancellation of a submitted request depends on its current state and the accepted policy version.",
        },
        {
          number: "02",
          title: "After preliminary approval",
          body: "Contact Rahal before the approval window expires. Expiry may close the request automatically without creating a booking.",
        },
        {
          number: "03",
          title: "After deposit and confirmation",
          body: "Any settlement, deduction, or refund is recorded at the branch against the receipt, contract, and approved policy—not through the website.",
        },
        {
          number: "04",
          title: "No-show",
          body: "No-show cannot be recorded before scheduled pickup. The financial and operational result depends on the final approved wording.",
        },
      ],
      notice: {
        title: "Required before launch",
        body: "Approval of notice periods, cancellation charges, deposit refund or deduction cases, delays, and no-show outcomes, followed by a versioned published policy.",
      },
      ctaTitle: "Need to follow a request?",
      ctaBody: "Request status and sales messages stay available inside your account.",
      ctaLabel: "Track requests",
    },
  },
};

const pageNames: Record<PublicInformationPageKey, Record<PublicLocale, string>> = {
  about: { ar: "عن رحال", en: "About Rahal" },
  "how-it-works": { ar: "طريقة الحجز", en: "How it works" },
  contact: { ar: "تواصل معنا", en: "Contact" },
  faq: { ar: "الأسئلة الشائعة", en: "FAQ" },
  terms: { ar: "شروط الإيجار", en: "Rental terms" },
  privacy: { ar: "الخصوصية", en: "Privacy" },
  cancellation: { ar: "سياسة الإلغاء", en: "Cancellation policy" },
};

function alternateHref(locale: PublicLocale, page: PublicInformationPageKey) {
  return locale === "ar" ? `/en/${page}` : `/${page}`;
}

function ctaHref(locale: PublicLocale, page: PublicInformationPageKey) {
  if (page === "contact") return localizedPath(locale, "/auth");
  if (page === "privacy") return localizedPath(locale, "/account/security");
  if (page === "cancellation") return localizedPath(locale, "/account/requests");
  return localizedPath(locale, "/cars");
}

export function publicInformationMetadata(
  page: PublicInformationPageKey,
  locale: PublicLocale,
): Metadata {
  const pageContent = content[page][locale];
  const canonicalPath = localizedPath(locale, `/${page}`);

  return {
    title: `${pageNames[page][locale]} | RAHAL`,
    description: pageContent.introduction,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "ar-EG": `/${page}`,
        "en-EG": `/en/${page}`,
      },
    },
  };
}

export function PublicInformationPage({
  locale,
  page,
}: {
  locale: PublicLocale;
  page: PublicInformationPageKey;
}) {
  const pageContent = content[page][locale];
  const isFaq = page === "faq";

  return (
    <div
      className={`public-site public-information-page public-information-page--${page}`}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale === "ar" ? "ar-EG" : "en-EG"}
    >
      <ExperienceMotion />
      <a className="skip-link" href="#main-content">
        {locale === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}
      </a>
      <Header languageHref={alternateHref(locale, page)} locale={locale} />

      <main id="main-content">
        <section className="information-hero">
          <div className="information-hero__grid" aria-hidden="true" />
          <div className="information-hero__orbit" aria-hidden="true">
            <span />
            <span />
            <strong>R</strong>
          </div>
          <div className="container information-hero__layout">
            <div data-reveal>
              <span className="eyebrow eyebrow--light">{pageContent.eyebrow}</span>
              <h1>{pageContent.title}</h1>
              <p>{pageContent.introduction}</p>
            </div>
            <aside data-reveal>
              <span>{String(pageNames[page].en).toUpperCase()}</span>
              <strong>{pageContent.statement}</strong>
              <small>RAHAL · EGYPT</small>
            </aside>
          </div>
        </section>

        <section className="information-chapters">
          <div className="container">
            <div className="information-chapters__heading" data-reveal>
              <span>{locale === "ar" ? "التفاصيل المهمة" : "THE IMPORTANT DETAILS"}</span>
              <strong>
                {locale === "ar"
                  ? "اقرأ الصورة كاملة قبل أن تبدأ."
                  : "See the complete picture before you begin."}
              </strong>
            </div>
            <div className="information-chapters__list">
              {pageContent.chapters.map((chapter) =>
                isFaq ? (
                  <details className="information-faq" data-reveal key={chapter.number}>
                    <summary>
                      <span>{chapter.number}</span>
                      <strong>{chapter.title}</strong>
                      <i aria-hidden="true">+</i>
                    </summary>
                    <div>
                      <p>{chapter.body}</p>
                    </div>
                  </details>
                ) : (
                  <article className="information-chapter" data-reveal key={chapter.number}>
                    <span>{chapter.number}</span>
                    <div>
                      <h2>{chapter.title}</h2>
                      <p>{chapter.body}</p>
                      {chapter.points ? (
                        <ul>
                          {chapter.points.map((point) => (
                            <li key={point}>
                              <Icon name="check" size={16} />
                              {point}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <i aria-hidden="true">↗</i>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        {page === "contact" ? (
          <div className="container">
            <PublicBranchSurface locale={locale} variant="directory" />
          </div>
        ) : null}

        {pageContent.notice ? (
          <section className="information-notice">
            <div className="container information-notice__inner" data-reveal>
              <span className="information-notice__icon">
                <Icon name="shield" size={28} />
              </span>
              <div>
                <span>{locale === "ar" ? "ملاحظة أساسية" : "ESSENTIAL NOTE"}</span>
                <h2>{pageContent.notice.title}</h2>
                <p>{pageContent.notice.body}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="information-cta">
          <div className="container information-cta__inner" data-reveal>
            <div>
              <span>{locale === "ar" ? "الخطوة التالية" : "NEXT STEP"}</span>
              <h2>{pageContent.ctaTitle}</h2>
              <p>{pageContent.ctaBody}</p>
            </div>
            <a className="button button--gold" href={ctaHref(locale, page)}>
              {pageContent.ctaLabel}
              <Icon name="arrow" />
            </a>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
