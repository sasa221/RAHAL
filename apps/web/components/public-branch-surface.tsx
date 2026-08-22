"use client";

import type { ApiSuccess, BranchSummary } from "@rahal/contracts";
import { useEffect, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { Icon } from "./public-home";

const copy = {
  ar: {
    eyebrow: "فرع رحال",
    title: "رحال لتأجير السيارات",
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
    directory: "بيانات الفرع والتواصل",
  },
  en: {
    eyebrow: "Rahal branch",
    title: "Rahal Car Rental",
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
    directory: "Branch and contact details",
  },
} as const;

const officialBranch: BranchSummary = {
  id: "demo-branch-cairo",
  nameAr: "رحال لتأجير السيارات",
  nameEn: "Rahal Car Rental",
  addressAr: "10 شارع نصر الثورة، متفرع من شارع الهرم وفيصل",
  addressEn: "10 Nasr El Thawra Street, off Al Haram and Faisal Street, Giza, Egypt",
  latitude: null,
  longitude: null,
  phones: ["+201011105159", "+201113999155"],
  whatsappNumbers: ["+201011105159"],
  whatsappNumber: "+201011105159",
  whatsappVisible: true,
  whatsappMessageAr: null,
  whatsappMessageEn: null,
  workingHours: {},
  active: true,
  governorateAr: "الجيزة",
  governorateEn: "Giza",
  areaAr: "الهرم وفيصل",
  areaEn: "Al Haram and Faisal",
  streetAr: "شارع نصر الثورة",
  streetEn: "Nasr El Thawra Street",
  status: "ACTIVE",
};

export function PublicBranchSurface({
  locale,
  variant = "home",
}: {
  locale: PublicLocale;
  variant?: "home" | "directory" | "footer";
}) {
  const text = copy[locale];
  const [branches, setBranches] = useState<BranchSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/branches", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("branch service unavailable");
        const result = (await response.json()) as ApiSuccess<BranchSummary[]>;
        setBranches(result.data);
      })
      .catch((error: unknown) => {
        // The official branch fallback remains visible if the API is unavailable.
        if ((error as { name?: string }).name !== "AbortError") setBranches([]);
      });
    return () => controller.abort();
  }, []);

  if (variant === "footer") {
    const branch = selectPublicBranch(branches);
    return (
      <div className="footer-links footer-links--contact">
        <BranchActions branch={branch} locale={locale} />
      </div>
    );
  }

  if (variant === "directory") {
    const directoryBranches = branches.length ? branches : [officialBranch];
    return (
      <section className="public-branch-directory">
        <header>
          <span>{text.directory}</span>
          <h2>{text.title}</h2>
        </header>
        <div className="public-branch-directory__grid">
          {directoryBranches.map((branch) => (
            <BranchDetails branch={branch} key={branch.id} locale={locale} />
          ))}
        </div>
      </section>
    );
  }

  const branch = selectPublicBranch(branches);
  return (
    <section className="section branch-section" id="branch" data-reveal>
      <div className="container branch-card">
        <BranchMap branch={branch} locale={locale} />
        <div className="branch-card__content">
          <span className="eyebrow">{text.eyebrow}</span>
          <h2>{text.title}</h2>
          <p>{locale === "ar" ? branch.addressAr : (branch.addressEn ?? branch.addressAr)}</p>
          <div className="branch-note">
            <Icon name="pin" size={18} />
            {locale === "ar" ? branch.nameAr : branch.nameEn}
          </div>
          <div className="branch-facts">
            <span>{text.pickup}</span>
            <span>{text.egp}</span>
            <span>{text.noOnline}</span>
          </div>
          <BranchActions branch={branch} locale={locale} />
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
  const address = locale === "ar" ? branch.addressAr : (branch.addressEn ?? branch.addressAr);
  const mapUrl = mapSearchUrl(address);
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
      <a className="branch-directions" href={mapUrl} rel="noreferrer" target="_blank">
        <Icon name="pin" size={16} />
        {text.directions}
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
  const address = branch
    ? locale === "ar"
      ? branch.addressAr
      : (branch.addressEn ?? branch.addressAr)
    : "Rahal Car Rental, Giza, Egypt";
  return (
    <div className="branch-card__map">
      <iframe
        title={locale === "ar" ? "خريطة فرع رحال" : "Rahal branch map"}
        src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a className="map-open-link" href={mapSearchUrl(address)} rel="noreferrer" target="_blank">
        <Icon name="pin" size={16} />
        {locale === "ar" ? "فتح الموقع في خرائط Google" : "Open in Google Maps"}
      </a>
    </div>
  );
}

function mapSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function selectPublicBranch(branches: BranchSummary[]) {
  return (
    branches.find((candidate) => candidate.id === officialBranch.id) ??
    branches[0] ??
    officialBranch
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
