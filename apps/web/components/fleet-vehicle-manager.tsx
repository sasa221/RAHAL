"use client";

import type { ApiSuccess, ManagedVehicle, VehicleAdminCatalog } from "@rahal/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PublicLocale } from "../lib/public-content";
import { formatEgp } from "../lib/public-content";
import { Icon } from "./public-home";

type EditingVehicle = ManagedVehicle | "new";
type VehicleImageDraft = { url: string; altAr: string; altEn: string };
type VehicleImageUpload = ApiSuccess<{ url: string }> & {
  error?: { message?: string };
};

const presetImages = [
  "/images/black-suv.jpg",
  "/images/silver-sedan.jpg",
  "/images/white-sedan.jpg",
] as const;

const copy = {
  ar: {
    eyebrow: "سجل السيارات",
    title: "أسطولك قدامك",
    intro: "شوف كل عربية بصورتها وحالتها. الإضافة والتعديل يفتحوا فورًا في محرر مستقل وواضح.",
    add: "إضافة عربية جديدة",
    edit: "فتح وتعديل",
    loading: "بنجهز العربيات...",
    empty: "لسه مفيش عربيات مسجلة.",
    active: "منشورة",
    inactive: "غير منشورة",
    featured: "مميزة على الموقع",
    save: "حفظ ونشر العربية",
    saving: "بنحفظ العربية...",
    cancel: "إلغاء",
    created: "تمت إضافة العربية للأسطول.",
    updated: "تم تحديث بيانات العربية وصورها.",
    error: "مقدرناش نحفظ بيانات العربية.",
    close: "إغلاق محرر العربية",
    editorEyebrow: "RAHAL FLEET STUDIO",
    newTitle: "جهّز العربية الجديدة",
    editTitle: "عدّل العربية",
    editorIntro: "الصورة والبيانات الأساسية أولًا، وبعدها السعر وسياسات التشغيل.",
    photos: "صور العربية",
    photosHint: "أول صورة هي الرئيسية التي ستظهر للعملاء. أضف حتى 6 صور.",
    primary: "الصورة الرئيسية",
    imageUrl: "رابط الصورة",
    imageUrlHint: "اختار من جهازك، اسحب صورة، أو استخدم رابط HTTPS",
    uploadFromDevice: "اختار صور من جهازك",
    dropImages: "أو اسحب الصور هنا",
    uploadingImages: "بنرفع الصور...",
    uploadFailed: "مقدرناش نرفع الصورة. جرّب JPG أو PNG أو WebP بحجم أقصى 4 MB.",
    imageAltAr: "وصف الصورة بالعربية",
    imageAltEn: "وصف الصورة بالإنجليزية",
    addImage: "إضافة صورة أخرى",
    removeImage: "حذف الصورة",
    moveUp: "تحريك للأعلى",
    moveDown: "تحريك للأسفل",
    choosePreset: "اختيارات جاهزة للتجربة",
    photoRequired: "أضف صورة رئيسية صالحة قبل الحفظ.",
    overview: "البيانات الأساسية",
    pricing: "السعر والتشغيل",
    publishing: "النشر على الموقع",
    branch: "الفرع",
    nameAr: "الاسم بالعربية",
    nameEn: "الاسم بالإنجليزية",
    make: "الشركة",
    model: "الموديل",
    year: "سنة الصنع",
    registration: "رقم اللوحة / التسجيل",
    category: "الفئة",
    transmission: "ناقل الحركة",
    fuel: "نوع الوقود",
    seats: "المقاعد",
    doors: "الأبواب",
    daily: "السعر اليومي EGP",
    weekly: "السعر الأسبوعي EGP",
    minimum: "أقل مدة بالأيام",
    driverPolicy: "سياسة السائق",
    driverCharge: "تكلفة السائق يوميًا EGP",
    mileage: "الكيلومترات اليومية",
    deposit: "التأمين المطلوب في الفرع EGP",
    economy: "اقتصادية",
    sedan: "سيدان",
    suv: "SUV",
    automatic: "أوتوماتيك",
    manual: "يدوي",
    optional: "السائق اختياري",
    mandatory: "السائق إلزامي",
    unavailable: "قيادة ذاتية فقط",
    operational: "الحالة التشغيلية",
    advanced: "تفاصيل وسياسات إضافية",
    advancedHint: "السعر الأسبوعي والعربون وتكلفة السائق والمسافة.",
  },
  en: {
    eyebrow: "Vehicle registry",
    title: "Your fleet, at a glance",
    intro:
      "See every vehicle with its image and state. Add and edit open instantly in a focused studio.",
    add: "Add a new vehicle",
    edit: "Open and edit",
    loading: "Preparing the fleet...",
    empty: "No vehicles are registered yet.",
    active: "Published",
    inactive: "Unpublished",
    featured: "Featured on website",
    save: "Save and publish vehicle",
    saving: "Saving vehicle...",
    cancel: "Cancel",
    created: "The vehicle was added to the fleet.",
    updated: "The vehicle and its images were updated.",
    error: "The vehicle could not be saved.",
    close: "Close vehicle editor",
    editorEyebrow: "RAHAL FLEET STUDIO",
    newTitle: "Prepare the new vehicle",
    editTitle: "Edit vehicle",
    editorIntro: "Start with imagery and core details, then set pricing and operating rules.",
    photos: "Vehicle imagery",
    photosHint: "The first image is the primary customer-facing image. Add up to 6 images.",
    primary: "Primary image",
    imageUrl: "Image URL",
    imageUrlHint: "Choose from your device, drop an image, or use an HTTPS URL",
    uploadFromDevice: "Choose images from your device",
    dropImages: "or drop images here",
    uploadingImages: "Uploading images...",
    uploadFailed: "The image could not be uploaded. Use JPG, PNG, or WebP up to 4 MB.",
    imageAltAr: "Arabic image description",
    imageAltEn: "English image description",
    addImage: "Add another image",
    removeImage: "Remove image",
    moveUp: "Move up",
    moveDown: "Move down",
    choosePreset: "Quick library choices",
    photoRequired: "Add a valid primary image before saving.",
    overview: "Core details",
    pricing: "Pricing and operation",
    publishing: "Website publishing",
    branch: "Branch",
    nameAr: "Arabic name",
    nameEn: "English name",
    make: "Make",
    model: "Model",
    year: "Model year",
    registration: "Plate / registration",
    category: "Category",
    transmission: "Transmission",
    fuel: "Fuel type",
    seats: "Seats",
    doors: "Doors",
    daily: "Daily rate EGP",
    weekly: "Weekly rate EGP",
    minimum: "Minimum rental days",
    driverPolicy: "Driver policy",
    driverCharge: "Daily driver charge EGP",
    mileage: "Daily mileage allowance",
    deposit: "Branch deposit EGP",
    economy: "Economy",
    sedan: "Sedan",
    suv: "SUV",
    automatic: "Automatic",
    manual: "Manual",
    optional: "Driver optional",
    mandatory: "Driver mandatory",
    unavailable: "Self-drive only",
    operational: "Operational status",
    advanced: "Additional details and policies",
    advancedHint: "Weekly pricing, deposit, driver charge and mileage.",
  },
} as const;

