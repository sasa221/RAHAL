"use client";

import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "../lib/api-error";
import { localizedPath, type PublicLocale } from "../lib/public-content";

const copy = {
  ar: {
    eyebrow: "استعادة آمنة",
    title: "ارجع لحسابك بخطوتين.",
    intro:
      "أدخل بريدك أو رقم هاتفك. إذا كان الحساب موجودًا، سنرسل رمزًا إلى البريد المسجل بدون كشف وجود الحساب.",
    identifier: "البريد الإلكتروني أو رقم الهاتف",
    send: "إرسال رمز الاستعادة",
    code: "رمز الاستعادة من 6 أرقام",
    codeHint: "اكتب الكود الذي وصلك على البريد المسجل — ليس كود تطبيق Authenticator.",
    staffMfaHint:
      "بعد تغيير كلمة المرور، حسابات الأدمن والمبيعات ستطلب كود Authenticator أو أحد أكواد الاسترجاع عند تسجيل الدخول.",
    password: "كلمة المرور الجديدة",
    confirm: "تأكيد كلمة المرور",
    reset: "تعيين كلمة المرور الجديدة",
    sent: "إذا كانت البيانات مرتبطة بحساب، تم إرسال رمز إلى البريد المسجل. الرمز صالح لمدة 10 دقائق.",
    completed: "تم تغيير كلمة المرور وإنهاء كل الجلسات السابقة.",
    signIn: "العودة لتسجيل الدخول",
    resend: "طلب رمز جديد",
    working: "جارٍ التأمين...",
    mismatch: "تأكيد كلمة المرور غير مطابق.",
    failed: "الرمز غير صحيح أو منتهي، أو تعذر إتمام العملية.",
    tooManyAttempts: "تم تجاوز عدد المحاولات. اطلب كود بريد جديد وانتظر وصول أحدث رسالة.",
    privacy: "نستخدم نفس الرد سواء كان الحساب موجودًا أم لا لحماية خصوصيتك.",
  },
  en: {
    eyebrow: "SECURE RECOVERY",
    title: "Return to your account in two steps.",
    intro:
      "Enter your email or phone. If the account exists, we will send a code to its registered email without revealing account existence.",
    identifier: "Email address or phone number",
    send: "Send recovery code",
    code: "Six-digit recovery code",
    codeHint: "Enter the code sent to the registered email — not an Authenticator app code.",
    staffMfaHint:
      "After the password changes, admin and sales accounts will request an Authenticator or Rahal recovery code during sign-in.",
    password: "New password",
    confirm: "Confirm new password",
    reset: "Set new password",
    sent: "If those details belong to an account, a code was sent to its registered email. It expires in 10 minutes.",
    completed: "Password changed and every previous session was ended.",
    signIn: "Return to sign in",
    resend: "Request another code",
    working: "Securing...",
    mismatch: "The password confirmation does not match.",
    failed: "The code is invalid or expired, or the action could not be completed.",
    tooManyAttempts: "Too many attempts. Request a new email code and use the newest message.",
    privacy: "The same response is used whether or not an account exists to protect your privacy.",
  },
} as const;

export function PasswordRecovery({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [step, setStep] = useState<"REQUEST" | "CONFIRM" | "DONE">("REQUEST");
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      if (!response.ok) throw new Error("REQUEST_FAILED");
      setStep("CONFIRM");
      setNotice(text.sent);
    } catch {
      setNotice(text.failed);
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== String(data.get("confirmPassword") ?? "")) {
      setNotice(text.mismatch);
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          code: String(data.get("code") ?? ""),
          newPassword,
        }),
      });
      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        const message = apiErrorMessage(payload, text.failed);
        throw new Error(response.status === 429 ? text.tooManyAttempts : message);
      }
      setStep("DONE");
      setNotice(text.completed);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : text.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="password-recovery" dir={locale === "ar" ? "rtl" : "ltr"}>
      <a className="password-recovery__brand" href={localizedPath(locale)}>
        RAHAL <span>| رحال</span>
      </a>
      <section>
        <div className="password-recovery__story">
          <span>{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
          <div aria-hidden="true">
            <i>01</i>
            <b />
            <i>02</i>
          </div>
        </div>
        <div className="password-recovery__form">
          {step === "REQUEST" ? (
            <form onSubmit={requestCode}>
              <label>
                <span>{text.identifier}</span>
                <input
                  autoComplete="username"
                  maxLength={254}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  type="text"
                  value={identifier}
                />
              </label>
              <button disabled={busy} type="submit">
                {busy ? text.working : text.send}
              </button>
              <small>{text.privacy}</small>
            </form>
          ) : null}
          {step === "CONFIRM" ? (
            <form onSubmit={confirmReset}>
              <label>
                <span>{text.code}</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  minLength={6}
                  name="code"
                  pattern="[0-9]{6}"
                  required
                />
                <small>{text.codeHint}</small>
              </label>
              <label>
                <span>{text.password}</span>
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
                <span>{text.confirm}</span>
                <input
                  autoComplete="new-password"
                  maxLength={128}
                  minLength={8}
                  name="confirmPassword"
                  required
                  type="password"
                />
              </label>
              <button disabled={busy} type="submit">
                {busy ? text.working : text.reset}
              </button>
              <p className="password-recovery__mfa-hint">{text.staffMfaHint}</p>
              <button
                className="is-secondary"
                onClick={() => {
                  setStep("REQUEST");
                  setNotice("");
                }}
                type="button"
              >
                {text.resend}
              </button>
            </form>
          ) : null}
          {notice ? <p className="password-recovery__notice">{notice}</p> : null}
          {step === "DONE" ? (
            <a className="password-recovery__signin" href={localizedPath(locale, "/auth")}>
              {text.signIn}
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
