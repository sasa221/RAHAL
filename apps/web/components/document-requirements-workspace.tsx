"use client";

import type {
  AdminDocumentRequirementOverview,
  AdminDocumentRequirementRule,
  ApiSuccess,
  ReservationDocumentType,
} from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { PublicLocale } from "../lib/public-content";
import { Icon } from "./public-home";
import { WorkspaceShell } from "./workspace-shell";

const mimeOptions = ["image/jpeg", "image/png", "application/pdf"] as const;
const sizeOptions = [4, 8, 12, 16, 20] as const;
const documentTypes: ReservationDocumentType[] = [
  "NATIONAL_ID_FRONT",
  "NATIONAL_ID_BACK",
  "DRIVING_LICENSE_FRONT",
  "DRIVING_LICENSE_BACK",
  "PASSPORT",
];

const copy = {
  ar: {
    eyebrow: "الحوكمة / سياسة المستندات",
    title: "حدد المطلوب مرة واحدة. وطبّقه على كل طلب بدقة.",
    intro:
      "تحكم في مستندات العميل المصري والأجنبي، وافصل المستندات الأساسية عن متطلبات القيادة الذاتية، بدون كشف أي ملف مرفوع.",
    add: "إضافة قاعدة",
    active: "قاعدة نشطة",
    egyptian: "قواعد المصريين",
    foreign: "قواعد الأجانب",
    selfDrive: "للقيادة الذاتية",
    scenario: "اختبار السيناريو",
    scenarioIntro: "اختر نوع العميل وطريقة القيادة لترى بالضبط ما سيظهر له في خطوة رفع المستندات.",
    egyptianCustomer: "عميل مصري",
    foreignCustomer: "عميل أجنبي",
    withDriver: "بسائق من رحال",
    customerDrives: "العميل يقود",
    requiredStack: "المستندات المطلوبة في هذا السيناريو",
    documents: "قواعد المستندات",
    documentsIntro: "كل تعديل يؤثر على المسودات قبل الإرسال ويُسجل في سجل العمليات.",
    edit: "إدارة القاعدة",
    enabled: "نشطة",
    disabled: "متوقفة",
    base: "مطلوب دائمًا",
    selfOnly: "عند القيادة الذاتية",
    formats: "الصيغ",
    maxSize: "الحد الأقصى",
    order: "الترتيب",
    emptyScenario: "لا توجد قاعدة نشطة لهذا السيناريو. راجع الإعدادات قبل استقبال الطلبات.",
    loading: "جاري تجهيز سياسة المستندات...",
    unavailable: "تعذر تحميل القواعد أو أن هذا الحساب لا يملك صلاحية الإدارة.",
    editorTitle: "إعداد قاعدة المستند",
    createTitle: "قاعدة مستند جديدة",
    close: "إغلاق",
    category: "فئة العميل",
    documentType: "نوع المستند",
    condition: "وقت الطلب",
    labelAr: "الاسم الظاهر بالعربية",
    labelEn: "الاسم الظاهر بالإنجليزية",
    allowedFormats: "الصيغ المسموحة",
    maxFileSize: "أقصى حجم للملف",
    displayOrder: "ترتيب الظهور",
    ruleStatus: "حالة القاعدة",
    changeReason: "سبب التغيير",
    reasonHint: "اكتب سببًا تشغيليًا واضحًا من 10 أحرف على الأقل",
    save: "حفظ وتسجيل التغيير",
    create: "إنشاء القاعدة",
    saving: "جاري الحفظ...",
    saved: "تم تحديث سياسة المستندات وتسجيل التغيير.",
    failed: "تعذر حفظ التغيير. راجع البيانات أو تعارض القاعدة وحاول مرة أخرى.",
    identityLocked: "نوع القاعدة ثابت بعد إنشائها. يمكنك تعديل عرضها وحدودها أو إيقافها.",
    privacy:
      "هذه الشاشة تدير السياسة فقط. لا تعرض مستندات العملاء أو أسماء الملفات أو أرقام الهوية.",
    jpeg: "JPG",
    png: "PNG",
    pdf: "PDF",
    NATIONAL_ID_FRONT: "وجه بطاقة الرقم القومي",
    NATIONAL_ID_BACK: "ظهر بطاقة الرقم القومي",
    DRIVING_LICENSE_FRONT: "وجه رخصة القيادة",
    DRIVING_LICENSE_BACK: "ظهر رخصة القيادة",
    PASSPORT: "جواز السفر",
  },
  en: {
    eyebrow: "GOVERNANCE / DOCUMENT POLICY",
    title: "Define it once. Apply it to every request with precision.",
    intro:
      "Control Egyptian and foreign-customer documents, separating base identity requirements from self-drive conditions without exposing any uploaded file.",
    add: "Add rule",
    active: "Active rules",
    egyptian: "Egyptian rules",
    foreign: "Foreign rules",
    selfDrive: "Self-drive only",
    scenario: "Scenario simulator",
    scenarioIntro:
      "Choose the customer and driver scenario to see exactly what the upload step will require.",
    egyptianCustomer: "Egyptian customer",
    foreignCustomer: "Foreign customer",
    withDriver: "Rahal driver",
    customerDrives: "Customer drives",
    requiredStack: "Required document stack",
    documents: "Document rules",
    documentsIntro:
      "Every change affects pre-submission drafts and is written to the operations audit log.",
    edit: "Manage rule",
    enabled: "Active",
    disabled: "Paused",
    base: "Always required",
    selfOnly: "Self-drive condition",
    formats: "Formats",
    maxSize: "Maximum",
    order: "Order",
    emptyScenario:
      "No active rule covers this scenario. Review the policy before accepting requests.",
    loading: "Preparing the document policy...",
    unavailable: "Rules are unavailable or this account does not have administrator access.",
    editorTitle: "Document rule settings",
    createTitle: "New document rule",
    close: "Close",
    category: "Customer category",
    documentType: "Document type",
    condition: "Requirement condition",
    labelAr: "Arabic customer label",
    labelEn: "English customer label",
    allowedFormats: "Allowed formats",
    maxFileSize: "Maximum file size",
    displayOrder: "Display order",
    ruleStatus: "Rule status",
    changeReason: "Change reason",
    reasonHint: "Enter a clear operational reason of at least 10 characters",
    save: "Save and record change",
    create: "Create rule",
    saving: "Saving...",
    saved: "The document policy was updated and the change was recorded.",
    failed: "The change could not be saved. Review the fields or rule conflict and retry.",
    identityLocked:
      "The rule identity is fixed after creation. Its presentation, limits and active state remain editable.",
    privacy:
      "This workspace manages policy only. It never displays customer documents, filenames or identity numbers.",
    jpeg: "JPG",
    png: "PNG",
    pdf: "PDF",
    NATIONAL_ID_FRONT: "National ID front",
    NATIONAL_ID_BACK: "National ID back",
    DRIVING_LICENSE_FRONT: "Driving licence front",
    DRIVING_LICENSE_BACK: "Driving licence back",
    PASSPORT: "Passport",
  },
} as const;

