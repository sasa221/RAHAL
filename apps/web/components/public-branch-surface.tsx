"use client";

import type { ApiSuccess, BranchSummary } from "@rahal/contracts";
import { useEffect, useMemo, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { Icon } from "./public-home";

const copy = {
  ar: {
    eyebrow: "فرع رحال",
    title: "كل الإجراءات في مكان واحد",
    unavailable: "تفاصيل الفرع الإضافية ستظهر بعد اعتمادها. وسائل التواصل الرسمية متاحة أدناه.",
    pickup: "الاستلام والإرجاع من الفرع",
    egp: "الدفع بالجنيه المصري",
    noOnline: "لا يوجد دفع أونلاين",
    call: "اتصل بنا",
    whatsapp: "تواصل عبر واتساب",
    directions: "افتح الموقع على الخريطة",
    regular: "السبت إلى الخميس",
    friday: "الجمعة",
    closed: "مغلق",
    services: "الخدمات المتاحة",
    directory: "بيانات التواصل المعتمدة",
    fallbackNote:
      "بيانات التواصل التالية مؤكدة من إدارة رحال. تفاصيل الفرع الإضافية ستظهر بعد اعتمادها.",
  },
  en: {
    eyebrow: "Rahal branch",
    title: "Every procedure in one place",
    unavailable:
      "Additional branch details will appear after approval. Official contact methods are available below.",
    pickup: "Branch pickup and return",
    egp: "EGP only",
    noOnline: "No online payment",
    call: "Call us",
    whatsapp: "Chat on WhatsApp",
    directions: "Open map directions",
    regular: "Saturday to Thursday",
    friday: "Friday",
    closed: "Closed",
    services: "Available services",
    directory: "Approved contact details",
    fallbackNote:
      "These contact details are confirmed by Rahal. Additional branch details will appear after approval.",
  },
} as const;

// Official fallback used only on the public contact directory until the branch API is connected.
const officialFallback = {
  phones: ["+201011105159", "+201113999155"],
  whatsapp: "+201011105159",
} as const;

export function PublicBranchSurface({
  locale,
  variant = "home",
}: {
  locale: PublicLocale;
  variant?: "home" | "directory" | "footer";
}) {
  const text = copy[locale];
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [state, setState] = useState<"READY" | "UNAVAILABLE">("UNAVAILABLE");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/branches", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("branch service unavailable");
        const result = (await response.json()) as ApiSuccess<BranchSummary[]>;
        setBranches(result.data);
        setState(result.data.length ? "READY" : "UNAVAILABLE");
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") setState("UNAVAILABLE");
      });
    return () => controller.abort();
  }, []);

  if (variant === "footer") {
    const branch = branches[0];
    return (
      <div className="footer-links footer-links--contact">
        {branch ? (
          <BranchActions branch={branch} locale={locale} />
        ) : (
          <span role="status">{text.unavailable}</span>
        )}
      </div>
    );
  }

  if (variant === "directory") {
    return (
      <section className="public-branch-directory">
        <header>
          <span>{text.directory}</span>
          <h2>{text.title}</h2>
        </header>
        {state !== "READY" ? (
          <div className="public-branch-directory__state" role="status">
            <p>{text.fallbackNote}</p>
            <FallbackContactActions locale={locale} />
          </div>
        ) : (
          <div className="public-branch-directory__grid">
            {branches.map((branch) => (
              <BranchDetails branch={branch} key={branch.id} locale={locale} />
            ))}
          </div>
        )}
      </section>
    );
  }

  const branch = branches[0];
  return (
    <section className="section branch-section" id="branch" data-reveal>
      <div className="container branch-card">
        <BranchMap branch={branch} locale={locale} />
        <div className="branch-card__content">
          <span className="eyebrow">{text.eyebrow}</span>
          <h2>{text.title}</h2>
          {branch ? (
            <>
              <p>{locale === "ar" ? branch.addressAr : (branch.addressEn ?? branch.addressAr)}</p>
              <div className="branch-note">
                <Icon name="pin" size={18} />
                {locale === "ar" ? branch.nameAr : branch.nameEn}
              </div>
            </>
          ) : (
            <p className="branch-card__safe-state" role="status">
              {text.unavailable}
            </p>
          )}
          <div className="branch-facts">
            <span>{text.pickup}</span>
            <span>{text.egp}</span>
            <span>{text.noOnline}</span>
          </div>
          {branch ? <BranchActions branch={branch} locale={locale} /> : null}
        </div>
      </div>
    </section>
  );
}

