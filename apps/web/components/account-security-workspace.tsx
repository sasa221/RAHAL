"use client";

import type {
  AccountSecurityOverview,
  ApiSuccess,
  AuthSession,
  PasswordChangeResult,
  SessionRevocationResult,
} from "@rahal/contracts";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import { WorkspaceShell } from "./workspace-shell";

const copy = {
  ar: {
    eyebrow: "أمان حسابك",
    title: "أنت المتحكم في كل جلسة.",
    intro: "غيّر كلمة المرور، راجع الأجهزة التي دخلت إلى حسابك، وأنهِ أي جلسة لا تعرفها فورًا.",
    passwordTitle: "تغيير كلمة المرور",
    passwordCopy: "سيتم إنهاء كل الجلسات الأخرى تلقائيًا بعد التغيير.",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور الجديدة",
    passwordHint: "من 8 إلى 128 حرفًا، ومختلفة عن كلمة المرور الحالية.",
    changePassword: "تغيير كلمة المرور بأمان",
    sessionsTitle: "الجلسات النشطة",
    sessionsCopy: "لا نعرض عنوان IP الخام أو رمز الجلسة في أي وقت.",
    thisDevice: "هذا الجهاز",
    lastSeen: "آخر نشاط",
    started: "بدأت",
    expires: "تنتهي",
    revoke: "إنهاء الجلسة",
    revokeOthers: "إنهاء كل الجلسات الأخرى",
    loading: "جارٍ مراجعة أمان الحساب...",
    unauthorized: "سجّل الدخول أولًا للوصول إلى إعدادات الأمان.",
    signIn: "تسجيل الدخول",
    saving: "جارٍ التأمين...",
    changed: "تم تغيير كلمة المرور وإنهاء الجلسات الأخرى.",
    revoked: "تم إنهاء الجلسة المحددة.",
    othersRevoked: "تم إنهاء كل الجلسات الأخرى.",
    mismatch: "تأكيد كلمة المرور غير مطابق.",
    failed: "تعذر إتمام العملية. راجع كلمة المرور أو حاول مجددًا.",
    noSessions: "لا توجد جلسات نشطة.",
    securityNote:
      "إذا رأيت جهازًا لا تعرفه، أنهِ الجلسة ثم غيّر كلمة المرور مباشرة. لا تشارك رمز الاستعادة مع أي شخص.",
  },
  en: {
    eyebrow: "ACCOUNT SECURITY",
    title: "You control every session.",
    intro:
      "Change your password, review devices that accessed your account, and end anything you do not recognize immediately.",
    passwordTitle: "Change password",
    passwordCopy: "Every other active session will be revoked automatically after the change.",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    passwordHint: "8–128 characters and different from your current password.",
    changePassword: "Change password securely",
    sessionsTitle: "Active sessions",
    sessionsCopy: "Raw IP addresses and session tokens are never displayed.",
    thisDevice: "This device",
    lastSeen: "Last active",
    started: "Started",
    expires: "Expires",
    revoke: "End session",
    revokeOthers: "End all other sessions",
    loading: "Reviewing account security...",
    unauthorized: "Sign in first to access account security.",
    signIn: "Sign in",
    saving: "Securing...",
    changed: "Password changed and all other sessions were ended.",
    revoked: "The selected session was ended.",
    othersRevoked: "All other sessions were ended.",
    mismatch: "The password confirmation does not match.",
    failed: "The action could not be completed. Check the password or try again.",
    noSessions: "No active sessions.",
    securityNote:
      "If you do not recognize a device, end its session and change your password immediately. Never share a recovery code.",
  },
} as const;

type ShellKind = "customer" | "sales" | "admin";

