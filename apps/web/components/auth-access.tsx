"use client";

import type { AuthSession } from "@rahal/contracts";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { ExperienceMotion } from "./experience-motion";
import { Footer, Header, Icon } from "./public-home";

type AuthMode = "login" | "register";
type VerificationChannel = "email" | "phone";

type SessionResult = AuthSession;

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
    passwordHint: "8 أحرف على الأقل",
    forgotPassword: "نسيت كلمة المرور؟",
    loginAction: "دخول آمن",
    registerAction: "إنشاء الحساب",
    working: "جاري التأمين...",
    pendingTitle: "الحساب اتعمل بنجاح",
    activeTitle: "تم تسجيل الدخول",
    successCopy: "جلسة المتصفح آمنة. الخطوة التالية هي التحقق من الهاتف والبريد قبل إرسال الطلب.",
    activeCopy: "تم التحقق من الهاتف والبريد. حسابك جاهز لمتابعة الطلبات وإرسال طلب حجز.",
    emailStatus: "البريد",
    phoneStatus: "الهاتف",
    verified: "تم التحقق",
    pending: "بانتظار التحقق",
    verifyEmail: "تحقق من البريد",
    verifyPhone: "تحقق من الهاتف",
    codeTitle: "أدخل رمز التحقق",
    codeCopy: "الرمز صالح لمدة 10 دقائق وبحد أقصى 5 محاولات.",
    codeLabel: "رمز من 6 أرقام",
    confirmCode: "تأكيد الرمز",
    sendCode: "إرسال رمز التحقق",
    cancelVerification: "رجوع",
    verifiedMessage: "تم التحقق بنجاح.",
    requestingCode: "جاري إنشاء الرمز...",
    confirmingCode: "جاري التحقق...",
    continue: "استعرض السيارات",
    dashboard: "افتح حسابي وطلباتي",
    salesDashboard: "افتح مساحة المبيعات",
    signOut: "تسجيل الخروج",
    signingOut: "جاري تسجيل الخروج...",
    security: "لن نعرض كلمة المرور أو رمز الجلسة داخل الصفحة.",
    connectionError: "تعذر الاتصال بخدمة الحسابات. تأكد أن API تعمل ثم حاول مرة أخرى.",
    verificationUnavailable:
      "إرسال رمز التحقق غير متاح مؤقتًا. حاول مرة أخرى لاحقًا أو تواصل مع فريق رحال.",
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
    passwordHint: "At least 8 characters",
    forgotPassword: "Forgot password?",
    loginAction: "Sign in securely",
    registerAction: "Create account",
    working: "Securing session...",
    pendingTitle: "Your account is ready",
    activeTitle: "You are signed in",
    successCopy:
      "Your browser session is protected. Phone and email verification come next before request submission.",
    activeCopy:
      "Phone and email are verified. Your account is ready to follow and submit reservation requests.",
    emailStatus: "Email",
    phoneStatus: "Phone",
    verified: "Verified",
    pending: "Verification pending",
    verifyEmail: "Verify email",
    verifyPhone: "Verify phone",
    codeTitle: "Enter your verification code",
    codeCopy: "The code expires in 10 minutes and allows up to 5 attempts.",
    codeLabel: "Six-digit code",
    confirmCode: "Confirm code",
    sendCode: "Send verification code",
    cancelVerification: "Back",
    verifiedMessage: "Verification completed.",
    requestingCode: "Creating code...",
    confirmingCode: "Verifying...",
    continue: "Explore the fleet",
    dashboard: "Open my account & requests",
    salesDashboard: "Open sales workspace",
    signOut: "Sign out",
    signingOut: "Signing out...",
    security: "Your password and raw session token are never rendered on this page.",
    connectionError:
      "The account service could not be reached. Make sure the API is running and try again.",
    verificationUnavailable:
      "Verification delivery is temporarily unavailable. Please try again later or contact Rahal.",
  },
} as const;

