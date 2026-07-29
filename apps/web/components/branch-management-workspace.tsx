"use client";

import type { ApiSuccess, ManagedBranch } from "@rahal/contracts";
import { useEffect, useState, type FormEvent } from "react";
import type { PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";

const copy = {
  ar: {
    eyebrow: "رحال / شبكة الفروع",
    title: "بيانات الفرع من مصدر واحد.",
    subtitle:
      "العناوين والأرقام وساعات العمل هنا تغذي التشغيل والمحتوى العام. لا تنشر بيانات تجريبية.",
    list: "الفروع",
    add: "إضافة فرع",
    edit: "تعديل الفرع",
    active: "نشط ويظهر للعملاء",
    inactive: "غير نشط",
    nameAr: "الاسم بالعربية",
    nameEn: "الاسم بالإنجليزية",
    addressAr: "العنوان بالعربية",
    addressEn: "العنوان بالإنجليزية",
    latitude: "خط العرض",
    longitude: "خط الطول",
    phones: "أرقام الهاتف — رقم في كل سطر",
    whatsapp: "أرقام واتساب — رقم في كل سطر",
    regularHours: "ساعات السبت إلى الخميس",
    fridayHours: "ساعات الجمعة",
    save: "حفظ بيانات الفرع",
    saving: "جارٍ الحفظ...",
    saved: "تم حفظ الفرع وتسجيل التعديل.",
    failed: "تعذر حفظ الفرع. راجع البيانات وصلاحية الحساب.",
    loading: "جارٍ تحميل الفروع...",
    empty: "لا توجد فروع مسجلة.",
    newBranch: "فرع جديد",
    editAction: "فتح للتعديل",
    hoursPlaceholder: "مثال: 09:00–22:00",
  },
  en: {
    eyebrow: "RAHAL / BRANCH NETWORK",
    title: "One source of truth for every branch.",
    subtitle:
      "Addresses, contacts, and hours feed operations and public content. Never publish demo details.",
    list: "Branches",
    add: "Add branch",
    edit: "Edit branch",
    active: "Active and visible to customers",
    inactive: "Inactive",
    nameAr: "Arabic name",
    nameEn: "English name",
    addressAr: "Arabic address",
    addressEn: "English address",
    latitude: "Latitude",
    longitude: "Longitude",
    phones: "Phone numbers — one per line",
    whatsapp: "WhatsApp numbers — one per line",
    regularHours: "Saturday–Thursday hours",
    fridayHours: "Friday hours",
    save: "Save branch details",
    saving: "Saving...",
    saved: "Branch saved and the change was audited.",
    failed: "The branch could not be saved. Check the data and account access.",
    loading: "Loading branches...",
    empty: "No branches are configured.",
    newBranch: "New branch",
    editAction: "Open editor",
    hoursPlaceholder: "Example: 09:00–22:00",
  },
} as const;

type BranchForm = {
  id: string | null;
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  latitude: string;
  longitude: string;
  phones: string;
  whatsapp: string;
  regularHours: string;
  fridayHours: string;
  active: boolean;
};

const emptyForm: BranchForm = {
  id: null,
  nameAr: "",
  nameEn: "",
  addressAr: "",
  addressEn: "",
  latitude: "",
  longitude: "",
  phones: "",
  whatsapp: "",
  regularHours: "",
  fridayHours: "",
  active: true,
};

export function BranchManagementWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [branches, setBranches] = useState<ManagedBranch[]>([]);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [feedback, setFeedback] = useState<"SAVED" | "FAILED" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/branches/admin", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        setBranches(((await response.json()) as ApiSuccess<ManagedBranch[]>).data);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  function edit(branch: ManagedBranch) {
    setForm({
      id: branch.id,
      nameAr: branch.nameAr,
      nameEn: branch.nameEn,
      addressAr: branch.addressAr,
      addressEn: branch.addressEn ?? "",
      latitude: branch.latitude?.toString() ?? "",
      longitude: branch.longitude?.toString() ?? "",
      phones: branch.phones.join("\n"),
      whatsapp: branch.whatsappNumbers.join("\n"),
      regularHours: String(branch.workingHours.regular ?? ""),
      fridayHours: String(branch.workingHours.friday ?? ""),
      active: branch.active,
    });
    setFeedback(null);
    document.getElementById("branch-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const splitLines = (value: string) =>
      value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const payload = {
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      addressAr: form.addressAr.trim(),
      addressEn: form.addressEn.trim(),
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      phones: splitLines(form.phones),
      whatsappNumbers: splitLines(form.whatsapp),
      workingHours: { regular: form.regularHours.trim(), friday: form.fridayHours.trim() },
      active: form.active,
    };
    try {
      const response = await fetch(
        form.id ? `/api/branches/admin/${encodeURIComponent(form.id)}` : "/api/branches/admin",
        {
          method: form.id ? "PUT" : "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error("save failed");
      const saved = ((await response.json()) as ApiSuccess<ManagedBranch>).data;
      setBranches((current) => {
        const exists = current.some((branch) => branch.id === saved.id);
        return exists
          ? current.map((branch) => (branch.id === saved.id ? saved : branch))
          : [...current, saved];
      });
      setForm(emptyForm);
      setFeedback("SAVED");
    } catch {
      setFeedback("FAILED");
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof BranchForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <WorkspaceShell activePage="branches" kind="admin" locale={locale}>
      <main className="branch-admin">
        <header className="branch-admin__hero">
          <span>{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </header>

        {loadFailed ? (
          <p className="branch-admin__access-state" role="alert">
            {text.failed}
          </p>
        ) : (
          <div className="branch-admin__layout">
            <section className="branch-admin__list">
              <header>
                <div>
                  <span>01</span>
                  <h2>{text.list}</h2>
                </div>
                <button onClick={() => setForm(emptyForm)} type="button">
                  {text.add}
                </button>
              </header>
              {loading ? (
                <p className="branch-admin__state">{text.loading}</p>
              ) : branches.length ? (
                <div className="branch-admin__cards">
                  {branches.map((branch, index) => (
                    <article className={branch.active ? "" : "is-inactive"} key={branch.id}>
                      <span>0{index + 1}</span>
                      <div>
                        <small>{branch.active ? text.active : text.inactive}</small>
                        <h3>{locale === "ar" ? branch.nameAr : branch.nameEn}</h3>
                        <p>{locale === "ar" ? branch.addressAr : branch.addressEn}</p>
                      </div>
                      <button onClick={() => edit(branch)} type="button">
                        {text.editAction}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="branch-admin__state">{text.empty}</p>
              )}
            </section>

            <form className="branch-admin__form" id="branch-editor" onSubmit={save}>
              <header>
                <span>02</span>
                <h2>{form.id ? text.edit : text.newBranch}</h2>
              </header>
              <div className="branch-admin__fields">
                <label>
                  <span>{text.nameAr}</span>
                  <input
                    dir="rtl"
                    maxLength={120}
                    minLength={2}
                    onChange={(event) => field("nameAr", event.target.value)}
                    required
                    value={form.nameAr}
                  />
                </label>
                <label>
                  <span>{text.nameEn}</span>
                  <input
                    dir="ltr"
                    maxLength={120}
                    minLength={2}
                    onChange={(event) => field("nameEn", event.target.value)}
                    required
                    value={form.nameEn}
                  />
                </label>
                <label className="is-wide">
                  <span>{text.addressAr}</span>
                  <textarea
                    dir="rtl"
                    maxLength={500}
                    minLength={5}
                    onChange={(event) => field("addressAr", event.target.value)}
                    required
                    value={form.addressAr}
                  />
                </label>
                <label className="is-wide">
                  <span>{text.addressEn}</span>
                  <textarea
                    dir="ltr"
                    maxLength={500}
                    minLength={5}
                    onChange={(event) => field("addressEn", event.target.value)}
                    required
                    value={form.addressEn}
                  />
                </label>
                <label>
                  <span>{text.latitude}</span>
                  <input
                    max="90"
                    min="-90"
                    onChange={(event) => field("latitude", event.target.value)}
                    step="0.0000001"
                    type="number"
                    value={form.latitude}
                  />
                </label>
                <label>
                  <span>{text.longitude}</span>
                  <input
                    max="180"
                    min="-180"
                    onChange={(event) => field("longitude", event.target.value)}
                    step="0.0000001"
                    type="number"
                    value={form.longitude}
                  />
                </label>
                <label>
                  <span>{text.phones}</span>
                  <textarea
                    dir="ltr"
                    onChange={(event) => field("phones", event.target.value)}
                    value={form.phones}
                  />
                </label>
                <label>
                  <span>{text.whatsapp}</span>
                  <textarea
                    dir="ltr"
                    onChange={(event) => field("whatsapp", event.target.value)}
                    value={form.whatsapp}
                  />
                </label>
                <label>
                  <span>{text.regularHours}</span>
                  <input
                    onChange={(event) => field("regularHours", event.target.value)}
                    placeholder={text.hoursPlaceholder}
                    value={form.regularHours}
                  />
                </label>
                <label>
                  <span>{text.fridayHours}</span>
                  <input
                    onChange={(event) => field("fridayHours", event.target.value)}
                    placeholder={text.hoursPlaceholder}
                    value={form.fridayHours}
                  />
                </label>
                <label className="branch-admin__active is-wide">
                  <input
                    checked={form.active}
                    onChange={(event) => field("active", event.target.checked)}
                    type="checkbox"
                  />
                  <span>{text.active}</span>
                </label>
              </div>
              <button className="branch-admin__save" disabled={saving} type="submit">
                {saving ? text.saving : text.save}
              </button>
              {feedback ? (
                <p className={`branch-admin__feedback is-${feedback.toLowerCase()}`} role="status">
                  {feedback === "SAVED" ? text.saved : text.failed}
                </p>
              ) : null}
            </form>
          </div>
        )}
      </main>
    </WorkspaceShell>
  );
}
