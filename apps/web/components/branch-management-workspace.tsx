"use client";

import type {
  ApiSuccess,
  BranchManagementOverview,
  BranchSocialLink,
  BranchWorkingHours,
  ManagedBranch,
} from "@rahal/contracts";
import { useEffect, useState, type FormEvent } from "react";
import type { PublicLocale } from "../lib/public-content";
import { BranchHoursEditor } from "./branch-hours-editor";
import { emptyBranchForm, type BranchEditorForm } from "./branch-editor-types";
import { BranchLocationPicker } from "./branch-location-picker";
import { WorkspaceShell } from "./workspace-shell";

const serviceOptions = [
  "BRANCH_PICKUP",
  "BRANCH_RETURN",
  "DOCUMENT_SIGNING",
  "DEPOSIT_RECORDING",
  "CUSTOMER_SUPPORT",
] as const;
const copy = {
  ar: {
    eyebrow: "رحال / شبكة الفروع",
    title: "كل فرع واضح قبل ما يظهر للعميل.",
    subtitle: "أنشئ مسودة مستقلة، اختر الموقع، نظّم المواعيد وراجع النسختين قبل التفعيل.",
    list: "الفروع",
    add: "إضافة فرع جديد",
    edit: "تعديل",
    active: "نشط",
    inactive: "معطّل",
    draft: "مسودة",
    loading: "جارٍ تحميل الفروع...",
    empty: "لا توجد فروع بعد. ابدأ بإضافة أول فرع.",
    error: "تعذر تحميل إدارة الفروع بهذا الحساب.",
    createTitle: "إنشاء فرع",
    editTitle: "تعديل الفرع",
    save: "حفظ الفرع",
    saving: "جارٍ الحفظ...",
    cancel: "إغلاق",
    delete: "حذف الفرع",
    disable: "تعطيل الفرع",
    unsaved: "لديك تعديلات غير محفوظة. هل تريد تجاهلها؟",
    saved: "تم حفظ الفرع وتسجيل التغيير.",
    failed: "تعذر تنفيذ العملية. راجع الحقول والصلاحيات.",
    reason: "سبب التعطيل أو الحذف",
    advanced: "الإحداثيات — خيارات متقدمة",
    previewAr: "معاينة العربية",
    previewEn: "English preview",
    dependencies: "مرتبط بالتشغيل",
    deleteBlocked:
      "لا يمكن حذف هذا الفرع لأنه مرتبط بسيارات أو طلبات أو حجوزات. عطّله بدلًا من ذلك.",
  },
  en: {
    eyebrow: "RAHAL / BRANCH NETWORK",
    title: "Make every branch clear before customers see it.",
    subtitle:
      "Create a separate draft, choose its location, structure hours, and inspect both languages before activation.",
    list: "Branches",
    add: "Add new branch",
    edit: "Edit",
    active: "Active",
    inactive: "Inactive",
    draft: "Draft",
    loading: "Loading branches...",
    empty: "No branches yet. Add the first branch when ready.",
    error: "Branch management is unavailable for this account.",
    createTitle: "Create branch",
    editTitle: "Edit branch",
    save: "Save branch",
    saving: "Saving...",
    cancel: "Close",
    delete: "Delete branch",
    disable: "Disable branch",
    unsaved: "You have unsaved changes. Discard them?",
    saved: "Branch saved and audited.",
    failed: "The action failed. Check the fields and permissions.",
    reason: "Reason for disabling or deletion",
    advanced: "Coordinates — advanced options",
    previewAr: "Arabic preview",
    previewEn: "English preview",
    dependencies: "Operational links",
    deleteBlocked: "This branch is linked to vehicles, requests, or bookings. Disable it instead.",
  },
} as const;

