"use client";

import type {
  ApiSuccess,
  AuthSession,
  StaffMfaChallenge,
  StaffMfaCompletion,
} from "@rahal/contracts";
import QRCode from "qrcode";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { ExperienceMotion } from "./experience-motion";
import { Footer, Header, Icon } from "./public-home";

type Stage = "loading" | "mfa" | "recovery" | "password" | "complete" | "expired";

const copy = {
  ar: {
    eyebrow: "RAHAL / مركز أمان الفريق",
    title: "وصول محمي قبل بداية العمل.",
    intro:
      "خطوة أمان إلزامية لحسابات المبيعات والإدارة. كلمة المرور وحدها لا تفتح بيانات العملاء أو الطلبات.",
    facts: ["رمز يتغير كل 30 ثانية", "أكواد استرجاع لمرة واحدة", "لا نعرض أسرار الحساب في السجلات"],
    loading: "جاري تجهيز مساحة الأمان…",
    enrollKicker: "إعداد تطبيق المصادقة",
    verifyKicker: "تأكيد هويتك",
    enrollTitle: "اربط حسابك بتطبيق المصادقة.",
    verifyTitle: "أدخل رمز الأمان للمتابعة.",
    enrollCopy:
      "امسح الرمز بتطبيق Google Authenticator أو Microsoft Authenticator أو أي تطبيق TOTP موثوق، ثم أدخل الكود الظاهر.",
    verifyCopy: "استخدم الكود الحالي من تطبيق المصادقة. يمكنك استخدام كود استرجاع عند الضرورة.",
    account: "الحساب المحمي",
    scan: "امسح الرمز",
    manual: "أو أدخل المفتاح يدويًا",
    copySecret: "نسخ المفتاح",
    copied: "تم النسخ",
    code: "رمز الأمان",
    codeHint: "6 أرقام من التطبيق",
    recoveryHint: "أو RAHAL-XXXX-XXXX-XXXX",
    confirm: "تأكيد وتأمين الحساب",
    checking: "جاري التحقق…",
    expires: "تنتهي هذه الخطوة خلال",
    minute: "د",
    expiredTitle: "انتهت جلسة التأمين.",
    expiredCopy: "سجّل الدخول مرة أخرى لإنشاء خطوة أمان جديدة.",
    signIn: "العودة لتسجيل الدخول",
    recoveryKicker: "شبكة الأمان",
    recoveryTitle: "احتفظ بأكواد الاسترجاع الآن.",
    recoveryCopy:
      "كل كود يعمل مرة واحدة فقط. لن نظهر هذه الأكواد مرة أخرى، فاحفظها خارج الجهاز الذي تستخدم عليه تطبيق المصادقة.",
    copyAll: "نسخ كل الأكواد",
    download: "تنزيل ملف آمن",
    savedCheck: "أكد أنني حفظت الأكواد في مكان آمن",
    continue: "متابعة",
    passwordKicker: "آخر خطوة",
    passwordTitle: "غيّر كلمة المرور المؤقتة.",
    passwordCopy:
      "أنشئ كلمة مرور خاصة بك لا تقل عن 8 أحرف. بعد حفظها سيتم إغلاق أي جلسات أخرى للحساب.",
    currentPassword: "كلمة المرور المؤقتة الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور الجديدة",
    savePassword: "حفظ كلمة المرور والدخول",
    saving: "جاري الحفظ…",
    mismatch: "تأكيد كلمة المرور غير مطابق.",
    completeKicker: "تم التأمين",
    completeTitle: "حساب الفريق جاهز.",
    completeCopy: "تم تفعيل المصادقة المتعددة وأصبح الوصول لمساحة العمل محميًا.",
    workspace: "دخول مساحة العمل",
    genericError: "تعذر إكمال خطوة الأمان. حاول مرة أخرى.",
  },
  en: {
    eyebrow: "RAHAL / TEAM SECURITY CENTER",
    title: "Protected access before work begins.",
    intro:
      "A mandatory security step for sales and administration. A password alone never unlocks customer data or requests.",
    facts: [
      "A code that changes every 30 seconds",
      "Single-use recovery codes",
      "Account secrets never appear in logs",
    ],
    loading: "Preparing your security workspace…",
    enrollKicker: "SET UP AUTHENTICATOR",
    verifyKicker: "VERIFY YOUR IDENTITY",
    enrollTitle: "Connect your authenticator app.",
    verifyTitle: "Enter a security code to continue.",
    enrollCopy:
      "Scan with Google Authenticator, Microsoft Authenticator, or another trusted TOTP app, then enter the code it shows.",
    verifyCopy:
      "Use the current code from your authenticator. A recovery code also works when needed.",
    account: "Protected account",
    scan: "Scan the code",
    manual: "Or enter this setup key",
    copySecret: "Copy setup key",
    copied: "Copied",
    code: "Security code",
    codeHint: "6 digits from the app",
    recoveryHint: "or RAHAL-XXXX-XXXX-XXXX",
    confirm: "Verify and secure account",
    checking: "Checking…",
    expires: "This step expires in",
    minute: "m",
    expiredTitle: "This security session expired.",
    expiredCopy: "Sign in again to create a fresh security step.",
    signIn: "Back to sign in",
    recoveryKicker: "YOUR SAFETY NET",
    recoveryTitle: "Save your recovery codes now.",
    recoveryCopy:
      "Each code works once. They will not be shown again, so keep them away from the device holding your authenticator app.",
    copyAll: "Copy all codes",
    download: "Download secure file",
    savedCheck: "I confirm these codes are stored safely",
    continue: "Continue",
    passwordKicker: "FINAL STEP",
    passwordTitle: "Replace the temporary password.",
    passwordCopy:
      "Create your own password with at least 8 characters. Other account sessions will close when it is saved.",
    currentPassword: "Current temporary password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    savePassword: "Save password and enter",
    saving: "Saving…",
    mismatch: "The password confirmation does not match.",
    completeKicker: "SECURED",
    completeTitle: "Your team account is ready.",
    completeCopy: "Multi-factor authentication is active and workspace access is now protected.",
    workspace: "Enter workspace",
    genericError: "The security step could not be completed. Please try again.",
  },
} as const;

