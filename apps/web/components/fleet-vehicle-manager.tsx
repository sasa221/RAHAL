"use client";

import type { ApiSuccess, ManagedVehicle, VehicleAdminCatalog } from "@rahal/contracts";
import { useCallback, useEffect, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { formatEgp } from "../lib/public-content";
import { Icon } from "./public-home";

const copy = {
  ar: {
    eyebrow: "سجل السيارات",
    title: "إدارة السيارات",
    intro:
      "أضف سيارة جديدة أو حدّث بيانات التشغيل والتسعير. حالات الحجز والتأجير تتحكم فيها دورة العمل فقط.",
    add: "إضافة سيارة",
    edit: "تعديل",
    loading: "جاري تحميل سجل السيارات…",
    empty: "لا توجد سيارات مسجلة.",
    active: "منشورة",
    inactive: "غير منشورة",
    featured: "مميزة في الموقع",
    save: "حفظ السيارة",
    saving: "جاري الحفظ…",
    cancel: "إلغاء",
    created: "تمت إضافة السيارة إلى الأسطول.",
    updated: "تم تحديث بيانات السيارة.",
    error: "تعذر حفظ بيانات السيارة.",
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
    luggage: "الحقائب",
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
  },
  en: {
    eyebrow: "Vehicle registry",
    title: "Manage vehicles",
    intro:
      "Add a vehicle or update operational and pricing data. Booking and rental states remain workflow-controlled.",
    add: "Add vehicle",
    edit: "Edit",
    loading: "Loading vehicle registry…",
    empty: "No vehicles are registered.",
    active: "Published",
    inactive: "Unpublished",
    featured: "Featured on website",
    save: "Save vehicle",
    saving: "Saving…",
    cancel: "Cancel",
    created: "The vehicle was added to the fleet.",
    updated: "The vehicle was updated.",
    error: "The vehicle could not be saved.",
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
    luggage: "Luggage",
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
  const [editing, setEditing] = useState<ManagedVehicle | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      luggage: optionalNumber(form, "luggage"),
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
    };
    setBusy(true);
    setError("");
    setMessage("");
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
    <section className="fleet-vehicle-admin">
      <header>
        <div>
          <span>{text.eyebrow}</span>
          <h2>{text.title}</h2>
          <p>{text.intro}</p>
        </div>
        <button
          onClick={() => {
            setEditing("new");
            setMessage("");
            setError("");
          }}
          type="button"
        >
          <span>+</span> {text.add}
        </button>
      </header>

      {message ? <div className="fleet-admin-success">{message}</div> : null}
      {error ? <div className="fleet-admin-error">{error}</div> : null}
      {loading ? <div className="fleet-admin-loading">{text.loading}</div> : null}

      {!loading && catalog ? (
        <div className="fleet-vehicle-registry">
          {catalog.vehicles.map((vehicle) => (
            <article className={vehicle.active ? "" : "is-inactive"} key={vehicle.id}>
              <div className="fleet-vehicle-index">
                {String(catalog.vehicles.indexOf(vehicle) + 1).padStart(2, "0")}
              </div>
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
              <button
                onClick={() => {
                  setEditing(vehicle);
                  setMessage("");
                  setError("");
                }}
                type="button"
              >
                {text.edit} <Icon name="arrow" size={16} />
              </button>
            </article>
          ))}
          {!catalog.vehicles.length ? <p>{text.empty}</p> : null}
        </div>
      ) : null}

      {editing && catalog ? (
        <div className="fleet-vehicle-editor">
          <button
            aria-label={text.cancel}
            className="fleet-editor-close"
            onClick={() => setEditing(null)}
            type="button"
          >
            ×
          </button>
          <div className="fleet-editor-heading">
            <span>{editing === "new" ? text.add : text.edit}</span>
            <h3>{editing === "new" ? text.add : editing.nameEn}</h3>
          </div>
          <form key={editing === "new" ? "new" : editing.id} onSubmit={submit}>
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
              <input defaultValue={value(editing, "model")} maxLength={60} name="model" required />
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
            <Field label={text.luggage}>
              <input
                defaultValue={numberValueFor(editing, "luggage", 2)}
                max={20}
                min={0}
                name="luggage"
                type="number"
              />
            </Field>
            <Field label={text.doors}>
              <input
                defaultValue={numberValueFor(editing, "doors", 4)}
                max={8}
                min={2}
                name="doors"
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
            <Field label={text.weekly}>
              <input
                defaultValue={numberValueFor(editing, "weeklyRateEgp")}
                min={1}
                name="weeklyRateEgp"
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
              <select defaultValue={value(editing, "driverPolicy", "OPTIONAL")} name="driverPolicy">
                <option value="OPTIONAL">{text.optional}</option>
                <option value="MANDATORY">{text.mandatory}</option>
                <option value="UNAVAILABLE">{text.unavailable}</option>
              </select>
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
            <div className="fleet-editor-actions">
              <button disabled={busy} type="submit">
                {busy ? text.saving : text.save}
                <Icon name="arrow" size={17} />
              </button>
              <button disabled={busy} onClick={() => setEditing(null)} type="button">
                {text.cancel}
              </button>
            </div>
          </form>
        </div>
      ) : null}
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

function value<K extends keyof ManagedVehicle>(
  editing: ManagedVehicle | "new",
  key: K,
  fallback = "",
) {
  if (editing === "new") return fallback;
  const result = editing[key];
  return typeof result === "string" ? result : fallback;
}

function numberValueFor<K extends keyof ManagedVehicle>(
  editing: ManagedVehicle | "new",
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