export function BranchManagementWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [overview, setOverview] = useState<BranchManagementOverview | null>(null);
  const [editor, setEditor] = useState<BranchEditorForm | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [previewLocale, setPreviewLocale] = useState<"ar" | "en">(locale);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/branches/admin", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setOverview(((await response.json()) as ApiSuccess<BranchManagementOverview>).data);
      })
      .catch(() => setFeedback(text.error))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [text.error]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const closeEditor = () => {
    if (dirty && !window.confirm(text.unsaved)) return;
    setEditor(null);
    setDirty(false);
    setFeedback(null);
    setReason("");
  };
  const change = <K extends keyof BranchEditorForm>(key: K, value: BranchEditorForm[K]) => {
    setDirty(true);
    setEditor((current) => (current ? { ...current, [key]: value } : current));
  };
  const openCreate = () => {
    if (dirty && !window.confirm(text.unsaved)) return;
    setEditor(emptyBranchForm());
    setDirty(false);
    setFeedback(null);
  };
  const openEdit = (branch: ManagedBranch) => {
    if (dirty && !window.confirm(text.unsaved)) return;
    setEditor(toForm(branch));
    setDirty(false);
    setFeedback(null);
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setWorking(true);
    setFeedback(null);
    try {
      const response = await fetch(
        editor.id ? `/api/branches/admin/${encodeURIComponent(editor.id)}` : "/api/branches/admin",
        {
          method: editor.id ? "PUT" : "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(toPayload(editor)),
        },
      );
      if (!response.ok) throw new Error(await responseMessage(response));
      const saved = ((await response.json()) as ApiSuccess<ManagedBranch>).data;
      setOverview((current) =>
        current
          ? {
              ...current,
              branches: current.branches.some((branch) => branch.id === saved.id)
                ? current.branches.map((branch) => (branch.id === saved.id ? saved : branch))
                : [...current.branches, saved],
            }
          : current,
      );
      setEditor(toForm(saved));
      setDirty(false);
      setFeedback(text.saved);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : text.failed);
    } finally {
      setWorking(false);
    }
  }

  async function action(kind: "disable" | "delete") {
    if (!editor?.id || reason.trim().length < 5) {
      setFeedback(text.failed);
      return;
    }
    setWorking(true);
    setFeedback(null);
    try {
      const response = await fetch(
        kind === "disable"
          ? `/api/branches/admin/${encodeURIComponent(editor.id)}/disable`
          : `/api/branches/admin/${encodeURIComponent(editor.id)}`,
        {
          method: kind === "disable" ? "PATCH" : "DELETE",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      if (!response.ok)
        throw new Error(
          response.status === 409 ? text.deleteBlocked : await responseMessage(response),
        );
      if (kind === "delete") {
        setOverview((current) =>
          current
            ? { ...current, branches: current.branches.filter((branch) => branch.id !== editor.id) }
            : current,
        );
        setEditor(null);
      } else {
        const saved = ((await response.json()) as ApiSuccess<ManagedBranch>).data;
        setOverview((current) =>
          current
            ? {
                ...current,
                branches: current.branches.map((branch) =>
                  branch.id === saved.id ? saved : branch,
                ),
              }
            : current,
        );
        setEditor(toForm(saved));
      }
      setDirty(false);
      setReason("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : text.failed);
    } finally {
      setWorking(false);
    }
  }

  return (
    <WorkspaceShell activePage="branches" kind="admin" locale={locale}>
      <div className="branch-admin branch-admin--v2">
        <header className="branch-admin__hero">
          <span>{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </header>
        {loading ? (
          <p className="branch-admin__access-state">{text.loading}</p>
        ) : !overview ? (
          <p className="branch-admin__access-state" role="alert">
            {feedback || text.error}
          </p>
        ) : (
          <section className="branch-command">
            <header>
              <div>
                <span>01</span>
                <h2>{text.list}</h2>
              </div>
              {overview.permissions.create ? (
                <button onClick={openCreate} type="button">
                  + {text.add}
                </button>
              ) : null}
            </header>
            {overview.branches.length ? (
              <div className="branch-command__grid">
                {overview.branches.map((branch, index) => (
                  <article
                    key={branch.id}
                    className={`is-${branch.status?.toLowerCase() ?? "active"}`}
                  >
                    <span>0{index + 1}</span>
                    <small>
                      {branch.status === "DRAFT"
                        ? text.draft
                        : branch.status === "INACTIVE"
                          ? text.inactive
                          : text.active}
                    </small>
                    <h3>{locale === "ar" ? branch.nameAr : branch.nameEn}</h3>
                    <p>{locale === "ar" ? branch.addressAr : branch.addressEn}</p>
                    <div>
                      <strong>{branch.dependencyCounts.vehicles}</strong>
                      <span>{text.dependencies}</span>
                    </div>
                    {overview.permissions.edit ? (
                      <button onClick={() => openEdit(branch)} type="button">
                        {text.edit}
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="branch-admin__state">{text.empty}</p>
            )}
          </section>
        )}

        {editor && overview ? (
          <div
            className="branch-editor-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeEditor();
            }}
          >
            <section
              aria-modal="true"
              className="branch-editor"
              role="dialog"
              aria-label={editor.id ? text.editTitle : text.createTitle}
            >
              <header className="branch-editor__head">
                <div>
                  <span>02</span>
                  <h2>{editor.id ? text.editTitle : text.createTitle}</h2>
                </div>
                <button onClick={closeEditor} type="button" aria-label={text.cancel}>
                  ×
                </button>
              </header>
              <form onSubmit={save}>
                <div className="branch-editor__body">
                  <div className="branch-editor__form">
                    <EditorSection title={locale === "ar" ? "هوية الفرع" : "Branch identity"}>
                      <Field
                        label="الاسم بالعربية"
                        value={editor.nameAr}
                        onChange={(value) => change("nameAr", value)}
                        dir="rtl"
                      />
                      <Field
                        label="English name"
                        value={editor.nameEn}
                        onChange={(value) => change("nameEn", value)}
                        dir="ltr"
                      />
                    </EditorSection>
                    <EditorSection
                      title={locale === "ar" ? "العنوان المنظم" : "Structured address"}
                    >
                      <Field
                        label="المحافظة"
                        value={editor.governorateAr}
                        onChange={(value) => change("governorateAr", value)}
                      />
                      <Field
                        label="Governorate"
                        value={editor.governorateEn}
                        onChange={(value) => change("governorateEn", value)}
                      />
                      <Field
                        label="المنطقة"
                        value={editor.areaAr}
                        onChange={(value) => change("areaAr", value)}
                      />
                      <Field
                        label="Area"
                        value={editor.areaEn}
                        onChange={(value) => change("areaEn", value)}
                      />
                      <Field
                        label="الشارع"
                        value={editor.streetAr}
                        onChange={(value) => change("streetAr", value)}
                      />
                      <Field
                        label="Street"
                        value={editor.streetEn}
                        onChange={(value) => change("streetEn", value)}
                      />
                      <Field
                        label="علامة مميزة"
                        required={false}
                        value={editor.landmarkAr}
                        onChange={(value) => change("landmarkAr", value)}
                      />
                      <Field
                        label="Landmark"
                        required={false}
                        value={editor.landmarkEn}
                        onChange={(value) => change("landmarkEn", value)}
                      />
                      <Field
                        area
                        label="العنوان الكامل بالعربية"
                        value={editor.addressAr}
                        onChange={(value) => change("addressAr", value)}
                      />
                      <Field
                        area
                        label="Full English address"
                        value={editor.addressEn}
                        onChange={(value) => change("addressEn", value)}
                      />
                    </EditorSection>
                    <BranchLocationPicker
                      locale={locale}
                      latitude={editor.latitude}
                      longitude={editor.longitude}
                      onChange={(latitude, longitude) => {
                        setDirty(true);
                        setEditor((current) =>
                          current ? { ...current, latitude, longitude } : current,
                        );
                      }}
                    />
                    <details className="branch-editor__advanced">
                      <summary>{text.advanced}</summary>
                      <div>
                        <Field
                          label="Latitude"
                          type="number"
                          value={editor.latitude?.toString() ?? ""}
                          onChange={(value) => change("latitude", value ? Number(value) : null)}
                        />
                        <Field
                          label="Longitude"
                          type="number"
                          value={editor.longitude?.toString() ?? ""}
                          onChange={(value) => change("longitude", value ? Number(value) : null)}
                        />
                      </div>
                    </details>
                    <EditorSection title={locale === "ar" ? "التواصل" : "Contact channels"}>
                      <PhoneFields
                        locale={locale}
                        value={editor.phones}
                        onChange={(phones) => change("phones", phones)}
                      />
                      <Field
                        label={locale === "ar" ? "رقم واتساب اليدوي" : "Manual WhatsApp number"}
                        value={editor.whatsappNumber}
                        onChange={(value) => change("whatsappNumber", value)}
                        dir="ltr"
                      />
                      <Check
                        label={locale === "ar" ? "إظهار زر واتساب" : "Show WhatsApp button"}
                        checked={editor.whatsappVisible}
                        onChange={(value) => change("whatsappVisible", value)}
                      />
                      <Field
                        label="رسالة واتساب بالعربية"
                        required={false}
                        value={editor.whatsappMessageAr}
                        onChange={(value) => change("whatsappMessageAr", value)}
                      />
                      <Field
                        label="English WhatsApp opener"
                        required={false}
                        value={editor.whatsappMessageEn}
                        onChange={(value) => change("whatsappMessageEn", value)}
                      />
                      <Field
                        label={locale === "ar" ? "البريد الإلكتروني" : "Email"}
                        required={false}
                        type="email"
                        value={editor.email}
                        onChange={(value) => change("email", value)}
                      />
                      <SocialFields
                        locale={locale}
                        value={editor.socialLinks}
                        onChange={(value) => change("socialLinks", value)}
                      />
                    </EditorSection>
                    <BranchHoursEditor
                      locale={locale}
                      value={editor.workingHours}
                      onChange={(value) => change("workingHours", value)}
                    />
                    <EditorSection
                      title={locale === "ar" ? "التشغيل والنشر" : "Operations and publication"}
                    >
                      <label>
                        <span>{locale === "ar" ? "مدير الفرع" : "Branch manager"}</span>
                        <select
                          value={editor.managerId}
                          onChange={(event) => change("managerId", event.target.value)}
                        >
                          <option value="">—</option>
                          {overview.managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{locale === "ar" ? "حالة الفرع" : "Branch status"}</span>
                        <select
                          value={editor.status}
                          onChange={(event) =>
                            change("status", event.target.value as BranchEditorForm["status"])
                          }
                        >
                          <option value="DRAFT">{text.draft}</option>
                          <option value="ACTIVE">{text.active}</option>
                          <option value="INACTIVE">{text.inactive}</option>
                        </select>
                      </label>
                      <div className="branch-editor__services">
                        {serviceOptions.map((service) => (
                          <Check
                            key={service}
                            label={service.replaceAll("_", " ")}
                            checked={editor.services.includes(service)}
                            onChange={(checked) =>
                              change(
                                "services",
                                checked
                                  ? [...editor.services, service]
                                  : editor.services.filter((item) => item !== service),
                              )
                            }
                          />
                        ))}
                      </div>
                    </EditorSection>
                  </div>
                  <BranchPreview
                    form={editor}
                    locale={previewLocale}
                    onLocale={setPreviewLocale}
                    labels={{ ar: text.previewAr, en: text.previewEn }}
                  />
                </div>
                {editor.id ? (
                  <div className="branch-editor__danger">
                    <Field
                      label={text.reason}
                      required={false}
                      value={reason}
                      onChange={setReason}
                    />
                    {overview.permissions.disable && editor.status === "ACTIVE" ? (
                      <button onClick={() => void action("disable")} type="button">
                        {text.disable}
                      </button>
                    ) : null}
                    {overview.permissions.delete ? (
                      <button
                        className="is-delete"
                        onClick={() => void action("delete")}
                        type="button"
                      >
                        {text.delete}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {feedback ? (
                  <p className="branch-admin__feedback" role="status">
                    {feedback}
                  </p>
                ) : null}
                <footer>
                  <button onClick={closeEditor} type="button">
                    {text.cancel}
                  </button>
                  <button
                    disabled={
                      working ||
                      (!editor.id && !overview.permissions.create) ||
                      (Boolean(editor.id) && !overview.permissions.edit)
                    }
                    type="submit"
                  >
                    {working ? text.saving : text.save}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="branch-editor__section">
      <legend>{title}</legend>
      <div>{children}</div>
    </fieldset>
  );
}
function Field({
  label,
  value,
  onChange,
  area = false,
  dir,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  area?: boolean;
  dir?: "rtl" | "ltr";
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      {area ? (
        <textarea
          dir={dir}
          minLength={2}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          value={value}
        />
      ) : (
        <input
          dir={dir}
          onChange={(event) => onChange(event.target.value)}
          required={required && type !== "number"}
          type={type}
          value={value}
        />
      )}
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label className="branch-editor__check">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
function PhoneFields({
  locale,
  value,
  onChange,
}: {
  locale: PublicLocale;
  value: string[];
  onChange(value: string[]): void;
}) {
  return (
    <div className="branch-editor__repeat">
      <header>
        <strong>{locale === "ar" ? "أرقام الهاتف" : "Phone numbers"}</strong>
        <button onClick={() => onChange([...value, ""])} type="button">
          +
        </button>
      </header>
      {value.map((phone, index) => (
        <div key={index}>
          <input
            aria-label={`${locale === "ar" ? "رقم هاتف" : "Phone"} ${index + 1}`}
            dir="ltr"
            onChange={(event) =>
              onChange(
                value.map((item, current) => (current === index ? event.target.value : item)),
              )
            }
            placeholder="+201001234567"
            pattern="^\+[1-9]\d{7,14}$"
            required
            value={phone}
          />
          <button
            disabled={value.length === 1}
            onClick={() => onChange(value.filter((_, current) => current !== index))}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
function SocialFields({
  locale,
  value,
  onChange,
}: {
  locale: PublicLocale;
  value: BranchSocialLink[];
  onChange(value: BranchSocialLink[]): void;
}) {
  return (
    <div className="branch-editor__repeat is-wide">
      <header>
        <strong>{locale === "ar" ? "روابط السوشيال" : "Social links"}</strong>
        <button
          onClick={() => onChange([...value, { id: crypto.randomUUID(), platform: "", url: "" }])}
          type="button"
        >
          +
        </button>
      </header>
      {value.map((social, index) => (
        <div key={social.id}>
          <input
            aria-label="Platform"
            onChange={(event) =>
              onChange(
                value.map((item, current) =>
                  current === index ? { ...item, platform: event.target.value } : item,
                ),
              )
            }
            placeholder="Facebook"
            value={social.platform}
          />
          <input
            aria-label="URL"
            dir="ltr"
            onChange={(event) =>
              onChange(
                value.map((item, current) =>
                  current === index ? { ...item, url: event.target.value } : item,
                ),
              )
            }
            placeholder="https://"
            value={social.url}
          />
          <button
            onClick={() => onChange(value.filter((_, current) => current !== index))}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
function BranchPreview({
  form,
  locale,
  onLocale,
  labels,
}: {
  form: BranchEditorForm;
  locale: "ar" | "en";
  onLocale(locale: "ar" | "en"): void;
  labels: { ar: string; en: string };
}) {
  const hours = form.workingHours.weekly.find((day) => !day.closed);
  return (
    <aside className="branch-editor__preview" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="branch-editor__preview-tabs">
        <button
          className={locale === "ar" ? "is-active" : ""}
          onClick={() => onLocale("ar")}
          type="button"
        >
          {labels.ar}
        </button>
        <button
          className={locale === "en" ? "is-active" : ""}
          onClick={() => onLocale("en")}
          type="button"
        >
          {labels.en}
        </button>
      </div>
      <span>RAHAL BRANCH · LIVE PREVIEW</span>
      <h2>{locale === "ar" ? form.nameAr : form.nameEn || "—"}</h2>
      <p>{locale === "ar" ? form.addressAr : form.addressEn}</p>
      <div className="branch-editor__preview-map">
        <strong>R</strong>
        {form.latitude !== null ? (
          <small>
            {form.latitude.toFixed(4)} · {form.longitude?.toFixed(4)}
          </small>
        ) : null}
      </div>
      <dl>
        <div>
          <dt>{locale === "ar" ? "الهاتف" : "Phone"}</dt>
          <dd>{form.phones[0] || "—"}</dd>
        </div>
        <div>
          <dt>{locale === "ar" ? "المواعيد" : "Hours"}</dt>
          <dd>{hours ? `${hours.opensAt}–${hours.closesAt}` : "—"}</dd>
        </div>
      </dl>
      {form.whatsappVisible && form.whatsappNumber ? (
        <span className="branch-editor__preview-wa">WhatsApp · {form.whatsappNumber}</span>
      ) : null}
    </aside>
  );
}

function toForm(branch: ManagedBranch): BranchEditorForm {
  const fallback = emptyBranchForm();
  return {
    ...fallback,
    id: branch.id,
    nameAr: branch.nameAr,
    nameEn: branch.nameEn,
    governorateAr: branch.governorateAr ?? "",
    governorateEn: branch.governorateEn ?? "",
    areaAr: branch.areaAr ?? "",
    areaEn: branch.areaEn ?? "",
    streetAr: branch.streetAr ?? "",
    streetEn: branch.streetEn ?? "",
    landmarkAr: branch.landmarkAr ?? "",
    landmarkEn: branch.landmarkEn ?? "",
    addressAr: branch.addressAr,
    addressEn: branch.addressEn ?? "",
    latitude: branch.latitude,
    longitude: branch.longitude,
    phones: branch.phones.length ? branch.phones : [""],
    whatsappNumber: branch.whatsappNumber ?? branch.whatsappNumbers[0] ?? "",
    whatsappVisible: branch.whatsappVisible ?? false,
    whatsappMessageAr: branch.whatsappMessageAr ?? "",
    whatsappMessageEn: branch.whatsappMessageEn ?? "",
    email: branch.email ?? "",
    socialLinks: branch.socialLinks ?? [],
    workingHours: readHours(branch.workingHours),
    services: branch.services ?? [],
    managerId: branch.managerId ?? "",
    status: branch.status ?? (branch.active ? "ACTIVE" : "INACTIVE"),
  };
}
function readHours(value: Record<string, unknown>): BranchWorkingHours {
  if (Array.isArray(value.weekly) && value.weekly.length === 7)
    return value as unknown as BranchWorkingHours;
  const result = emptyBranchForm().workingHours;
  const regular = String(value.regular ?? value.saturdayToThursday ?? "");
  const friday = String(value.friday ?? "");
  const match = (text: string) => text.match(/(\d{2}:\d{2}).*?(\d{2}:\d{2})/);
  const regularMatch = match(regular);
  const fridayMatch = match(friday);
  return {
    ...result,
    weekly: result.weekly.map((day) =>
      day.day === "FRIDAY"
        ? {
            ...day,
            closed: !fridayMatch,
            opensAt: fridayMatch?.[1] ?? null,
            closesAt: fridayMatch?.[2] ?? null,
          }
        : {
            ...day,
            closed: !regularMatch,
            opensAt: regularMatch?.[1] ?? "09:00",
            closesAt: regularMatch?.[2] ?? "21:00",
          },
    ),
  };
}
function toPayload(form: BranchEditorForm) {
  return {
    ...form,
    id: undefined,
    landmarkAr: form.landmarkAr || undefined,
    landmarkEn: form.landmarkEn || undefined,
    email: form.email || undefined,
    managerId: form.managerId || undefined,
    whatsappNumber: form.whatsappNumber || undefined,
    phones: form.phones.map((phone) => phone.replace(/[\s()-]/g, "")),
  };
}
async function responseMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    return Array.isArray(body.message) ? body.message.join(" ") : body.message || "Request failed";
  } catch {
    return "Request failed";
  }
}