export function StaffSecurityOnboarding({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [stage, setStage] = useState<Stage>("loading");
  const [challenge, setChallenge] = useState<StaffMfaChallenge | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [qrData, setQrData] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const workspaceHref = useMemo(() => {
    const path = session?.user.role === "SALES" ? "/sales" : "/admin";
    return localizedPath(locale, path);
  }, [locale, session]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/auth/staff-mfa/challenge", { credentials: "include" }),
      fetch("/api/auth/session", { credentials: "include" }),
    ])
      .then(async ([challengeResponse, sessionResponse]) => {
        const challengePayload = challengeResponse.ok
          ? ((await challengeResponse.json()) as ApiSuccess<StaffMfaChallenge>).data
          : null;
        const sessionPayload = sessionResponse.ok
          ? ((await sessionResponse.json()) as ApiSuccess<AuthSession>).data
          : null;
        if (!active) return;
        if (challengePayload) {
          setChallenge(challengePayload);
          setStage("mfa");
          return;
        }
        if (sessionPayload) {
          if (sessionPayload.user.securityAction === "ENROLL_MFA") {
            await fetch("/api/auth/session", {
              method: "DELETE",
              credentials: "include",
            });
            if (active) setStage("expired");
            return;
          }
          setSession(sessionPayload);
          setStage(
            sessionPayload.user.securityAction === "CHANGE_TEMPORARY_PASSWORD"
              ? "password"
              : "complete",
          );
          return;
        }
        setStage("expired");
      })
      .catch(() => {
        if (active) setStage("expired");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const uri = challenge?.enrollment?.otpAuthUri;
    if (!uri) {
      setQrData("");
      return;
    }
    let active = true;
    void QRCode.toDataURL(uri, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 340,
      color: { dark: "#171713", light: "#f7f2e8" },
    }).then((value) => {
      if (active) setQrData(value);
    });
    return () => {
      active = false;
    };
  }, [challenge]);

  useEffect(() => {
    if (!challenge) return;
    function updateCountdown() {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(challenge!.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
      if (remaining === 0) setStage("expired");
    }
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  async function confirmMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/staff-mfa/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as {
        data?: StaffMfaCompletion;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        if (response.status === 401 || response.status === 429) setStage("expired");
        setError(payload.error?.message || text.genericError);
        return;
      }
      setSession(payload.data.session);
      window.dispatchEvent(new Event("rahal:session-changed"));
      if (payload.data.recoveryCodes?.length) {
        setRecoveryCodes(payload.data.recoveryCodes);
        setStage("recovery");
      } else if (payload.data.session.user.securityAction === "CHANGE_TEMPORARY_PASSWORD") {
        setStage("password");
      } else {
        setStage("complete");
      }
    } catch {
      setError(text.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadRecoveryCodes() {
    const blob = new Blob(
      [
        `RAHAL staff account recovery codes\n\n${recoveryCodes.join("\n")}\n\nEach code can be used once. Store this file securely.`,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "rahal-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(href);
  }

  function continueAfterRecovery() {
    if (!session || !saved) return;
    setStage(session.user.securityAction === "CHANGE_TEMPORARY_PASSWORD" ? "password" : "complete");
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (newPassword !== confirmation) {
      setError(text.mismatch);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password/change", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(payload.error?.message || text.genericError);
        return;
      }
      setSession((current) =>
        current
          ? {
              ...current,
              user: { ...current.user, securityAction: null },
            }
          : current,
      );
      window.dispatchEvent(new Event("rahal:session-changed"));
      setStage("complete");
    } catch {
      setError(text.genericError);
    } finally {
      setBusy(false);
    }
  }

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div
      className="public-site staff-security"
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale === "ar" ? "ar-EG" : "en-EG"}
    >
      <ExperienceMotion />
      <Header
        locale={locale}
        languageHref={localizedPath(locale === "ar" ? "en" : "ar", "/auth/staff-security")}
      />
      <main className="staff-security__stage">
        <aside className="staff-security__story">
          <span className="staff-security__orb staff-security__orb--one" aria-hidden="true" />
          <span className="staff-security__orb staff-security__orb--two" aria-hidden="true" />
          <div>
            <span className="eyebrow">{text.eyebrow}</span>
            <h1>{text.title}</h1>
            <p>{text.intro}</p>
          </div>
          <ol>
            {text.facts.map((fact, index) => (
              <li key={fact}>
                <span>0{index + 1}</span>
                {fact}
              </li>
            ))}
          </ol>
        </aside>

        <section className="staff-security__workspace" aria-live="polite">
          {stage === "loading" ? (
            <div className="staff-security__loading">
              <span />
              <Icon name="shield" size={28} />
              <p>{text.loading}</p>
            </div>
          ) : null}

          {stage === "mfa" && challenge ? (
            <form className="staff-security__panel" onSubmit={confirmMfa}>
              <header>
                <span className="eyebrow">
                  {challenge.action === "ENROLL" ? text.enrollKicker : text.verifyKicker}
                </span>
                <h2>{challenge.action === "ENROLL" ? text.enrollTitle : text.verifyTitle}</h2>
                <p>{challenge.action === "ENROLL" ? text.enrollCopy : text.verifyCopy}</p>
              </header>

              <div className="staff-security__account">
                <span>{text.account}</span>
                <strong dir="ltr">{challenge.account}</strong>
                <i />
              </div>

              {challenge.enrollment ? (
                <div className="staff-security__enrollment">
                  <div className="staff-security__qr">
                    <span>{text.scan}</span>
                    {qrData ? <img alt={text.scan} height="220" src={qrData} width="220" /> : <i />}
                    <b aria-hidden="true">R</b>
                  </div>
                  <div className="staff-security__manual">
                    <span>{text.manual}</span>
                    <code dir="ltr">{challenge.enrollment.secret}</code>
                    <button onClick={() => copyValue(challenge.enrollment!.secret)} type="button">
                      {copied ? text.copied : text.copySecret}
                    </button>
                  </div>
                </div>
              ) : null}

              <label className="staff-security__code">
                <span>{text.code}</span>
                <input
                  autoComplete="one-time-code"
                  autoFocus
                  dir="ltr"
                  inputMode={code.toUpperCase().startsWith("RAHAL") ? "text" : "numeric"}
                  maxLength={22}
                  name="code"
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder={challenge.action === "VERIFY" ? text.recoveryHint : text.codeHint}
                  required
                  value={code}
                />
              </label>
              <div className="staff-security__timer">
                <span>{text.expires}</span>
                <strong dir="ltr">{countdown}</strong>
                <i style={{ "--security-progress": secondsLeft / 300 } as CSSProperties} />
              </div>
              {error ? (
                <p className="staff-security__error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="staff-security__primary" disabled={busy} type="submit">
                {busy ? text.checking : text.confirm}
                <Icon name="arrow" size={18} />
              </button>
            </form>
          ) : null}

          {stage === "recovery" ? (
            <div className="staff-security__panel staff-security__recovery">
              <header>
                <span className="eyebrow">{text.recoveryKicker}</span>
                <h2>{text.recoveryTitle}</h2>
                <p>{text.recoveryCopy}</p>
              </header>
              <div className="staff-security__codes" dir="ltr">
                {recoveryCodes.map((recoveryCode, index) => (
                  <code key={recoveryCode}>
                    <span>0{index + 1}</span>
                    {recoveryCode}
                  </code>
                ))}
              </div>
              <div className="staff-security__secondary-actions">
                <button onClick={() => copyValue(recoveryCodes.join("\n"))} type="button">
                  {copied ? text.copied : text.copyAll}
                </button>
                <button onClick={downloadRecoveryCodes} type="button">
                  {text.download}
                </button>
              </div>
              <label className="staff-security__saved">
                <input
                  checked={saved}
                  onChange={(event) => setSaved(event.target.checked)}
                  type="checkbox"
                />
                <span>{text.savedCheck}</span>
              </label>
              <button
                className="staff-security__primary"
                disabled={!saved}
                onClick={continueAfterRecovery}
                type="button"
              >
                {text.continue}
                <Icon name="arrow" size={18} />
              </button>
            </div>
          ) : null}

          {stage === "password" ? (
            <form className="staff-security__panel" onSubmit={changePassword}>
              <header>
                <span className="eyebrow">{text.passwordKicker}</span>
                <h2>{text.passwordTitle}</h2>
                <p>{text.passwordCopy}</p>
              </header>
              <div className="staff-security__password-grid">
                <label>
                  <span>{text.currentPassword}</span>
                  <input
                    autoComplete="current-password"
                    maxLength={128}
                    name="currentPassword"
                    required
                    type="password"
                  />
                </label>
                <label>
                  <span>{text.newPassword}</span>
                  <input
                    autoComplete="new-password"
                    maxLength={128}
                    minLength={8}
                    name="newPassword"
                    required
                    type="password"
                  />
                </label>
                <label>
                  <span>{text.confirmPassword}</span>
                  <input
                    autoComplete="new-password"
                    maxLength={128}
                    minLength={8}
                    name="confirmation"
                    required
                    type="password"
                  />
                </label>
              </div>
              {error ? (
                <p className="staff-security__error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="staff-security__primary" disabled={busy} type="submit">
                {busy ? text.saving : text.savePassword}
                <Icon name="arrow" size={18} />
              </button>
            </form>
          ) : null}

          {stage === "complete" ? (
            <div className="staff-security__panel staff-security__complete">
              <span className="staff-security__complete-mark">
                <Icon name="shield" size={40} />
              </span>
              <header>
                <span className="eyebrow">{text.completeKicker}</span>
                <h2>{text.completeTitle}</h2>
                <p>{text.completeCopy}</p>
              </header>
              <a className="staff-security__primary" href={workspaceHref}>
                {text.workspace}
                <Icon name="arrow" size={18} />
              </a>
            </div>
          ) : null}

          {stage === "expired" ? (
            <div className="staff-security__panel staff-security__expired">
              <span>00</span>
              <header>
                <h2>{text.expiredTitle}</h2>
                <p>{text.expiredCopy}</p>
              </header>
              <a className="staff-security__primary" href={localizedPath(locale, "/auth")}>
                {text.signIn}
                <Icon name="arrow" size={18} />
              </a>
            </div>
          ) : null}
        </section>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