function BranchDetails({ branch, locale }: { branch: BranchSummary; locale: PublicLocale }) {
  const text = copy[locale];
  const hours = readHours(branch.workingHours);
  return (
    <article>
      <span className="public-branch-directory__pin">
        <Icon name="pin" size={21} />
      </span>
      <div>
        <h3>{locale === "ar" ? branch.nameAr : branch.nameEn}</h3>
        <p>{locale === "ar" ? branch.addressAr : (branch.addressEn ?? branch.addressAr)}</p>
        {hours.notice ? (
          <p className="branch-hours-notice">{locale === "ar" ? hours.noticeAr : hours.noticeEn}</p>
        ) : hours.regular || hours.friday ? (
          <dl>
            <div>
              <dt>{text.regular}</dt>
              <dd>{hours.regular || "—"}</dd>
            </div>
            <div>
              <dt>{text.friday}</dt>
              <dd>{hours.friday || "—"}</dd>
            </div>
          </dl>
        ) : null}
        {branch.email ? (
          <a className="branch-contact-email" href={`mailto:${branch.email}`}>
            {branch.email}
          </a>
        ) : null}
        {branch.services?.length ? (
          <div className="branch-public-services">
            <strong>{text.services}</strong>
            {branch.services.map((service) => (
              <span key={service}>{service.replaceAll("_", " ")}</span>
            ))}
          </div>
        ) : null}
        {branch.socialLinks?.length ? (
          <div className="branch-public-socials">
            {branch.socialLinks.map((social) => (
              <a href={social.url} key={social.id} rel="noreferrer" target="_blank">
                {social.platform}
              </a>
            ))}
          </div>
        ) : null}
        <BranchActions branch={branch} locale={locale} />
      </div>
    </article>
  );
}

function BranchActions({ branch, locale }: { branch: BranchSummary; locale: PublicLocale }) {
  const text = copy[locale];
  const whatsapp = branch.whatsappNumber ?? branch.whatsappNumbers[0];
  const whatsappMessage = locale === "ar" ? branch.whatsappMessageAr : branch.whatsappMessageEn;
  const mapUrl =
    branch.latitude !== null && branch.longitude !== null
      ? `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`
      : null;
  return (
    <div className="branch-actions">
      {branch.phones.map((phone) => (
        <a className="button button--dark" href={`tel:${dialValue(phone)}`} key={phone}>
          <Icon name="phone" size={18} />
          <span>{phone.replace(/^\+20/, "0")}</span>
        </a>
      ))}
      {branch.whatsappVisible !== false && whatsapp ? (
        <a
          className="button button--whatsapp"
          href={`https://wa.me/${whatsappValue(whatsapp)}${
            whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ""
          }`}
          rel="noreferrer"
          target="_blank"
        >
          <Icon name="whatsapp" size={19} />
          {text.whatsapp}
        </a>
      ) : null}
      {mapUrl ? (
        <a className="branch-directions" href={mapUrl} rel="noreferrer" target="_blank">
          <Icon name="pin" size={16} />
          {text.directions}
        </a>
      ) : null}
    </div>
  );
}

function FallbackContactActions({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  return (
    <div className="branch-actions">
      {officialFallback.phones.map((phone) => (
        <a className="button button--dark" href={`tel:${dialValue(phone)}`} key={phone}>
          <Icon name="phone" size={18} />
          <span>{phone.replace(/^\+20/, "0")}</span>
        </a>
      ))}
      <a
        className="button button--whatsapp"
        href={`https://wa.me/${whatsappValue(officialFallback.whatsapp)}`}
        rel="noreferrer"
        target="_blank"
      >
        <Icon name="whatsapp" size={19} />
        {text.whatsapp}
      </a>
    </div>
  );
}

function BranchMap({
  branch,
  locale,
}: {
  branch: BranchSummary | undefined;
  locale: PublicLocale;
}) {
  const coordinates = useMemo(() => {
    if (!branch || branch.latitude === null || branch.longitude === null) return "RAHAL · EGYPT";
    return `${branch.latitude.toFixed(4)} · ${branch.longitude.toFixed(4)}`;
  }, [branch]);
  return (
    <div className="branch-card__map" aria-hidden="true">
      <div className="map-grid" />
      <span className="map-coordinates">{coordinates}</span>
      <span className="map-pin">
        <Icon name="pin" size={28} />
      </span>
      <span className="map-label">
        {branch ? (locale === "ar" ? branch.nameAr : branch.nameEn) : "RAHAL"}
      </span>
    </div>
  );
}

function dialValue(value: string) {
  const normalized = value.replace(/[^\d+]/g, "");
  if (normalized.startsWith("+")) return normalized;
  if (normalized.startsWith("0")) return `+20${normalized.slice(1)}`;
  return `+${normalized}`;
}

function whatsappValue(value: string) {
  return dialValue(value).replace(/^\+/, "");
}

function readHours(value: Record<string, unknown>) {
  if (Array.isArray(value.weekly)) {
    const weekly = value.weekly.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const row = item as Record<string, unknown>;
      return typeof row.day === "string"
        ? [
            {
              day: row.day,
              closed: Boolean(row.closed),
              opensAt: typeof row.opensAt === "string" ? row.opensAt : null,
              closesAt: typeof row.closesAt === "string" ? row.closesAt : null,
            },
          ]
        : [];
    });
    const regular = weekly.find((day) => day.day !== "FRIDAY" && !day.closed);
    const friday = weekly.find((day) => day.day === "FRIDAY");
    return {
      regular: regular ? `${regular.opensAt}–${regular.closesAt}` : "",
      friday: friday
        ? friday.closed
          ? "Closed / مغلق"
          : `${friday.opensAt}–${friday.closesAt}`
        : "",
      notice: false,
      noticeAr: "",
      noticeEn: "",
    };
  }
  return {
    regular: typeof value.regular === "string" ? value.regular : "",
    friday: typeof value.friday === "string" ? value.friday : "",
    notice: value.notice === true,
    noticeAr: typeof value.noticeAr === "string" ? value.noticeAr : "ساعات العمل تُحدَّث قريبًا",
    noticeEn:
      typeof value.noticeEn === "string" ? value.noticeEn : "Working hours will be updated soon",
  };
}
