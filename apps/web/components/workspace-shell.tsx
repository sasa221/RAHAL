"use client";

import Image from "next/image";
import type { ApiSuccess, AuthSession } from "@rahal/contracts";
import { useEffect, useState, type ReactNode } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { Icon } from "./public-home";
import { NotificationCenter } from "./notification-center";
import { WorkspaceAccessBoundary } from "./workspace-access-boundary";
import { WorkspaceInstallAction } from "./workspace-install-action";

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
    branches: "الفروع",
    documents: "سياسة المستندات",
    communications: "مركز التواصل",
    policies: "السياسات والموافقات",
    content: "محتوى الموقع",
    reports: "التقارير والتشغيل",
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
    menu: "القائمة",
    closeMenu: "إغلاق القائمة",
    commandCenter: "مركز الأوامر",
    allTools: "كل أدوات العمل",
    quickLinks: "وصول سريع",
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
    branches: "Branches",
    documents: "Document policy",
    communications: "Communications",
    policies: "Policies & consent",
    content: "Website content",
    reports: "Reports & intelligence",
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
    menu: "Menu",
    closeMenu: "Close menu",
    commandCenter: "Command center",
    allTools: "All workspace tools",
    quickLinks: "Quick access",
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
  activePage?:
    | "overview"
    | "fleet"
    | "branches"
    | "documents"
    | "communications"
    | "policies"
    | "content"
    | "reports"
    | "staff"
    | "reviews"
    | "audit"
    | "profile"
    | "security";
}) {
  const text = shellCopy[locale];
  const isStaff = kind !== "customer";
  const [canManageStaff, setCanManageStaff] = useState(kind === "admin");
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
          : activePage === "branches"
            ? "/en/admin/branches"
            : activePage === "documents"
              ? "/en/admin/documents"
              : activePage === "communications"
                ? kind === "admin"
                  ? "/en/admin/communications"
                  : "/en/sales/communications"
                : activePage === "policies"
                  ? "/en/admin/policies"
                  : activePage === "content"
                    ? "/en/admin/content"
                    : activePage === "reports"
                      ? "/en/admin/reports"
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
          : activePage === "branches"
            ? "/admin/branches"
            : activePage === "documents"
              ? "/admin/documents"
              : activePage === "communications"
                ? kind === "admin"
                  ? "/admin/communications"
                  : "/sales/communications"
                : activePage === "policies"
                  ? "/admin/policies"
                  : activePage === "content"
                    ? "/admin/content"
                    : activePage === "reports"
                      ? "/admin/reports"
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
                [text.documents, localizedPath(locale, "/admin/documents"), "document"],
                [text.communications, localizedPath(locale, "/admin/communications"), "bell"],
                [text.policies, localizedPath(locale, "/admin/policies"), "document"],
                [text.content, localizedPath(locale, "/admin/content"), "document"],
                [text.reports, localizedPath(locale, "/admin/reports"), "calendar"],
                [text.branches, localizedPath(locale, "/admin/branches"), "car"],
                [text.staff, localizedPath(locale, "/admin/staff"), "document"],
                [text.reviews, localizedPath(locale, "/admin/reviews"), "users"],
                [text.audit, localizedPath(locale, "/admin/audit"), "calendar"],
              ]
            : [
                [text.communications, localizedPath(locale, "/sales/communications"), "bell"],
                [text.publicSite, localizedPath(locale), "arrow"],
              ]),
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
      : activePage === "branches"
        ? localizedPath(locale, "/admin/branches")
        : activePage === "documents"
          ? localizedPath(locale, "/admin/documents")
          : activePage === "communications"
            ? localizedPath(
                locale,
                kind === "admin" ? "/admin/communications" : "/sales/communications",
              )
            : activePage === "policies"
              ? localizedPath(locale, "/admin/policies")
              : activePage === "content"
                ? localizedPath(locale, "/admin/content")
                : activePage === "reports"
                  ? localizedPath(locale, "/admin/reports")
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
  const preferredMobileNavigation =
    activePage === "reviews"
      ? navigation.filter((_, index) => index !== 3).slice(0, 4)
      : activePage === "security" && !isStaff
        ? navigation.filter((_, index) => index !== 3).slice(0, 4)
        : navigation.slice(0, 4);
  const activeNavigationItem = navigation.find(([, href]) => href === activeTarget);
  const mobileNavigation =
    activeNavigationItem &&
    !preferredMobileNavigation.some(([, href]) => href === activeNavigationItem[1])
      ? [...preferredMobileNavigation.slice(0, 3), activeNavigationItem]
      : preferredMobileNavigation;

  useEffect(() => {
    if (!isStaff) return;
    const controller = new AbortController();
    fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as ApiSuccess<AuthSession>;
        if (payload.data.user.securityAction) {
          window.location.replace(localizedPath(locale, "/auth/staff-security"));
          return;
        }
        setCanManageStaff(["ADMIN", "SUPER_ADMIN"].includes(payload.data.user.role));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isStaff, locale]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
    } finally {
      window.dispatchEvent(new Event("rahal:session-changed"));
      window.location.assign(localizedPath(locale, "/auth"));
    }
  }

  return (
    <WorkspaceAccessBoundary kind={kind} locale={locale}>
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
            <LogoutIcon />
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
              <button
                aria-controls="portal-mobile-menu"
                aria-expanded={mobileMenuOpen}
                aria-label={text.menu}
                className="portal-mobile-menu-trigger"
                onClick={() => setMobileMenuOpen(true)}
                type="button"
              >
                <MenuIcon />
                <span>{text.menu}</span>
              </button>
              {isStaff ? (
                <WorkspaceInstallAction
                  kind={kind === "admin" ? "admin" : "sales"}
                  locale={locale}
                />
              ) : null}
              <NotificationCenter kind={isStaff ? "sales" : "customer"} locale={locale} />
              <a href={localizedPath(locale)}>{text.publicSite}</a>
              <a href={languageHref}>{text.language}</a>
              <a href={localizedPath(locale, isStaff ? "/account/security" : "/account/profile")}>
                {text.account}
              </a>
              <button
                aria-label={text.signOut}
                className="portal-topbar-sign-out"
                disabled={loggingOut}
                onClick={logout}
                type="button"
              >
                <LogoutIcon />
                <span>{loggingOut ? text.signingOut : text.signOut}</span>
              </button>
            </nav>
          </header>
          <main>{children}</main>
        </div>

        {mobileMenuOpen ? (
          <>
            <button
              aria-label={text.closeMenu}
              className="portal-mobile-menu-backdrop"
              onClick={() => setMobileMenuOpen(false)}
              type="button"
            />
            <aside
              aria-label={text.allTools}
              className="portal-mobile-menu"
              id="portal-mobile-menu"
            >
              <header>
                <a href={localizedPath(locale)}>
                  <Image alt="" height={52} src="/images/rahal-logo.png" width={52} />
                  <span>
                    <small>{text.commandCenter}</small>
                    <strong>
                      {kind === "admin"
                        ? text.adminBrand
                        : kind === "sales"
                          ? text.salesBrand
                          : text.customerBrand}
                    </strong>
                  </span>
                </a>
                <button
                  aria-label={text.closeMenu}
                  onClick={() => setMobileMenuOpen(false)}
                  type="button"
                >
                  <CloseIcon />
                </button>
              </header>

              <div className="portal-mobile-menu__current">
                <small>{text.quickLinks}</small>
                <strong>{activeNavigationItem?.[0] ?? text.overview}</strong>
                <i />
              </div>

              <nav aria-label={text.allTools}>
                {navigation.map(([label, href, icon], index) => (
                  <a
                    className={href === activeTarget ? "is-active" : ""}
                    href={href}
                    key={`drawer-${label}-${href}`}
                  >
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    <Icon name={icon as "arrow" | "calendar" | "car" | "document"} size={20} />
                    <span>{label}</span>
                    <b aria-hidden="true">↗</b>
                  </a>
                ))}
              </nav>

              <footer>
                <a href={languageHref}>{text.language}</a>
                <a href={localizedPath(locale, isStaff ? "/account/security" : "/account/profile")}>
                  {text.account}
                </a>
                <button disabled={loggingOut} onClick={logout} type="button">
                  <LogoutIcon />
                  {loggingOut ? text.signingOut : text.signOut}
                </button>
              </footer>
            </aside>
          </>
        ) : null}

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
    </WorkspaceAccessBoundary>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M10 5H6.8A2.8 2.8 0 0 0 4 7.8v8.4A2.8 2.8 0 0 0 6.8 19H10m4-11 4 4-4 4m4-4H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M4 12h11M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
