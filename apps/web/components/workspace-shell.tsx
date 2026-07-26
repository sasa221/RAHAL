"use client";

import Image from "next/image";
import type { ApiSuccess, AuthSession } from "@rahal/contracts";
import { useEffect, useState, type ReactNode } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { Icon } from "./public-home";
import { NotificationCenter } from "./notification-center";

type WorkspaceKind = "customer" | "sales" | "admin";

const shellCopy = {
  ar: {
    customerBrand: "حساب رحال",
    customerRole: "مساحة العميل",
    salesBrand: "مبيعات رحال",
    salesRole: "مساحة فريق المبيعات",
    adminBrand: "إدارة رحال",
    adminRole: "مركز التحكم الإداري",
    overview: "نظرة عامة",
    requests: "الطلبات",
    fleet: "السيارات",
    staff: "الفريق والصلاحيات",
    reviews: "تقييمات العملاء",
    audit: "سجل العمليات",
    profile: "الملف والتفضيلات",
    security: "أمان الحساب",
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
    adminBrand: "Rahal Admin",
    adminRole: "Administration control center",
    overview: "Overview",
    requests: "Requests",
    fleet: "Fleet",
    staff: "Staff & access",
    reviews: "Customer reviews",
    audit: "Audit log",
    profile: "Profile & preferences",
    security: "Account security",
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
  activePage?: "overview" | "fleet" | "staff" | "reviews" | "audit" | "profile" | "security";
}) {
  const text = shellCopy[locale];
  const isStaff = kind !== "customer";
  const [canManageStaff, setCanManageStaff] = useState(kind === "admin");
  const [loggingOut, setLoggingOut] = useState(false);
  const currentHref = localizedPath(
    locale,
    kind === "admin" ? "/admin" : isStaff ? "/sales" : "/account/requests",
  );
  const requestsHref = localizedPath(locale, isStaff ? "/sales" : "/account/requests");
  const fleetHref = localizedPath(locale, isStaff ? "/fleet" : "/cars");
  const languageHref =
    locale === "ar"
      ? isStaff
        ? activePage === "fleet"
          ? "/en/fleet"
          : activePage === "staff"
            ? "/en/admin/staff"
            : activePage === "reviews"
              ? "/en/admin/reviews"
              : activePage === "audit"
                ? "/en/admin/audit"
                : activePage === "security"
                  ? "/en/account/security"
                  : kind === "admin"
                    ? "/en/admin"
                    : "/en/sales"
        : activePage === "security"
          ? "/en/account/security"
          : activePage === "profile"
            ? "/en/account/profile"
            : "/en/account/requests"
      : isStaff
        ? activePage === "fleet"
          ? "/fleet"
          : activePage === "staff"
            ? "/admin/staff"
            : activePage === "reviews"
              ? "/admin/reviews"
              : activePage === "audit"
                ? "/admin/audit"
                : activePage === "security"
                  ? "/account/security"
                  : kind === "admin"
                    ? "/admin"
                    : "/sales"
        : activePage === "security"
          ? "/account/security"
          : activePage === "profile"
            ? "/account/profile"
            : "/account/requests";
  const navigation = isStaff
    ? [
        [text.overview, currentHref, "document"],
        [text.requests, `${requestsHref}#requests`, "calendar"],
        [text.fleet, fleetHref, "car"],
        ...(activePage === "security"
          ? [[text.security, localizedPath(locale, "/account/security"), "document"]]
          : kind === "admin" || canManageStaff
            ? [
                [text.staff, localizedPath(locale, "/admin/staff"), "document"],
                [text.reviews, localizedPath(locale, "/admin/reviews"), "users"],
                [text.audit, localizedPath(locale, "/admin/audit"), "calendar"],
              ]
            : [[text.publicSite, localizedPath(locale), "arrow"]]),
      ]
    : [
        [text.overview, currentHref, "document"],
        [text.requests, `${currentHref}#requests`, "calendar"],
        [text.fleet, localizedPath(locale, "/cars"), "car"],
        [text.profile, localizedPath(locale, "/account/profile"), "users"],
        [text.security, localizedPath(locale, "/account/security"), "document"],
      ];
  const activeTarget =
    activePage === "fleet"
      ? fleetHref
      : activePage === "staff"
        ? localizedPath(locale, "/admin/staff")
        : activePage === "reviews"
          ? localizedPath(locale, "/admin/reviews")
          : activePage === "audit"
            ? localizedPath(locale, "/admin/audit")
            : activePage === "profile"
              ? localizedPath(locale, "/account/profile")
              : activePage === "security"
                ? localizedPath(locale, "/account/security")
                : currentHref;
  const mobileNavigation =
    activePage === "reviews"
      ? navigation.filter((_, index) => index !== 3).slice(0, 4)
      : activePage === "security" && !isStaff
        ? navigation.filter((_, index) => index !== 3).slice(0, 4)
        : navigation.slice(0, 4);

  useEffect(() => {
    if (!isStaff || kind === "admin") return;
    const controller = new AbortController();
    fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as ApiSuccess<AuthSession>;
        setCanManageStaff(["ADMIN", "SUPER_ADMIN"].includes(payload.data.user.role));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isStaff, kind]);

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
            <strong>
              {kind === "admin"
                ? text.adminBrand
                : kind === "sales"
                  ? text.salesBrand
                  : text.customerBrand}
            </strong>
            <small>
              {kind === "admin"
                ? text.adminRole
                : kind === "sales"
                  ? text.salesRole
                  : text.customerRole}
            </small>
          </span>
        </a>

        <nav aria-label={kind === "sales" ? text.salesBrand : text.customerBrand}>
          {navigation.map(([label, href, icon]) => (
            <a
              className={href === activeTarget ? "is-active" : ""}
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
            <strong>
              {kind === "admin"
                ? text.adminBrand
                : kind === "sales"
                  ? text.salesBrand
                  : text.customerBrand}
            </strong>
          </a>
          <nav>
            <NotificationCenter kind={isStaff ? "sales" : "customer"} locale={locale} />
            <a href={localizedPath(locale)}>{text.publicSite}</a>
            <a href={languageHref}>{text.language}</a>
            <a href={localizedPath(locale, isStaff ? "/account/security" : "/account/profile")}>
              {text.account}
            </a>
          </nav>
        </header>
        <main>{children}</main>
      </div>

      <nav
        className="portal-bottom-nav"
        aria-label={kind === "sales" ? text.salesBrand : text.customerBrand}
      >
        {mobileNavigation.map(([label, href, icon]) => (
          <a
            className={href === activeTarget ? "is-active" : ""}
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
