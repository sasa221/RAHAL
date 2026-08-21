"use client";

import type {
  ApiSuccess,
  ManagedSiteContent,
  SiteContentAdminOverview,
  SiteContentDocument,
  SiteContentKey,
  SiteContentTranslation,
} from "@rahal/contracts";
import { useEffect, useMemo, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";
import {
  createContentDocument,
  TypedContentEditor,
  TypedContentPreview,
} from "./typed-content-editors";

const sectionLabels: Record<SiteContentKey, { ar: string; en: string }> = {
  HOME_HERO: { ar: "واجهة الصفحة الرئيسية", en: "Home hero" },
  HOME_PROCESS: { ar: "خطوات الحجز", en: "Request process" },
  HOME_TRUST: { ar: "مزايا رحال", en: "Rahal standards" },
  ABOUT: { ar: "عن رحال", en: "About Rahal" },
  HOW_IT_WORKS: { ar: "طريقة الحجز", en: "How it works" },
  FAQ: { ar: "الأسئلة الشائعة", en: "FAQ" },
  CONTACT: { ar: "صفحة التواصل", en: "Contact page" },
};

const copy = {
  ar: {
    eyebrow: "رحال / استوديو المحتوى",
    title: "تحكم في صوت الموقع من مكان واحد.",
    subtitle:
      "حرّر العربي والإنجليزي كمسودة، راجع المعاينة، ثم انشر النسخة المكتملة بدون تعديل الكود.",
    sections: "أقسام الموقع",
    draft: "مسودة",
    published: "منشور",
    changes: "تعديلات غير منشورة",
    languageAr: "العربية",
    languageEn: "English",
    eyebrowField: "السطر التعريفي الصغير",
    titleField: "العنوان الرئيسي",
    introField: "المقدمة",
    statementField: "الرسالة الأساسية",
    items: "العناصر التفصيلية",
    itemTitle: "عنوان العنصر",
    itemBody: "شرح العنصر",
    addItem: "إضافة عنصر",
    remove: "حذف",
    reason: "سبب التعديل أو النشر",
    reasonHint: "مثال: تحديث رسالة الصفحة الرئيسية بعد مراجعة الإدارة",
    save: "حفظ المسودة",
    saving: "جارٍ الحفظ...",
    publish: "نشر النسخة للعامة",
    publishing: "جارٍ النشر...",
    preview: "معاينة مباشرة",
    emptyPreview: "ابدأ كتابة المحتوى لتظهر المعاينة هنا.",
    saved: "تم حفظ المسودة وتسجيل التعديل.",
    publishedDone: "تم نشر النسخة العربية والإنجليزية.",
    failed: "تعذر تنفيذ العملية. راجع الحقول والصلاحيات وحاول مرة أخرى.",
    loading: "جارٍ تحميل محتوى الموقع...",
    unavailable: "لا يمكن الوصول إلى مركز المحتوى بهذا الحساب.",
    publishGuard: "احفظ مسودة عربية وإنجليزية كاملة قبل النشر.",
    publishedAt: "آخر نشر",
    discard: "لديك تعديلات غير محفوظة. هل تريد تجاهلها؟",
    publishConfirm: "هل أنت متأكد من نشر المسودة العربية والإنجليزية للعامة الآن؟",
  },
  en: {
    eyebrow: "RAHAL / CONTENT STUDIO",
    title: "Control the public voice from one place.",
    subtitle:
      "Edit Arabic and English drafts, inspect the live preview, then publish complete copy without a code release.",
    sections: "Website sections",
    draft: "Draft",
    published: "Published",
    changes: "Unpublished changes",
    languageAr: "العربية",
    languageEn: "English",
    eyebrowField: "Eyebrow",
    titleField: "Primary title",
    introField: "Introduction",
    statementField: "Key statement",
    items: "Detail items",
    itemTitle: "Item title",
    itemBody: "Item explanation",
    addItem: "Add item",
    remove: "Remove",
    reason: "Reason for this edit or publication",
    reasonHint: "Example: Update the homepage message after management review",
    save: "Save draft",
    saving: "Saving...",
    publish: "Publish to the website",
    publishing: "Publishing...",
    preview: "Live preview",
    emptyPreview: "Start writing to see the preview here.",
    saved: "Draft saved and the change was audited.",
    publishedDone: "The Arabic and English versions are now published.",
    failed: "The action could not be completed. Check the fields and access, then try again.",
    loading: "Loading website content...",
    unavailable: "This account cannot access the content studio.",
    publishGuard: "Save a complete Arabic and English draft before publishing.",
    publishedAt: "Last published",
    discard: "You have unsaved changes. Discard them?",
    publishConfirm: "Publish the current Arabic and English drafts to the public website now?",
  },
} as const;

function emptyTranslation(locale: "ar" | "en"): SiteContentTranslation {
  return { locale, eyebrow: "", title: "", introduction: "", statement: "", items: [] };
}

export function ContentManagementWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [overview, setOverview] = useState<SiteContentAdminOverview | null>(null);
  const [selectedKey, setSelectedKey] = useState<SiteContentKey>("HOME_HERO");
  const [editorLocale, setEditorLocale] = useState<"ar" | "en">("ar");
  const [translations, setTranslations] = useState<SiteContentTranslation[]>([
    emptyTranslation("ar"),
    emptyTranslation("en"),
  ]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<"SAVE" | "PUBLISH" | null>(null);
  const [feedback, setFeedback] = useState<"SAVED" | "PUBLISHED" | "FAILED" | null>(null);
  const [dirty, setDirty] = useState(false);

  const selected = overview?.entries.find((entry) => entry.key === selectedKey);
  const activeTranslation =
    translations.find((translation) => translation.locale === editorLocale) ??
    emptyTranslation(editorLocale);
  const activeDocument =
    activeTranslation.document ??
    createContentDocument(selectedKey, editorLocale, activeTranslation);
  const complete = translations.every((translation) => Boolean(translation.document));
  const canPublish = Boolean(
    overview?.permissions.publish && selected?.schemaVersion === 2 && complete && !dirty,
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/content/admin", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        setOverview(((await response.json()) as ApiSuccess<SiteContentAdminOverview>).data);
      })
      .catch(() => setFeedback("FAILED"))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const entry = overview?.entries.find((candidate) => candidate.key === selectedKey);
    const source =
      entry?.translations.length === 2
        ? entry.translations.map(cloneTranslation)
        : [emptyTranslation("ar"), emptyTranslation("en")];
    setTranslations(
      source.map((translation) => ({
        ...translation,
        schemaVersion: 2,
        document: createContentDocument(selectedKey, translation.locale, translation),
      })),
    );
    setReason("");
    setFeedback(null);
    setDirty(false);
  }, [overview, selectedKey]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const sections = useMemo(
    () => overview?.supportedKeys ?? (Object.keys(sectionLabels) as SiteContentKey[]),
    [overview],
  );

  function updateTranslation(patch: Partial<SiteContentTranslation>) {
    setDirty(true);
    setTranslations((current) =>
      current.map((translation) =>
        translation.locale === editorLocale ? { ...translation, ...patch } : translation,
      ),
    );
  }

  function updateDocument(document: SiteContentDocument) {
    updateTranslation({ document, schemaVersion: 2 });
  }

  function selectSection(key: SiteContentKey) {
    if (key === selectedKey) return;
    if (dirty && !window.confirm(text.discard)) return;
    setSelectedKey(key);
  }

  async function save() {
    if (!complete || reason.trim().length < 5) {
      setFeedback("FAILED");
      return;
    }
    await mutate("SAVE", `/api/content/admin/${selectedKey}`, "PUT", {
      translations,
      reason: reason.trim(),
    });
  }

  async function publish() {
    if (!canPublish || reason.trim().length < 10) {
      setFeedback("FAILED");
      return;
    }
    if (!window.confirm(text.publishConfirm)) return;
    await mutate("PUBLISH", `/api/content/admin/${selectedKey}/publish`, "POST", {
      reason: reason.trim(),
    });
  }

  async function mutate(
    action: "SAVE" | "PUBLISH",
    url: string,
    method: "PUT" | "POST",
    body: object,
  ) {
    setWorking(action);
    setFeedback(null);
    try {
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("request failed");
      const saved = ((await response.json()) as ApiSuccess<ManagedSiteContent>).data;
      setOverview((current) =>
        current
          ? {
              ...current,
              entries: current.entries.some((entry) => entry.key === saved.key)
                ? current.entries.map((entry) => (entry.key === saved.key ? saved : entry))
                : [...current.entries, saved],
            }
          : current,
      );
      setReason("");
      setDirty(false);
      setFeedback(action === "SAVE" ? "SAVED" : "PUBLISHED");
    } catch {
      setFeedback("FAILED");
    } finally {
      setWorking(null);
    }
  }

  return (
    <WorkspaceShell activePage="content" kind="admin" locale={locale}>
      <div className="content-studio">
        <header className="content-studio__hero">
          <span>{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </header>

        {loading ? (
          <p className="content-studio__state">{text.loading}</p>
        ) : !overview ? (
          <p className="content-studio__state is-error">{text.unavailable}</p>
        ) : (
          <div className="content-studio__layout">
            <aside className="content-studio__sections" aria-label={text.sections}>
              <header>
                <span>01</span>
                <h2>{text.sections}</h2>
              </header>
              {sections.map((key, index) => {
                const entry = overview.entries.find((candidate) => candidate.key === key);
                return (
                  <button
                    className={selectedKey === key ? "is-active" : ""}
                    key={key}
                    onClick={() => selectSection(key)}
                    type="button"
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{sectionLabels[key][locale]}</strong>
                    <small>
                      {entry?.hasUnpublishedChanges
                        ? text.changes
                        : entry?.status === "PUBLISHED"
                          ? text.published
                          : text.draft}
                    </small>
                  </button>
                );
              })}
            </aside>

            <section className="content-studio__editor">
              <header className="content-studio__editor-head">
                <div>
                  <span>02</span>
                  <h2>{sectionLabels[selectedKey][locale]}</h2>
                </div>
                <div className="content-studio__languages" role="tablist">
                  <button
                    aria-selected={editorLocale === "ar"}
                    className={editorLocale === "ar" ? "is-active" : ""}
                    onClick={() => setEditorLocale("ar")}
                    role="tab"
                    type="button"
                  >
                    {text.languageAr}
                  </button>
                  <button
                    aria-selected={editorLocale === "en"}
                    className={editorLocale === "en" ? "is-active" : ""}
                    onClick={() => setEditorLocale("en")}
                    role="tab"
                    type="button"
                  >
                    {text.languageEn}
                  </button>
                </div>
              </header>

              <div dir={editorLocale === "ar" ? "rtl" : "ltr"}>
                <TypedContentEditor
                  document={activeDocument}
                  locale={editorLocale}
                  onChange={updateDocument}
                />
              </div>

              <div className="content-studio__reason">
                <label>
                  <span>{text.reason}</span>
                  <textarea
                    maxLength={300}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={text.reasonHint}
                    value={reason}
                  />
                </label>
              </div>

              <div className="content-studio__actions">
                <button disabled={Boolean(working) || !complete} onClick={save} type="button">
                  {working === "SAVE" ? text.saving : text.save}
                </button>
                <button
                  className="is-publish"
                  disabled={Boolean(working) || !canPublish}
                  onClick={publish}
                  type="button"
                >
                  {working === "PUBLISH" ? text.publishing : text.publish}
                </button>
              </div>
              {!canPublish ? (
                <p className="content-studio__guard">
                  {overview.permissions.publish ? text.publishGuard : text.unavailable}
                </p>
              ) : null}
              {selected?.publishedAt ? (
                <p className="content-studio__published-at">
                  {text.publishedAt}:{" "}
                  {new Date(selected.publishedAt).toLocaleString(
                    locale === "ar" ? "ar-EG" : "en-EG",
                  )}
                </p>
              ) : null}
              {feedback ? (
                <p
                  className={`content-studio__feedback is-${feedback.toLowerCase()}`}
                  role="status"
                >
                  {feedback === "SAVED"
                    ? text.saved
                    : feedback === "PUBLISHED"
                      ? text.publishedDone
                      : text.failed}
                </p>
              ) : null}
            </section>

            <aside className="content-studio__preview" dir={editorLocale === "ar" ? "rtl" : "ltr"}>
              <span>{text.preview}</span>
              <TypedContentPreview document={activeDocument} emptyText={text.emptyPreview} />
            </aside>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

function cloneTranslation(translation: SiteContentTranslation): SiteContentTranslation {
  return structuredClone(translation);
}
