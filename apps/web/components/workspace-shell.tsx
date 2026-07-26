"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { Icon } from "./public-home";

type WorkspaceKind = "customer" | "sales";

const shellCopy = {
  ar: {
    customerBrand: "حساب رحال",
    customerRole: "مساحة العميل",
    salesBrand: "مبيعات رحال",
    salesRole: "مساحة فريق المبيعات",
    overview: "نظرة عامة",
    requests: "الطلبات",
    fleet: "السيارات",
    newRequest: "طلب جديد",
    publicSite: "الموقع الرئيسي",
    account: "الحساب",
    language: "English",
    signOut: "تسجيل الخروج",
    signingOut: "جاري الخروج...",
    supportTitle: "تحتاج مساعدة؟",
    supportCopy: "فريق رحال يتابع كل طلب من الفرع.",
  },
  en: {
    customerBrand: "Rahal Account",
    customerRole: "Customer workspace",
    salesBrand: "Rahal Sales",
    salesRole: "Sales workspace",
    overview: "Overview",
    requests: "Requests",
    fleet: "Fleet",
    newRequest: "New request",
    publicSite: "Public website",
    account: "Account",
    language: "العربية",
    signOut: "Sign out",
    signingOut: "Signing out...",
    supportTitle: "Need support?",
    supportCopy: "The Rahal branch team follows every request.",
  },
} as const;

export function WorkspaceShell({
  children,
  kind,
  locale,
  activePage = "overview",
}: {
  children: ReactNode;
  kind: WorkspaceKind;
  locale: PublicLocale;
  activePage?: "overview" | "fleet";
}) {
  const text = shellCopy[locale];
  const [loggingOut, setLoggingOut] = useState(false);
  const currentHref = localizedPath(locale, kind === "sales" ? "/sales" : "/account/requests");
  const fleetHref = localizedPath(locale, kind === "sales" ? "/fleet" : "/cars");
  const languageHref =
    locale === "ar"
      ? kind === "sales"
        ? activePage === "fleet"
          ? "/en/fleet"
          : "/en/sales"
        : "/en/account/requests"
      : kind === "sales"
        ? activePage === "fleet"
          ? "/fleet"
          : "/sales"
        : "/account/requests";
  const navigation =
    kind === "sales"
      ? [
          [text.overview, currentHref, "document"],
          [text.requests, `${currentHref}#requests`, "calendar"],
          [text.fleet, fleetHref, "car"],
          [text.publicSite, localizedPath(locale), "arrow"],
        ]
      : [
          [text.overview, currentHref, "document"],
          [text.requests, `${currentHref}#requests`, "calendar"],
          [text.fleet, localizedPath(locale, "/cars"), "car"],
          [text.newRequest, localizedPath(locale, "/cars"), "arrow"],
        ];

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
    } finally {
      window.location.assign(localizedPath(locale, "/auth"));
    }
  }

  return (
    <div className={`portal-shell portal-shell--${kind}`} dir={locale === "ar" ? "rtl" : "ltr"}>
      <aside className="portal-sidebar">
        <a className="portal-brand" href={localizedPath(locale)}>
          <Image alt="" height={58} src="/images/rahal-logo.png" width={58} />
          <span>
            <strong>{kind === "sales" ? text.salesBrand : text.customerBrand}</strong>
            <small>{kind === "sales" ? text.salesRole : text.customerRole}</small>
          </span>
        </a>

        <nav aria-label={kind === "sales" ? text.salesBrand : text.customerBrand}>
          {navigation.map(([label, href, icon], index) => (
            <a
              className={
                (activePage === "overview" && index === 0) ||
                (activePage === "fleet" && index === 2)
                  ? "is-active"
                  : ""
              }
              href={href}
              key={`${label}-${href}`}
            >
              <Icon name={icon as "arrow" | "calendar" | "car" | "document"} size={19} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="portal-support-card">
          <span>R</span>
          <strong>{text.supportTitle}</strong>
          <p>{text.supportCopy}</p>
        </div>

        <button className="portal-sign-out" disabled={loggingOut} onClick={logout} type="button">
          <Icon name="arrow" size={18} />
          {loggingOut ? text.signingOut : text.signOut}
        </button>
      </aside>

      <div className="portal-stage">
        <header className="portal-topbar">
          <a className="portal-mobile-brand" href={localizedPath(locale)}>
            <Image alt="" height={42} src="/images/rahal-logo.png" width={42} />
            <strong>{kind === "sales" ? text.salesBrand : text.customerBrand}</strong>
          </a>
          <nav>
            <a href={localizedPath(locale)}>{text.publicSite}</a>
            <a href={languageHref}>{text.language}</a>
            <a href={localizedPath(locale, "/auth")}>{text.account}</a>
          </nav>
        </header>
        <main>{children}</main>
      </div>

      <nav
        className="portal-bottom-nav"
        aria-label={kind === "sales" ? text.salesBrand : text.customerBrand}
      >
        {navigation.slice(0, 4).map(([label, href, icon], index) => (
          <a
            className={
              (activePage === "overview" && index === 0) || (activePage === "fleet" && index === 2)
                ? "is-active"
                : ""
            }
            href={href}
            key={`mobile-${label}-${href}`}
          >
            <Icon name={icon as "arrow" | "calendar" | "car" | "document"} size={19} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
