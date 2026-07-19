"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { ExperienceMotion } from "./experience-motion";
import { Footer, Header, Icon } from "./public-home";

type AuthMode = "login" | "register";

type SessionResult = {
  user: {
    fullName: string;
    email: string;
    phone: string;
    status: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  expiresAt: string;
};

const authCopy = {
  ar: {
    heroEyebrow: "حساب رحال",
    heroTitle: "رحلتك، محفوظة ومتابعة.",
    heroCopy: "سجّل دخولك لمتابعة طلباتك وحالة المراجعة والتواصل مع فريق المبيعات في مكان واحد.",
    heroFacts: ["جلسة آمنة", "بيانات محمية", "متابعة بشرية"],
    loginTab: "تسجيل الدخول",
    registerTab: "حساب جديد",
    loginTitle: "أهلًا برجوعك.",
    registerTitle: "ابدأ حساب رحال.",
    loginCopy: "ادخل بالبريد الإلكتروني أو رقم الهاتف.",
    registerCopy: "بيانات أساسية فقط. التحقق من الهاتف والبريد مطلوب قبل إرسال طلب حجز.",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف الدولي",
    identifier: "البريد الإلكتروني أو رقم الهاتف",
    password: "كلمة المرور",
    passwordHint: "12 حرفًا على الأقل",
    loginAction: "دخول آمن",
    registerAction: "إنشاء الحساب",
    working: "جاري التأمين...",
    pendingTitle: "الحساب اتعمل بنجاح",
    activeTitle: "تم تسجيل الدخول",
    successCopy: "جلسة المتصفح آمنة. الخطوة التالية هي التحقق من الهاتف والبريد قبل إرسال الطلب.",
    emailStatus: "البريد",
    phoneStatus: "الهاتف",
    verified: "تم التحقق",
    pending: "بانتظار التحقق",
    continue: "استعرض السيارات",
    security: "لن نعرض كلمة المرور أو رمز الجلسة داخل الصفحة.",
    connectionError: "تعذر الاتصال بخدمة الحسابات. تأكد أن API تعمل ثم حاول مرة أخرى.",
  },
  en: {
    heroEyebrow: "YOUR RAHAL ACCOUNT",
    heroTitle: "Your journey, saved and followed through.",
    heroCopy:
      "Sign in to follow requests, review status, and sales communication from one protected place.",
    heroFacts: ["Secure session", "Protected data", "Human follow-up"],
    loginTab: "Sign in",
    registerTab: "Create account",
    loginTitle: "Welcome back.",
    registerTitle: "Start your Rahal account.",
    loginCopy: "Use your email address or phone number.",
    registerCopy:
      "Only the essentials. Phone and email verification are required before a reservation request can be submitted.",
    fullName: "Full name",
    email: "Email address",
    phone: "International phone number",
    identifier: "Email address or phone number",
    password: "Password",
    passwordHint: "At least 12 characters",
    loginAction: "Sign in securely",
    registerAction: "Create account",
    working: "Securing session...",
    pendingTitle: "Your account is ready",
    activeTitle: "You are signed in",
    successCopy:
      "Your browser session is protected. Phone and email verification come next before request submission.",
    emailStatus: "Email",
    phoneStatus: "Phone",
    verified: "Verified",
    pending: "Verification pending",
    continue: "Explore the fleet",
    security: "Your password and raw session token are never rendered on this page.",
    connectionError:
      "The account service could not be reached. Make sure the API is running and try again.",
  },
} as const;

export function AuthAccess({ locale }: { locale: PublicLocale }) {
  const copy = authCopy[locale];
  const [mode, setMode] = useState<AuthMode>("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<SessionResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    const payload =
      mode === "login"
        ? {
            identifier: String(data.get("identifier") ?? ""),
            password: String(data.get("password") ?? ""),
          }
        : {
            fullNameEn: String(data.get("fullName") ?? ""),
            ...(locale === "ar" ? { fullNameAr: String(data.get("fullName") ?? "") } : {}),
            email: String(data.get("email") ?? ""),
            phone: String(data.get("phone") ?? ""),
            password: String(data.get("password") ?? ""),
            preferredLocale: locale,
          };

    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        data?: SessionResult;
        error?: { message?: string };
      };
      if (!response.ok || !result.data) {
        setError(result.error?.message || copy.connectionError);
        return;
      }
      setSession(result.data);
    } catch {
      setError(copy.connectionError);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setSession(null);
  }

  return (
    <div
      className="public-site auth-page"
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale === "ar" ? "ar-EG" : "en-EG"}
    >
      <ExperienceMotion />
      <Header
        locale={locale}
        languageHref={localizedPath(locale === "ar" ? "en" : "ar", "/auth")}
      />

      <main className="auth-stage">
        <section className="auth-stage__visual">
          <Image
            alt=""
            className="auth-stage__image"
            fill
            priority
            sizes="(max-width: 820px) 100vw, 48vw"
            src="/images/rahal-hero-gem.png"
          />
          <span className="auth-stage__overlay" aria-hidden="true" />
          <span className="auth-stage__grain" aria-hidden="true" />
          <div className="auth-stage__story" data-reveal>
            <span>{copy.heroEyebrow}</span>
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroCopy}</p>
            <div>
              {copy.heroFacts.map((fact, index) => (
                <span key={fact}>
                  <b>0{index + 1}</b>
                  {fact}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="auth-workspace">
          <div className="auth-mode-switch" role="tablist" aria-label={copy.heroEyebrow}>
            <button
              aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
              role="tab"
              type="button"
            >
              {copy.loginTab}
            </button>
            <button
              aria-selected={mode === "register"}
              onClick={() => switchMode("register")}
              role="tab"
              type="button"
            >
              {copy.registerTab}
            </button>
          </div>

          {session ? (
            <div className="auth-success" aria-live="polite" data-reveal>
              <span className="auth-success__mark">
                <Icon name="shield" size={30} />
              </span>
              <span className="eyebrow">RAHAL / ACCOUNT</span>
              <h2>
                {session.user.status === "PENDING_VERIFICATION"
                  ? copy.pendingTitle
                  : copy.activeTitle}
              </h2>
              <p>{copy.successCopy}</p>
              <strong>{session.user.fullName}</strong>
              <div className="auth-success__status">
                <span>
                  {copy.emailStatus}
                  <b>{session.user.emailVerified ? copy.verified : copy.pending}</b>
                </span>
                <span>
                  {copy.phoneStatus}
                  <b>{session.user.phoneVerified ? copy.verified : copy.pending}</b>
                </span>
              </div>
              <a href={localizedPath(locale, "/cars")}>
                {copy.continue}
                <Icon name="arrow" size={18} />
              </a>
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              <header>
                <span className="eyebrow">RAHAL / SECURE ACCESS</span>
                <h2>{mode === "login" ? copy.loginTitle : copy.registerTitle}</h2>
                <p>{mode === "login" ? copy.loginCopy : copy.registerCopy}</p>
              </header>

              {mode === "register" ? (
                <>
                  <label>
                    <span>{copy.fullName}</span>
                    <input
                      autoComplete="name"
                      name="fullName"
                      required
                      type="text"
                      minLength={2}
                      maxLength={100}
                    />
                  </label>
                  <label>
                    <span>{copy.email}</span>
                    <input
                      autoComplete="email"
                      name="email"
                      required
                      type="email"
                      maxLength={254}
                    />
                  </label>
                  <label>
                    <span>{copy.phone}</span>
                    <input
                      autoComplete="tel"
                      dir="ltr"
                      inputMode="tel"
                      name="phone"
                      pattern="\+?[1-9][0-9]{7,14}"
                      placeholder="+20…"
                      required
                      type="tel"
                    />
                  </label>
                </>
              ) : (
                <label>
                  <span>{copy.identifier}</span>
                  <input
                    autoComplete="username"
                    name="identifier"
                    required
                    type="text"
                    maxLength={254}
                  />
                </label>
              )}

              <label>
                <span>{copy.password}</span>
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={mode === "register" ? 12 : 1}
                  maxLength={128}
                  name="password"
                  required
                  type="password"
                />
                {mode === "register" ? <small>{copy.passwordHint}</small> : null}
              </label>

              {error ? (
                <p className="auth-form__error" role="alert">
                  {error}
                </p>
              ) : null}

              <button disabled={submitting} type="submit">
                {submitting
                  ? copy.working
                  : mode === "login"
                    ? copy.loginAction
                    : copy.registerAction}
                <Icon name="arrow" size={18} />
              </button>
              <p className="auth-form__security">
                <Icon name="shield" size={16} />
                {copy.security}
              </p>
            </form>
          )}
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