export function FleetVehicleManager({
  locale,
  onChanged,
}: {
  locale: PublicLocale;
  onChanged: () => Promise<void>;
}) {
  const text = copy[locale];
  const [catalog, setCatalog] = useState<VehicleAdminCatalog | null>(null);
  const [editing, setEditing] = useState<EditingVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const handledDeepLink = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/vehicles/admin/catalog", { credentials: "include" });
      const payload = (await response.json()) as ApiSuccess<VehicleAdminCatalog> & {
        message?: string | string[];
      };
      if (!response.ok) throw new Error(readMessage(payload.message, text.error));
      setCatalog(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.error);
    } finally {
      setLoading(false);
    }
  }, [text.error]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = useCallback((vehicle: EditingVehicle) => {
    setEditing(vehicle);
    setMessage("");
    setError("");
  }, []);

  useEffect(() => {
    const openNewVehicle = () => openEditor("new");
    window.addEventListener("rahal:fleet-editor-open", openNewVehicle);
    return () => window.removeEventListener("rahal:fleet-editor-open", openNewVehicle);
  }, [openEditor]);

  useEffect(() => {
    if (!catalog || handledDeepLink.current) return;
    handledDeepLink.current = true;
    if (new URLSearchParams(window.location.search).get("editor") === "new") {
      openEditor("new");
    }
  }, [catalog, openEditor]);

  async function submit(event: React.FormEvent<HTMLFormElement>, images: VehicleImageDraft[]) {
    event.preventDefault();
    const normalizedImages = images
      .map((image) => ({
        url: image.url.trim(),
        altAr: image.altAr.trim(),
        altEn: image.altEn.trim(),
      }))
      .filter((image) => image.url);
    if (!normalizedImages.length) {
      setError(text.photoRequired);
      return;
    }
    const form = new FormData(event.currentTarget);
    const id = editing === "new" ? null : editing?.id;
    const body = {
      branchId: stringValue(form, "branchId"),
      nameAr: stringValue(form, "nameAr"),
      nameEn: stringValue(form, "nameEn"),
      make: stringValue(form, "make"),
      model: stringValue(form, "model"),
      year: numberValue(form, "year"),
      registrationNumber: stringValue(form, "registrationNumber"),
      category: stringValue(form, "category"),
      transmission: stringValue(form, "transmission"),
      fuelType: stringValue(form, "fuelType"),
      seats: numberValue(form, "seats"),
      doors: optionalNumber(form, "doors"),
      dailyRateEgp: numberValue(form, "dailyRateEgp"),
      weeklyRateEgp: optionalNumber(form, "weeklyRateEgp"),
      minimumRentalDays: numberValue(form, "minimumRentalDays"),
      driverPolicy: stringValue(form, "driverPolicy"),
      driverChargeEgp: optionalNumber(form, "driverChargeEgp"),
      mileageAllowancePerDay: optionalNumber(form, "mileageAllowancePerDay"),
      depositAmountEgp: optionalNumber(form, "depositAmountEgp"),
      active: form.get("active") === "on",
      featured: form.get("featured") === "on",
      images: normalizedImages,
    };
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        id ? `/api/vehicles/admin/${encodeURIComponent(id)}` : "/api/vehicles/admin",
        {
          method: id ? "PATCH" : "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json()) as ApiSuccess<ManagedVehicle> & {
        message?: string | string[];
      };
      if (!response.ok) throw new Error(readMessage(payload.message, text.error));
      setMessage(id ? text.updated : text.created);
      setEditing(null);
      await Promise.all([load(), onChanged()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="fleet-vehicle-admin" id="vehicle-registry">
      <header>
        <div>
          <span>{text.eyebrow}</span>
          <h2>{text.title}</h2>
          <p>{text.intro}</p>
        </div>
        <button onClick={() => openEditor("new")} type="button">
          <span>+</span> {text.add}
        </button>
      </header>

      {message ? <div className="fleet-admin-success">{message}</div> : null}
      {error && !editing ? <div className="fleet-admin-error">{error}</div> : null}
      {loading ? <div className="fleet-admin-loading">{text.loading}</div> : null}

      {!loading && catalog ? (
        <div className="fleet-vehicle-registry">
          {catalog.vehicles.map((vehicle, index) => {
            const primaryImage = vehicle.images[0]?.url ?? "/images/white-sedan.jpg";
            return (
              <article className={vehicle.active ? "" : "is-inactive"} key={vehicle.id}>
                <button
                  aria-label={`${text.edit}: ${locale === "ar" ? vehicle.nameAr : vehicle.nameEn}`}
                  className="fleet-vehicle-card__visual"
                  onClick={() => openEditor(vehicle)}
                  type="button"
                >
                  <img
                    alt={vehicle.images[0]?.[locale === "ar" ? "altAr" : "altEn"] ?? ""}
                    decoding="async"
                    loading="lazy"
                    src={primaryImage}
                  />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </button>
                <div className="fleet-vehicle-card__body">
                  <div>
                    <span>
                      {vehicle.make} · {vehicle.year}
                    </span>
                    <h3>{locale === "ar" ? vehicle.nameAr : vehicle.nameEn}</h3>
                    <p>
                      {vehicle.registrationNumber} · {vehicle.category.toUpperCase()}
                    </p>
                  </div>
                  <dl>
                    <div>
                      <dt>{text.daily}</dt>
                      <dd>{formatEgp(vehicle.dailyRateEgp, locale)}</dd>
                    </div>
                    <div>
                      <dt>{text.operational}</dt>
                      <dd>{vehicle.status.replaceAll("_", " ")}</dd>
                    </div>
                  </dl>
                  <div className="fleet-vehicle-state">
                    <span>{vehicle.active ? text.active : text.inactive}</span>
                    {vehicle.featured ? <small>{text.featured}</small> : null}
                  </div>
                  <button onClick={() => openEditor(vehicle)} type="button">
                    {text.edit} <Icon name="arrow" size={16} />
                  </button>
                </div>
              </article>
            );
          })}
          {!catalog.vehicles.length ? <p>{text.empty}</p> : null}
        </div>
      ) : null}

      {editing && catalog
        ? createPortal(
            <VehicleEditor
              busy={busy}
              catalog={catalog}
              editing={editing}
              error={error}
              locale={locale}
              onClose={() => setEditing(null)}
              onSubmit={submit}
            />,
            document.body,
          )
        : null}
    </section>
  );
}

function VehicleEditor({
  busy,
  catalog,
  editing,
  error,
  locale,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  catalog: VehicleAdminCatalog;
  editing: EditingVehicle;
  error: string;
  locale: PublicLocale;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>, images: VehicleImageDraft[]) => Promise<void>;
}) {
  const text = copy[locale];
  const [images, setImages] = useState<VehicleImageDraft[]>(() => {
    if (editing === "new" || editing.images.length === 0) {
      return [{ url: "", altAr: "", altEn: "" }];
    }

    return editing.images.map((image) => ({
      url: image.url,
      altAr: image.altAr ?? "",
      altEn: image.altEn ?? "",
    }));
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const primaryImage = images[0]?.url.trim();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [busy, onClose]);

  function updateImage(index: number, field: keyof VehicleImageDraft, nextValue: string) {
    setImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index ? { ...image, [field]: nextValue } : image,
      ),
    );
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  }

  function addPreset(url: string) {
    setImages((current) => {
      if (current.some((image) => image.url === url)) return current;
      const draft = { url, altAr: "", altEn: "" };
      if (current.length === 1 && !current[0]?.url) return [draft];
      return current.length < 6 ? [...current, draft] : current;
    });
  }

  async function uploadFiles(selectedFiles: FileList | File[]) {
    const availableSlots = 6 - images.filter((image) => image.url.trim()).length;
    const files = Array.from(selectedFiles).slice(0, Math.max(0, availableSlots));
    if (!files.length) return;
    setUploadingImages(true);
    setUploadError("");
    const uploaded: VehicleImageDraft[] = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/admin/vehicle-images", {
          method: "POST",
          credentials: "include",
          body: form,
        });
        const payload = (await response.json()) as VehicleImageUpload;
        if (!response.ok || !payload.data?.url) {
          throw new Error(payload.error?.message || text.uploadFailed);
        }
        uploaded.push({ url: payload.data.url, altAr: "", altEn: "" });
      }
      setImages((current) => {
        const existing = current.filter((image) => image.url.trim());
        return [...existing, ...uploaded].slice(0, 6);
      });
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : text.uploadFailed);
    } finally {
      setUploadingImages(false);
    }
  }

  return (
    <div
      className="fleet-editor-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <section
        aria-labelledby="fleet-editor-title"
        aria-modal="true"
        className="fleet-vehicle-editor"
        dir={locale === "ar" ? "rtl" : "ltr"}
        role="dialog"
      >
        <header className="fleet-editor-topbar">
          <div>
            <span>{text.editorEyebrow}</span>
            <h2 id="fleet-editor-title">{editing === "new" ? text.newTitle : text.editTitle}</h2>
            <p>{text.editorIntro}</p>
          </div>
          <button aria-label={text.close} disabled={busy} onClick={onClose} type="button">
            <span>×</span>
            {text.close}
          </button>
        </header>

        <form
          key={editing === "new" ? "new" : editing.id}
          onSubmit={(event) => void onSubmit(event, images)}
        >
          <aside className="fleet-editor-media">
            <div
              className={primaryImage ? "fleet-editor-preview" : "fleet-editor-preview is-empty"}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void uploadFiles(event.dataTransfer.files);
              }}
            >
              {primaryImage ? (
                <>
                  <img
                    alt={images[0]?.[locale === "ar" ? "altAr" : "altEn"] ?? ""}
                    decoding="async"
                    src={primaryImage}
                  />
                  <span>{text.primary}</span>
                </>
              ) : (
                <div>
                  <b>+</b>
                  <strong>{text.photos}</strong>
                  <small>{text.imageUrlHint}</small>
                </div>
              )}
            </div>
            <div className="fleet-editor-media__heading">
              <strong>{text.photos}</strong>
              <small>{text.photosHint}</small>
            </div>
            <label className="fleet-editor-device-upload">
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingImages || images.filter((image) => image.url.trim()).length >= 6}
                multiple
                onChange={(event) => {
                  if (event.target.files) void uploadFiles(event.target.files);
                  event.target.value = "";
                }}
                type="file"
              />
              <span>↑</span>
              <strong>{uploadingImages ? text.uploadingImages : text.uploadFromDevice}</strong>
              <small>{text.dropImages}</small>
            </label>
            {uploadError ? <div className="fleet-admin-error">{uploadError}</div> : null}
            <div className="fleet-editor-image-list">
              {images.map((image, index) => (
                <fieldset key={index}>
                  <legend>{index === 0 ? text.primary : `${text.photos} ${index + 1}`}</legend>
                  <label>
                    <span>{text.imageUrl}</span>
                    <input
                      autoFocus={index === 0 && editing === "new"}
                      onChange={(event) => updateImage(index, "url", event.target.value)}
                      placeholder="https://..."
                      required={index === 0}
                      type="text"
                      value={image.url}
                    />
                  </label>
                  <div>
                    <label>
                      <span>{text.imageAltAr}</span>
                      <input
                        dir="rtl"
                        maxLength={160}
                        onChange={(event) => updateImage(index, "altAr", event.target.value)}
                        value={image.altAr}
                      />
                    </label>
                    <label>
                      <span>{text.imageAltEn}</span>
                      <input
                        dir="ltr"
                        maxLength={160}
                        onChange={(event) => updateImage(index, "altEn", event.target.value)}
                        value={image.altEn}
                      />
                    </label>
                  </div>
                  <nav aria-label={`${text.photos} ${index + 1}`}>
                    <button
                      aria-label={text.moveUp}
                      disabled={index === 0}
                      onClick={() => moveImage(index, -1)}
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label={text.moveDown}
                      disabled={index === images.length - 1}
                      onClick={() => moveImage(index, 1)}
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      aria-label={text.removeImage}
                      disabled={images.length === 1}
                      onClick={() =>
                        setImages((current) =>
                          current.filter((_, imageIndex) => imageIndex !== index),
                        )
                      }
                      type="button"
                    >
                      ×
                    </button>
                  </nav>
                </fieldset>
              ))}
            </div>
            {images.length < 6 ? (
              <button
                className="fleet-editor-add-image"
                onClick={() =>
                  setImages((current) => [...current, { url: "", altAr: "", altEn: "" }])
                }
                type="button"
              >
                <span>+</span> {text.addImage}
              </button>
            ) : null}
            <div className="fleet-editor-presets">
              <span>{text.choosePreset}</span>
              <div>
                {presetImages.map((url) => (
                  <button aria-label={url} key={url} onClick={() => addPreset(url)} type="button">
                    <img alt="" decoding="async" loading="lazy" src={url} />
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="fleet-editor-form">
            {error ? <div className="fleet-admin-error">{error}</div> : null}
            <EditorSection index="01" title={text.overview}>
              <Field label={text.branch}>
                <select
                  defaultValue={editing === "new" ? catalog.branches[0]?.id : editing.branchId}
                  name="branchId"
                  required
                >
                  {catalog.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {locale === "ar" ? branch.nameAr : branch.nameEn}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={text.registration}>
                <input
                  defaultValue={value(editing, "registrationNumber")}
                  maxLength={40}
                  name="registrationNumber"
                  required
                />
              </Field>
              <Field label={text.nameAr}>
                <input
                  defaultValue={value(editing, "nameAr")}
                  dir="rtl"
                  maxLength={100}
                  name="nameAr"
                  required
                />
              </Field>
              <Field label={text.nameEn}>
                <input
                  defaultValue={value(editing, "nameEn")}
                  dir="ltr"
                  maxLength={100}
                  name="nameEn"
                  required
                />
              </Field>
              <Field label={text.make}>
                <input defaultValue={value(editing, "make")} maxLength={60} name="make" required />
              </Field>
              <Field label={text.model}>
                <input
                  defaultValue={value(editing, "model")}
                  maxLength={60}
                  name="model"
                  required
                />
              </Field>
              <Field label={text.year}>
                <input
                  defaultValue={numberValueFor(editing, "year", new Date().getFullYear())}
                  max={2100}
                  min={2000}
                  name="year"
                  required
                  type="number"
                />
              </Field>
              <Field label={text.category}>
                <select defaultValue={value(editing, "category", "sedan")} name="category">
                  <option value="economy">{text.economy}</option>
                  <option value="sedan">{text.sedan}</option>
                  <option value="suv">{text.suv}</option>
                </select>
              </Field>
            </EditorSection>

            <EditorSection index="02" title={text.pricing}>
              <Field label={text.transmission}>
                <select
                  defaultValue={value(editing, "transmission", "AUTOMATIC")}
                  name="transmission"
                >
                  <option value="AUTOMATIC">{text.automatic}</option>
                  <option value="MANUAL">{text.manual}</option>
                </select>
              </Field>
              <Field label={text.fuel}>
                <input
                  defaultValue={value(editing, "fuelType", "PETROL")}
                  maxLength={40}
                  name="fuelType"
                  required
                />
              </Field>
              <Field label={text.seats}>
                <input
                  defaultValue={numberValueFor(editing, "seats", 5)}
                  max={20}
                  min={2}
                  name="seats"
                  required
                  type="number"
                />
              </Field>
              <Field label={text.daily}>
                <input
                  defaultValue={numberValueFor(editing, "dailyRateEgp")}
                  min={1}
                  name="dailyRateEgp"
                  required
                  step="0.01"
                  type="number"
                />
              </Field>
              <Field label={text.minimum}>
                <input
                  defaultValue={numberValueFor(editing, "minimumRentalDays", 1)}
                  max={90}
                  min={1}
                  name="minimumRentalDays"
                  required
                  type="number"
                />
              </Field>
              <Field label={text.driverPolicy}>
                <select
                  defaultValue={value(editing, "driverPolicy", "OPTIONAL")}
                  name="driverPolicy"
                >
                  <option value="OPTIONAL">{text.optional}</option>
                  <option value="MANDATORY">{text.mandatory}</option>
                  <option value="UNAVAILABLE">{text.unavailable}</option>
                </select>
              </Field>
              <details className="fleet-editor-advanced">
                <summary>
                  <span>{text.advanced}</span>
                  <small>{text.advancedHint}</small>
                </summary>
                <div>
                  <Field label={text.doors}>
                    <input
                      defaultValue={numberValueFor(editing, "doors", 4)}
                      max={8}
                      min={2}
                      name="doors"
                      type="number"
                    />
                  </Field>
                  <Field label={text.weekly}>
                    <input
                      defaultValue={numberValueFor(editing, "weeklyRateEgp")}
                      min={1}
                      name="weeklyRateEgp"
                      step="0.01"
                      type="number"
                    />
                  </Field>
                  <Field label={text.driverCharge}>
                    <input
                      defaultValue={numberValueFor(editing, "driverChargeEgp")}
                      min={0}
                      name="driverChargeEgp"
                      step="0.01"
                      type="number"
                    />
                  </Field>
                  <Field label={text.mileage}>
                    <input
                      defaultValue={numberValueFor(editing, "mileageAllowancePerDay")}
                      min={0}
                      name="mileageAllowancePerDay"
                      type="number"
                    />
                  </Field>
                  <Field label={text.deposit}>
                    <input
                      defaultValue={numberValueFor(editing, "depositAmountEgp")}
                      min={0}
                      name="depositAmountEgp"
                      step="0.01"
                      type="number"
                    />
                  </Field>
                </div>
              </details>
            </EditorSection>

            <EditorSection index="03" title={text.publishing}>
              <label className="fleet-editor-toggle">
                <input
                  defaultChecked={editing === "new" ? true : editing.active}
                  name="active"
                  type="checkbox"
                />
                <span>{text.active}</span>
              </label>
              <label className="fleet-editor-toggle">
                <input
                  defaultChecked={editing === "new" ? false : editing.featured}
                  name="featured"
                  type="checkbox"
                />
                <span>{text.featured}</span>
              </label>
            </EditorSection>
          </main>

          <footer className="fleet-editor-actions">
            <button disabled={busy || uploadingImages} type="submit">
              {busy ? text.saving : text.save}
              <Icon name="arrow" size={17} />
            </button>
            <button disabled={busy || uploadingImages} onClick={onClose} type="button">
              {text.cancel}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function EditorSection({
  children,
  index,
  title,
}: {
  children: React.ReactNode;
  index: string;
  title: string;
}) {
  return (
    <section className="fleet-editor-section">
      <header>
        <span>{index}</span>
        <h3>{title}</h3>
      </header>
      <div>{children}</div>
    </section>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="fleet-editor-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function value<K extends keyof ManagedVehicle>(editing: EditingVehicle, key: K, fallback = "") {
  if (editing === "new") return fallback;
  const result = editing[key];
  return typeof result === "string" ? result : fallback;
}

function numberValueFor<K extends keyof ManagedVehicle>(
  editing: EditingVehicle,
  key: K,
  fallback: number | "" = "",
) {
  if (editing === "new") return fallback;
  const result = editing[key];
  return typeof result === "number" ? result : fallback;
}

function stringValue(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function numberValue(form: FormData, key: string) {
  return Number(form.get(key));
}

function optionalNumber(form: FormData, key: string) {
  const raw = form.get(key);
  return raw === null || String(raw).trim() === "" ? null : Number(raw);
}

function readMessage(message: string | string[] | undefined, fallback: string) {
  return Array.isArray(message) ? message.join(" ") : message || fallback;
}