type Category = "EGYPTIAN" | "FOREIGN";
type DriverScenario = "WITH_DRIVER" | "SELF_DRIVE";

export function DocumentRequirementsWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [overview, setOverview] = useState<AdminDocumentRequirementOverview | null>(null);
  const [state, setState] = useState<"LOADING" | "READY" | "ERROR">("LOADING");
  const [category, setCategory] = useState<Category>("EGYPTIAN");
  const [driverScenario, setDriverScenario] = useState<DriverScenario>("SELF_DRIVE");
  const [editing, setEditing] = useState<AdminDocumentRequirementRule | "NEW" | null>(null);
  const [notice, setNotice] = useState<"SAVED" | "ERROR" | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin-document-requirements", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("DOCUMENT_RULES_UNAVAILABLE");
      setOverview(((await response.json()) as ApiSuccess<AdminDocumentRequirementOverview>).data);
      setState("READY");
    } catch {
      setState("ERROR");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewRules = useMemo(
    () =>
      overview?.rules.filter(
        (rule) =>
          rule.active &&
          rule.customerCategory === category &&
          (!rule.requiresSelfDrive || driverScenario === "SELF_DRIVE"),
      ) ?? [],
    [category, driverScenario, overview],
  );
  const categoryRules = overview?.rules.filter((rule) => rule.customerCategory === category) ?? [];

  return (
    <>
      <WorkspaceShell activePage="documents" kind="admin" locale={locale}>
        <section className="document-policy">
          <header className="document-policy__hero">
            <div>
              <span>{text.eyebrow}</span>
              <h1>{text.title}</h1>
              <p>{text.intro}</p>
              <button onClick={() => setEditing("NEW")} type="button">
                <span>+</span>
                {text.add}
              </button>
            </div>
            <div className="document-policy__orbit" aria-hidden="true">
              <i />
              <i />
              <i />
              <strong>ID</strong>
              <span>PRIVATE / RULES</span>
            </div>
          </header>

          {state === "LOADING" ? (
            <div className="document-policy__state">{text.loading}</div>
          ) : null}
          {state === "ERROR" ? (
            <div className="document-policy__state is-error">{text.unavailable}</div>
          ) : null}

          {state === "READY" && overview ? (
            <>
              <section className="document-policy__metrics">
                {[
                  [overview.summary.activeRules, text.active, "01"],
                  [overview.summary.egyptianRules, text.egyptian, "02"],
                  [overview.summary.foreignRules, text.foreign, "03"],
                  [overview.summary.selfDriveRules, text.selfDrive, "04"],
                ].map(([value, label, index]) => (
                  <article key={label}>
                    <span>{index}</span>
                    <strong>{String(value).padStart(2, "0")}</strong>
                    <small>{label}</small>
                  </article>
                ))}
              </section>

              {notice ? (
                <p className={`document-policy__notice is-${notice.toLowerCase()}`}>
                  {notice === "SAVED" ? text.saved : text.failed}
                </p>
              ) : null}

              <section className="document-simulator">
                <header>
                  <div>
                    <span>LIVE LOGIC / 01</span>
                    <h2>{text.scenario}</h2>
                    <p>{text.scenarioIntro}</p>
                  </div>
                  <Icon name="document" size={30} />
                </header>
                <div className="document-simulator__controls">
                  <div role="group" aria-label={text.category}>
                    <button
                      className={category === "EGYPTIAN" ? "is-active" : ""}
                      onClick={() => setCategory("EGYPTIAN")}
                      type="button"
                    >
                      {text.egyptianCustomer}
                    </button>
                    <button
                      className={category === "FOREIGN" ? "is-active" : ""}
                      onClick={() => setCategory("FOREIGN")}
                      type="button"
                    >
                      {text.foreignCustomer}
                    </button>
                  </div>
                  <div role="group" aria-label={text.condition}>
                    <button
                      className={driverScenario === "WITH_DRIVER" ? "is-active" : ""}
                      onClick={() => setDriverScenario("WITH_DRIVER")}
                      type="button"
                    >
                      {text.withDriver}
                    </button>
                    <button
                      className={driverScenario === "SELF_DRIVE" ? "is-active" : ""}
                      onClick={() => setDriverScenario("SELF_DRIVE")}
                      type="button"
                    >
                      {text.customerDrives}
                    </button>
                  </div>
                </div>
                <div className="document-simulator__result">
                  <div>
                    <span>{text.requiredStack}</span>
                    <strong>{String(previewRules.length).padStart(2, "0")}</strong>
                  </div>
                  {previewRules.length ? (
                    <ol>
                      {previewRules.map((rule, index) => (
                        <li key={rule.id}>
                          <span>{String(index + 1).padStart(2, "0")}</span>
                          <div>
                            <strong>{locale === "ar" ? rule.labelAr : rule.labelEn}</strong>
                            <small>
                              {rule.requiresSelfDrive ? text.selfOnly : text.base}
                              {" · "}
                              {formatMimes(rule.allowedMimeTypes, text)}
                            </small>
                          </div>
                          <b>{Math.round(rule.maxSizeBytes / 1024 / 1024)} MB</b>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>{text.emptyScenario}</p>
                  )}
                </div>
              </section>

              <section className="document-rule-section">
                <header>
                  <div>
                    <span>POLICY MATRIX / 02</span>
                    <h2>{text.documents}</h2>
                    <p>{text.documentsIntro}</p>
                  </div>
                  <div className="document-rule-section__tabs">
                    <button
                      className={category === "EGYPTIAN" ? "is-active" : ""}
                      onClick={() => setCategory("EGYPTIAN")}
                      type="button"
                    >
                      EG
                    </button>
                    <button
                      className={category === "FOREIGN" ? "is-active" : ""}
                      onClick={() => setCategory("FOREIGN")}
                      type="button"
                    >
                      INT
                    </button>
                  </div>
                </header>
                <div className="document-rule-grid">
                  {categoryRules.map((rule, index) => (
                    <article className={rule.active ? "" : "is-disabled"} key={rule.id}>
                      <header>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <i className={rule.active ? "is-active" : ""} />
                        <small>{rule.active ? text.enabled : text.disabled}</small>
                      </header>
                      <div className="document-rule-card__icon">
                        <Icon name="document" size={26} />
                      </div>
                      <h3>{locale === "ar" ? rule.labelAr : rule.labelEn}</h3>
                      <p>{text[rule.documentType]}</p>
                      <dl>
                        <div>
                          <dt>{text.condition}</dt>
                          <dd>{rule.requiresSelfDrive ? text.selfOnly : text.base}</dd>
                        </div>
                        <div>
                          <dt>{text.formats}</dt>
                          <dd>{formatMimes(rule.allowedMimeTypes, text)}</dd>
                        </div>
                        <div>
                          <dt>{text.maxSize}</dt>
                          <dd>{Math.round(rule.maxSizeBytes / 1024 / 1024)} MB</dd>
                        </div>
                        <div>
                          <dt>{text.order}</dt>
                          <dd>{String(rule.sortOrder + 1).padStart(2, "0")}</dd>
                        </div>
                      </dl>
                      <button onClick={() => setEditing(rule)} type="button">
                        {text.edit}
                        <span>↗</span>
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="document-policy__privacy">
                <span>PRIVATE BY DESIGN</span>
                <p>{text.privacy}</p>
              </aside>
            </>
          ) : null}
        </section>
      </WorkspaceShell>
      {editing && typeof document !== "undefined"
        ? createPortal(
            <div dir={locale === "ar" ? "rtl" : "ltr"}>
              <RuleEditor
                existing={editing === "NEW" ? null : editing}
                initialCategory={category}
                locale={locale}
                onClose={() => setEditing(null)}
                onSaved={async () => {
                  await load();
                  setEditing(null);
                  setNotice("SAVED");
                  window.setTimeout(() => setNotice(null), 5000);
                }}
                onFailure={() => setNotice("ERROR")}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function RuleEditor({
  existing,
  initialCategory,
  locale,
  onClose,
  onFailure,
  onSaved,
}: {
  existing: AdminDocumentRequirementRule | null;
  initialCategory: Category;
  locale: PublicLocale;
  onClose: () => void;
  onFailure: () => void;
  onSaved: () => Promise<void>;
}) {
  const text = copy[locale];
  const [form, setForm] = useState(() => ({
    customerCategory: existing?.customerCategory ?? initialCategory,
    documentType:
      existing?.documentType ??
      (initialCategory === "FOREIGN"
        ? ("PASSPORT" as ReservationDocumentType)
        : ("NATIONAL_ID_FRONT" as ReservationDocumentType)),
    requiresSelfDrive: existing?.requiresSelfDrive ?? false,
    labelAr: existing?.labelAr ?? "",
    labelEn: existing?.labelEn ?? "",
    allowedMimeTypes: existing?.allowedMimeTypes ?? [...mimeOptions],
    maxSizeBytes: existing?.maxSizeBytes ?? 8 * 1024 * 1024,
    active: existing?.active ?? true,
    sortOrder: existing?.sortOrder ?? 0,
    reason: "",
  }));
  const [saving, setSaving] = useState(false);
  const set = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const valid =
    form.labelAr.trim().length >= 2 &&
    form.labelEn.trim().length >= 2 &&
    form.allowedMimeTypes.length > 0 &&
    form.reason.trim().length >= 10;

  async function submit() {
    setSaving(true);
    try {
      const { customerCategory, documentType, requiresSelfDrive, ...configuration } = form;
      const response = await fetch(
        existing
          ? `/api/admin-document-requirements/${existing.id}`
          : "/api/admin-document-requirements",
        {
          method: existing ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            existing
              ? configuration
              : { ...configuration, customerCategory, documentType, requiresSelfDrive },
          ),
        },
      );
      if (!response.ok) throw new Error("DOCUMENT_RULE_SAVE_FAILED");
      await onSaved();
    } catch {
      onFailure();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        aria-label={text.close}
        className="document-rule-editor__backdrop"
        onClick={onClose}
        type="button"
      />
      <aside className="document-rule-editor" aria-modal="true" role="dialog">
        <header>
          <div>
            <span>{existing ? "RULE / EDIT" : "RULE / NEW"}</span>
            <h2>{existing ? text.editorTitle : text.createTitle}</h2>
            <p>{existing ? text.identityLocked : text.documentsIntro}</p>
          </div>
          <button aria-label={text.close} onClick={onClose} type="button">
            ×
          </button>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="document-rule-editor__identity">
            <label>
              <span>{text.category}</span>
              <select
                disabled={Boolean(existing)}
                onChange={(event) => {
                  const nextCategory = event.target.value as Category;
                  setForm((current) => ({
                    ...current,
                    customerCategory: nextCategory,
                    documentType: nextCategory === "FOREIGN" ? "PASSPORT" : "NATIONAL_ID_FRONT",
                  }));
                }}
                value={form.customerCategory}
              >
                <option value="EGYPTIAN">{text.egyptianCustomer}</option>
                <option value="FOREIGN">{text.foreignCustomer}</option>
              </select>
            </label>
            <label>
              <span>{text.documentType}</span>
              <select
                disabled={Boolean(existing)}
                onChange={(event) =>
                  set("documentType", event.target.value as ReservationDocumentType)
                }
                value={form.documentType}
              >
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {text[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{text.condition}</span>
              <select
                disabled={Boolean(existing)}
                onChange={(event) => set("requiresSelfDrive", event.target.value === "SELF")}
                value={form.requiresSelfDrive ? "SELF" : "BASE"}
              >
                <option value="BASE">{text.base}</option>
                <option value="SELF">{text.selfOnly}</option>
              </select>
            </label>
          </div>

          <label>
            <span>{text.labelAr}</span>
            <input
              dir="rtl"
              maxLength={80}
              minLength={2}
              onChange={(event) => set("labelAr", event.target.value)}
              required
              value={form.labelAr}
            />
          </label>
          <label>
            <span>{text.labelEn}</span>
            <input
              dir="ltr"
              maxLength={80}
              minLength={2}
              onChange={(event) => set("labelEn", event.target.value)}
              required
              value={form.labelEn}
            />
          </label>

          <fieldset>
            <legend>{text.allowedFormats}</legend>
            {mimeOptions.map((mime) => (
              <label key={mime}>
                <input
                  checked={form.allowedMimeTypes.includes(mime)}
                  onChange={(event) =>
                    set(
                      "allowedMimeTypes",
                      event.target.checked
                        ? [...form.allowedMimeTypes, mime]
                        : form.allowedMimeTypes.filter((value) => value !== mime),
                    )
                  }
                  type="checkbox"
                />
                <span>{formatMime(mime, text)}</span>
              </label>
            ))}
          </fieldset>

          <div className="document-rule-editor__limits">
            <label>
              <span>{text.maxFileSize}</span>
              <select
                onChange={(event) => set("maxSizeBytes", Number(event.target.value))}
                value={form.maxSizeBytes}
              >
                {sizeOptions.map((size) => (
                  <option key={size} value={size * 1024 * 1024}>
                    {size} MB
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{text.displayOrder}</span>
              <input
                max={99}
                min={0}
                onChange={(event) => set("sortOrder", Number(event.target.value))}
                type="number"
                value={form.sortOrder}
              />
            </label>
          </div>

          <label className="document-rule-editor__toggle">
            <span>
              <strong>{text.ruleStatus}</strong>
              <small>{form.active ? text.enabled : text.disabled}</small>
            </span>
            <input
              checked={form.active}
              onChange={(event) => set("active", event.target.checked)}
              type="checkbox"
            />
            <i />
          </label>

          <label>
            <span>{text.changeReason}</span>
            <textarea
              maxLength={300}
              minLength={10}
              onChange={(event) => set("reason", event.target.value)}
              placeholder={text.reasonHint}
              required
              value={form.reason}
            />
          </label>

          <button disabled={!valid || saving} type="submit">
            {saving ? text.saving : existing ? text.save : text.create}
            <span>→</span>
          </button>
        </form>
      </aside>
    </>
  );
}

function formatMime(mime: string, text: (typeof copy)[PublicLocale]) {
  if (mime === "image/jpeg") return text.jpeg;
  if (mime === "image/png") return text.png;
  return text.pdf;
}

function formatMimes(mimes: string[], text: (typeof copy)[PublicLocale]) {
  return mimes.map((mime) => formatMime(mime, text)).join(" / ");
}
