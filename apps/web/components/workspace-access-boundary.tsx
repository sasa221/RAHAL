"use client";

import Image from "next/image";
import type { ApiSuccess, AuthSession, AuthUser } from "@rahal/contracts";
import { useEffect, useState, type ReactNode } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";

type WorkspaceKind = "customer" | "sales" | "admin";
type AccessState =
  | { status: "loading" }
  | { status: "allowed"; user: AuthUser }
  | { status: "signed-out" }
  | { status: "denied"; user: AuthUser }
  | { status: "error" };

const copy = {
  ar: {
    loading: "جاري تأمين مساحة العمل",
    loadingBody: "نتحقق من الحساب والصلاحية قبل عرض أي بيانات.",
    signedOut: "سجّل الدخول أولًا",
    signedOutBody: "هذه مساحة خاصة ولا يمكن فتحها بدون جلسة حساب صالحة.",
    denied: "هذه المساحة ليست مخصّصة لحسابك",
    deniedCustomer: "أنت داخل بحساب عميل. ارجع إلى حسابك لمتابعة طلباتك وإشعاراتك.",
    deniedSales: "أنت داخل بحساب مبيعات. ارجع إلى مساحة فريق المبيعات.",
    deniedAdmin: "أنت داخل بحساب إداري. ارجع إلى مركز الإدارة.",
    error: "تعذر التحقق من صلاحية الحساب",
    errorBody: "لم نعرض محتوى المساحة لحماية بيانات رحال. حاول مرة أخرى.",
    signIn: "تسجيل الدخول",
    returnToWorkspace: "الرجوع إلى مساحتك",
    retry: "إعادة المحاولة",
    publicSite: "الموقع الرئيسي",
    secure: "RAHAL SECURE ACCESS",
  },
  en: {
    loading: "Securing your workspace",
    loadingBody: "We verify the account and role before displaying any data.",
    signedOut: "Sign in first",
    signedOutBody: "This is a private workspace and requires a valid account session.",
    denied: "This workspace is not assigned to your account",
    deniedCustomer: "You are signed in as a customer. Return to your account and requests.",
    deniedSales: "You are signed in as sales staff. Return to the sales workspace.",
    deniedAdmin: "You are signed in as an administrator. Return to the admin center.",
    error: "We could not verify account access",
    errorBody: "Workspace content stayed hidden to protect Rahal data. Please try again.",
    signIn: "Sign in",
    returnToWorkspace: "Return to your workspace",
    retry: "Try again",
    publicSite: "Public website",
    secure: "RAHAL SECURE ACCESS",
  },
} as const;

export function WorkspaceAccessBoundary({
  children,
  kind,
  locale,
}: {
  children: ReactNode;
  kind: WorkspaceKind;
  locale: PublicLocale;
}) {
  const [access, setAccess] = useState<AccessState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          setAccess({ status: "signed-out" });
          return;
        }
        if (!response.ok) {
          setAccess({ status: "error" });
          return;
        }

        const payload = (await response.json()) as ApiSuccess<AuthSession>;
        const user = payload.data.user;
        if (user.securityAction && user.role !== "CUSTOMER") {
          window.location.replace(localizedPath(locale, "/auth/staff-security"));
          return;
        }

        setAccess(
          roleCanOpen(kind, user.role) ? { status: "allowed", user } : { status: "denied", user },
        );
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError") {
          setAccess({ status: "error" });
        }
      });

    return () => controller.abort();
  }, [kind, locale]);

  if (access.status === "allowed") return children;

  return <WorkspaceAccessScreen access={access} locale={locale} />;
}

function WorkspaceAccessScreen({
  access,
  locale,
}: {
  access: Exclude<AccessState, { status: "allowed" }>;
  locale: PublicLocale;
}) {
  const text = copy[locale];
  const direction = locale === "ar" ? "rtl" : "ltr";
  const title =
    access.status === "loading"
      ? text.loading
      : access.status === "signed-out"
        ? text.signedOut
        : access.status === "denied"
          ? text.denied
          : text.error;
  const body =
    access.status === "loading"
      ? text.loadingBody
      : access.status === "signed-out"
        ? text.signedOutBody
        : access.status === "denied"
          ? deniedBody(access.user.role, locale)
          : text.errorBody;
  const destination =
    access.status === "denied"
      ? workspacePath(access.user.role, locale)
      : access.status === "signed-out"
        ? localizedPath(locale, "/auth")
        : null;

  return (
    <main className="workspace-access" dir={direction}>
      <div className="workspace-access__glow" />
      <section aria-live="polite" className="workspace-access__card">
        <header>
          <a href={localizedPath(locale)}>
            <Image alt="RAHAL" height={72} src="/images/rahal-logo.png" width={72} />
          </a>
          <span>{text.secure}</span>
        </header>

        <div className={`workspace-access__signal is-${access.status}`} aria-hidden="true">
          <span>
            {access.status === "loading" ? "···" : access.status === "denied" ? "×" : "R"}
          </span>
        </div>

        <p className="workspace-access__index">ACCESS / 01</p>
        <h1>{title}</h1>
        <p>{body}</p>

        <div className="workspace-access__actions">
          {destination ? (
            <a className="workspace-access__primary" href={destination}>
              {access.status === "signed-out" ? text.signIn : text.returnToWorkspace}
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          {access.status === "error" ? (
            <button className="workspace-access__primary" onClick={() => window.location.reload()}>
              {text.retry}
            </button>
          ) : null}
          {access.status !== "loading" ? (
            <a className="workspace-access__secondary" href={localizedPath(locale)}>
              {text.publicSite}
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function roleCanOpen(kind: WorkspaceKind, role: AuthUser["role"]) {
  if (kind === "customer") return role === "CUSTOMER";
  if (kind === "sales") return role === "SALES";
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function workspacePath(role: AuthUser["role"], locale: PublicLocale) {
  if (role === "CUSTOMER") return localizedPath(locale, "/account/requests");
  if (role === "SALES") return localizedPath(locale, "/sales");
  return localizedPath(locale, "/admin");
}

function deniedBody(role: AuthUser["role"], locale: PublicLocale) {
  const text = copy[locale];
  if (role === "CUSTOMER") return text.deniedCustomer;
  if (role === "SALES") return text.deniedSales;
  return text.deniedAdmin;
}