export function AuthAccess({ locale }: { locale: PublicLocale }) {
  const copy = authCopy[locale];
  const [mode, setMode] = useState<AuthMode>("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<SessionResult | null>(null);
  const [verificationChannel, setVerificationChannel] = useState<VerificationChannel | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationDestination, setVerificationDestination] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const dashboardHref = session
    ? localizedPath(locale, session.user.role === "CUSTOMER" ? "/account/requests" : "/sales")
    : localizedPath(locale, "/auth");

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const result = (await response.json()) as { data?: SessionResult };
        return result.data ?? null;
      })
      .then((currentSession) => {
        if (active && currentSession) setSession(currentSession);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const frame = window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("auth-workspace")?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [session]);

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
      window.dispatchEvent(new Event("rahal:session-changed"));
    } catch {
      setError(copy.connectionError);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
  }

  async function logout() {
    setLoggingOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setError(copy.connectionError);
        return;
      }
      setSession(null);
      window.dispatchEvent(new Event("rahal:session-changed"));
      setVerificationChannel(null);
      setVerificationCode("");
      setVerificationNotice("");
      setMode("login");
    } catch {
      setError(copy.connectionError);
    } finally {
      setLoggingOut(false);
    }
  }

  async function requestVerification(channel: VerificationChannel) {
    setVerificationBusy(true);
    setError("");
    setVerificationNotice("");
    try {
      const response = await fetch("/api/auth/verification/request", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const result = (await response.json()) as {
        data?: { destination: string };
        error?: { message?: string };
      };
      if (!response.ok || !result.data) {
        setError(
          response.status === 503
            ? copy.verificationUnavailable
            : result.error?.message || copy.connectionError,
        );
        return;
      }
      setVerificationChannel(channel);
      setVerificationDestination(result.data.destination);
      setVerificationCode("");
    } catch {
      setError(copy.connectionError);
    } finally {
      setVerificationBusy(false);
    }
  }

  async function confirmVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verificationChannel) return;
    setVerificationBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verification/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel: verificationChannel, code: verificationCode }),
      });
      const result = (await response.json()) as {
        data?: { user: SessionResult["user"] };
        error?: { message?: string };
      };
      if (!response.ok || !result.data || !session) {
        setError(result.error?.message || copy.connectionError);
        return;
      }
      setSession({ ...session, user: result.data.user });
      setVerificationNotice(copy.verifiedMessage);
      setVerificationChannel(null);
      setVerificationCode("");
    } catch {
      setError(copy.connectionError);
    } finally {
      setVerificationBusy(false);
    }
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

        <section className="auth-workspace" id="auth-workspace">
          {!session ? (
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
          ) : null}

          {session ? (
            <div className="auth-success auth-panel" aria-live="polite">
              <span className="auth-success__mark">
                <Icon name="shield" size={30} />
              </span>
              <span className="eyebrow">RAHAL / ACCOUNT</span>
              <h2>
                {session.user.status === "PENDING_VERIFICATION"
                  ? copy.pendingTitle
                  : copy.activeTitle}
              </h2>
              <p>
                {session.user.status === "PENDING_VERIFICATION"
                  ? copy.successCopy
                  : copy.activeCopy}
              </p>
              <strong>{session.user.fullName}</strong>
              <div className="auth-success__status">
                <button
                  disabled={session.user.emailVerified || verificationBusy}
                  onClick={() => requestVerification("email")}
                  type="button"
                >
                  {copy.emailStatus}
                  <b>{session.user.emailVerified ? copy.verified : copy.pending}</b>
                  {!session.user.emailVerified ? <small>{copy.verifyEmail}</small> : null}
                </button>
                <button
                  disabled={session.user.phoneVerified || verificationBusy}
                  onClick={() => requestVerification("phone")}
                  type="button"
                >
                  {copy.phoneStatus}
                  <b>{session.user.phoneVerified ? copy.verified : copy.pending}</b>
                  {!session.user.phoneVerified ? <small>{copy.verifyPhone}</small> : null}
                </button>
              </div>
              {verificationChannel ? (
                <form className="auth-verification auth-panel" onSubmit={confirmVerification}>
                  <span className="eyebrow">{copy.sendCode}</span>
                  <h3>{copy.codeTitle}</h3>
                  <p>
                    {copy.codeCopy} <strong>{verificationDestination}</strong>
                  </p>
                  <label>
                    <span>{copy.codeLabel}</span>
                    <input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      minLength={6}
                      onChange={(event) =>
                        setVerificationCode(event.target.value.replace(/\D/g, ""))
                      }
                      pattern="[0-9]{6}"
                      required
                      value={verificationCode}
                    />
                  </label>
                  <div>
                    <button disabled={verificationBusy} type="submit">
                      {verificationBusy ? copy.confirmingCode : copy.confirmCode}
                    </button>
                    <button onClick={() => setVerificationChannel(null)} type="button">
                      {copy.cancelVerification}
                    </button>
                  </div>
                </form>
              ) : null}
              {verificationNotice ? (
                <p className="auth-success__notice" role="status">
                  {verificationNotice}
                </p>
              ) : null}
              {error ? (
                <p className="auth-form__error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="auth-success__actions">
                <a className="is-primary" href={dashboardHref}>
                  {session.user.role === "CUSTOMER" ? copy.dashboard : copy.salesDashboard}
                  <Icon name="arrow" size={18} />
                </a>
                <a href={localizedPath(locale, "/cars")}>{copy.continue}</a>
                <button disabled={loggingOut} onClick={logout} type="button">
                  {loggingOut ? copy.signingOut : copy.signOut}
                </button>
              </div>
            </div>
          ) : (
            <form className="auth-form auth-panel" key={mode} onSubmit={submit}>
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
                  minLength={mode === "register" ? 8 : 1}
                  maxLength={128}
                  name="password"
                  required
                  type="password"
                />
                {mode === "register" ? <small>{copy.passwordHint}</small> : null}
              </label>
              {mode === "login" ? (
                <a className="auth-form__forgot" href={localizedPath(locale, "/auth/recover")}>
                  {copy.forgotPassword}
                </a>
              ) : null}

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