export function AccountSecurityWorkspace({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [session, setSession] = useState<AuthSession | null>(null);
  const [overview, setOverview] = useState<AccountSecurityOverview | null>(null);
  const [state, setState] = useState<"LOADING" | "READY" | "UNAUTHORIZED" | "ERROR">("LOADING");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const [sessionResponse, securityResponse] = await Promise.all([
        fetch("/api/auth/session", { credentials: "include", cache: "no-store" }),
        fetch("/api/auth/security", { credentials: "include", cache: "no-store" }),
      ]);
      if (sessionResponse.status === 401 || securityResponse.status === 401) {
        setState("UNAUTHORIZED");
        return;
      }
      if (!sessionResponse.ok || !securityResponse.ok) throw new Error("SECURITY_UNAVAILABLE");
      const sessionPayload = (await sessionResponse.json()) as ApiSuccess<AuthSession>;
      const securityPayload =
        (await securityResponse.json()) as ApiSuccess<AccountSecurityOverview>;
      setSession(sessionPayload.data);
      setOverview(securityPayload.data);
      setState("READY");
    } catch {
      setState("ERROR");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kind: ShellKind =
    session?.user.role === "CUSTOMER"
      ? "customer"
      : session?.user.role === "ADMIN" || session?.user.role === "SUPER_ADMIN"
        ? "admin"
        : "sales";

  async function changePassword(event: FormEvent<HTMLFormElement>) {
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
      const response = await fetch("/api/auth/password/change", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: String(data.get("currentPassword") ?? ""),
          newPassword,
        }),
      });
      const payload = (await response.json()) as ApiSuccess<PasswordChangeResult>;
      if (!response.ok || !payload.data?.passwordChanged) throw new Error("CHANGE_FAILED");
      event.currentTarget.reset();
      setNotice(text.changed);
      await load();
    } catch {
      setNotice(text.failed);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(path: string, success: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(path, { method: "DELETE", credentials: "include" });
      const payload = (await response.json()) as ApiSuccess<SessionRevocationResult>;
      if (!response.ok) throw new Error("REVOKE_FAILED");
      if (payload.data.currentSessionRevoked) {
        window.location.assign(localizedPath(locale, "/auth"));
        return;
      }
      setNotice(success);
      await load();
    } catch {
      setNotice(text.failed);
    } finally {
      setBusy(false);
    }
  }

  if (state === "LOADING") {
    return <div className="account-security-standalone">{text.loading}</div>;
  }

  if (state === "UNAUTHORIZED" || state === "ERROR" || !session) {
    return (
      <div className="account-security-standalone">
        <span>RAHAL | رحال</span>
        <h1>{state === "UNAUTHORIZED" ? text.unauthorized : text.failed}</h1>
        <a href={localizedPath(locale, "/auth")}>{text.signIn}</a>
      </div>
    );
  }

  return (
    <WorkspaceShell activePage="security" kind={kind} locale={locale}>
      <section className="account-security">
        <header className="account-security__hero">
          <span>{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </header>

        {notice ? <p className="account-security__notice">{notice}</p> : null}

        <div className="account-security__layout">
          <article className="password-change-card">
            <header>
              <i>01</i>
              <div>
                <h2>{text.passwordTitle}</h2>
                <p>{text.passwordCopy}</p>
              </div>
            </header>
            <form onSubmit={changePassword}>
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
                  name="confirmPassword"
                  required
                  type="password"
                />
                <small>{text.passwordHint}</small>
              </label>
              <button disabled={busy} type="submit">
                {busy ? text.saving : text.changePassword}
              </button>
            </form>
          </article>

          <article className="session-control-card">
            <header>
              <i>02</i>
              <div>
                <h2>{text.sessionsTitle}</h2>
                <p>{text.sessionsCopy}</p>
              </div>
              <button
                disabled={busy || (overview?.sessions.length ?? 0) < 2}
                onClick={() =>
                  void revoke("/api/auth/security/sessions/others", text.othersRevoked)
                }
                type="button"
              >
                {text.revokeOthers}
              </button>
            </header>
            <div className="account-session-list">
              {overview?.sessions.map((item) => (
                <article className={item.current ? "is-current" : ""} key={item.id}>
                  <i aria-hidden="true">
                    <DeviceIcon mobile={item.deviceLabel === "Mobile"} />
                  </i>
                  <div>
                    <strong>{item.deviceLabel}</strong>
                    <span>{item.browserLabel}</span>
                    {item.current ? <b>{text.thisDevice}</b> : null}
                  </div>
                  <dl>
                    <div>
                      <dt>{text.lastSeen}</dt>
                      <dd>{formatDate(item.lastSeenAt, locale)}</dd>
                    </div>
                    <div>
                      <dt>{text.started}</dt>
                      <dd>{formatDate(item.createdAt, locale)}</dd>
                    </div>
                  </dl>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void revoke(
                        `/api/auth/security/sessions/${encodeURIComponent(item.id)}`,
                        text.revoked,
                      )
                    }
                    type="button"
                  >
                    {text.revoke}
                  </button>
                </article>
              ))}
              {!overview?.sessions.length ? <p>{text.noSessions}</p> : null}
            </div>
          </article>
        </div>

        <aside className="account-security__note">
          <span>SECURITY NOTE</span>
          <p>{text.securityNote}</p>
        </aside>
      </section>
    </WorkspaceShell>
  );
}

function formatDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DeviceIcon({ mobile }: { mobile: boolean }) {
  return mobile ? (
    <svg fill="none" viewBox="0 0 24 24">
      <rect height="19" rx="2" stroke="currentColor" strokeWidth="1.6" width="12" x="6" y="2.5" />
      <path d="M10 19.5h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg fill="none" viewBox="0 0 24 24">
      <rect height="13" rx="2" stroke="currentColor" strokeWidth="1.6" width="19" x="2.5" y="3" />
      <path
        d="M8 21h8M10 16v5m4-5v5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
