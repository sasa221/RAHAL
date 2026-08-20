"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import {
  currentPushSubscription,
  enablePushNotifications,
  PushSetupError,
  requiresIosInstallation,
  supportsWebPush,
} from "../lib/push-notifications";

type GateState =
  | "BLOCKED"
  | "CHECKING"
  | "ENABLING"
  | "FAILED"
  | "HIDDEN"
  | "INSTALL_REQUIRED"
  | "PROMPT"
  | "REMINDER"
  | "SUCCESS"
  | "UNSUPPORTED";

const copy = {
  ar: {
    eyebrow: "RAHAL LIVE",
    title: "خليك متابع طلبك لحظة بلحظة",
    body: "فعّل إشعارات رحال لتصلك قرارات المبيعات، طلبات المستندات، وتأكيدات الفرع فورًا على هذا الجهاز.",
    enable: "تفعيل الإشعارات الآن",
    enabling: "جاري ربط هذا الجهاز...",
    later: "ليس الآن",
    reminderTitle: "إشعارات رحال غير مفعّلة",
    reminderBody: "فعّلها حتى لا يفوتك تحديث مهم على طلبك.",
    reminderAction: "تفعيل",
    blockedTitle: "الإشعارات محظورة من المتصفح",
    blockedBody: "افتح إعدادات الموقع في المتصفح، اسمح بالإشعارات، ثم ارجع واضغط «حاول مجددًا».",
    retry: "حاول مجددًا",
    installTitle: "ثبّت رحال على شاشة الموبايل أولًا",
    installBody:
      "على iPhone افتح زر المشاركة، اختر «إضافة إلى الشاشة الرئيسية»، ثم افتح رحال من الأيقونة لتفعيل الإشعارات.",
    understood: "فهمت، ذكّرني داخل الموقع",
    failedTitle: "تعذر ربط الإشعارات الآن",
    failedBody: "سنُبقي التذكير ظاهرًا ويمكنك المحاولة مرة أخرى.",
    unsupportedTitle: "المتصفح الحالي لا يدعم إشعارات الجهاز",
    unsupportedBody:
      "ستظل تحديثات رحال الجديدة ظاهرة بوضوح أعلى الموقع وخارج درج الإشعارات. استخدم Chrome أو Safari المثبّت على الشاشة الرئيسية لتفعيل إشعارات الجهاز.",
    success: "تم تفعيل إشعارات رحال على هذا الجهاز.",
    featureOne: "تحديثات الطلب فورًا",
    featureTwo: "تنبيه واضح خارج درج الموقع",
    featureThree: "يمكنك تغيير التفضيلات لاحقًا",
  },
  en: {
    eyebrow: "RAHAL LIVE",
    title: "Stay with your request at every step",
    body: "Enable Rahal alerts for sales decisions, document requests, and branch confirmations on this device.",
    enable: "Enable notifications",
    enabling: "Linking this device...",
    later: "Not now",
    reminderTitle: "Rahal notifications are off",
    reminderBody: "Turn them on so you do not miss an important request update.",
    reminderAction: "Enable",
    blockedTitle: "Notifications are blocked by your browser",
    blockedBody:
      "Open this site's browser settings, allow notifications, then return and choose “Try again”.",
    retry: "Try again",
    installTitle: "Install Rahal on your phone first",
    installBody:
      "On iPhone, open Share, choose “Add to Home Screen”, then open Rahal from its icon to enable notifications.",
    understood: "Got it, remind me in Rahal",
    failedTitle: "Notifications could not be linked",
    failedBody: "The reminder will stay visible so you can try again.",
    unsupportedTitle: "This browser does not support device notifications",
    unsupportedBody:
      "New Rahal updates will still appear clearly above the site and outside the inbox. Use Chrome, or an installed Safari web app, for device notifications.",
    success: "Rahal notifications are now enabled on this device.",
    featureOne: "Immediate request updates",
    featureTwo: "Visible alerts outside the inbox",
    featureThree: "Preferences stay under your control",
  },
} as const;

const decisionKey = "rahal:push-consent-decision";

export function PushPermissionGate({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [state, setState] = useState<GateState>("CHECKING");

  const checkSession = useCallback(async (freshLogin = false) => {
    let response: Response;
    try {
      response = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      setState("HIDDEN");
      return;
    }
    if (!response.ok) {
      setState("HIDDEN");
      return;
    }
    if (requiresIosInstallation()) {
      setState("INSTALL_REQUIRED");
      return;
    }
    if (!supportsWebPush()) {
      setState("UNSUPPORTED");
      return;
    }
    try {
      if (await currentPushSubscription()) {
        sessionStorage.setItem(decisionKey, "enabled");
        setState("HIDDEN");
        return;
      }
      if (freshLogin) sessionStorage.removeItem(decisionKey);
      setState(sessionStorage.getItem(decisionKey) === "deferred" ? "REMINDER" : "PROMPT");
    } catch {
      setState("FAILED");
    }
  }, []);

  useEffect(() => {
    const sessionChanged = () => setState("HIDDEN");
    const marketingChanged = () => void checkSession(true);
    const marketingReady = (event: Event) => {
      const ready = event as CustomEvent<{ allowPushPrompt: boolean }>;
      if (ready.detail.allowPushPrompt) void checkSession(true);
      else setState("HIDDEN");
    };
    const pushChanged = () => setState("HIDDEN");
    const guideRequested = () =>
      setState(requiresIosInstallation() ? "INSTALL_REQUIRED" : "PROMPT");
    window.addEventListener("rahal:session-changed", sessionChanged);
    window.addEventListener("rahal:marketing-gate-ready", marketingReady);
    window.addEventListener("rahal:marketing-consent-changed", marketingChanged);
    window.addEventListener("rahal:push-state-changed", pushChanged);
    window.addEventListener("rahal:push-guide-requested", guideRequested);
    return () => {
      window.removeEventListener("rahal:session-changed", sessionChanged);
      window.removeEventListener("rahal:marketing-gate-ready", marketingReady);
      window.removeEventListener("rahal:marketing-consent-changed", marketingChanged);
      window.removeEventListener("rahal:push-state-changed", pushChanged);
      window.removeEventListener("rahal:push-guide-requested", guideRequested);
    };
  }, [checkSession]);

  useEffect(() => {
    if (
      !["BLOCKED", "ENABLING", "FAILED", "INSTALL_REQUIRED", "PROMPT", "UNSUPPORTED"].includes(
        state,
      )
    )
      return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [state]);

  async function enable() {
    if (requiresIosInstallation()) {
      setState("INSTALL_REQUIRED");
      return;
    }
    setState("ENABLING");
    try {
      await enablePushNotifications(locale);
      sessionStorage.setItem(decisionKey, "enabled");
      setState("SUCCESS");
      window.setTimeout(() => setState("HIDDEN"), 4_500);
    } catch (error) {
      setState(
        error instanceof PushSetupError
          ? error.code === "BLOCKED"
            ? "BLOCKED"
            : error.code === "INSTALL_REQUIRED"
              ? "INSTALL_REQUIRED"
              : error.code === "UNSUPPORTED"
                ? "UNSUPPORTED"
                : "FAILED"
          : "FAILED",
      );
    }
  }

  function defer() {
    sessionStorage.setItem(decisionKey, "deferred");
    setState("REMINDER");
  }

  if (state === "CHECKING" || state === "HIDDEN") return null;

  if (state === "REMINDER") {
    return (
      <aside
        aria-live="polite"
        className="push-consent-reminder"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <span aria-hidden="true">
          <BellIcon />
        </span>
        <div>
          <strong>{text.reminderTitle}</strong>
          <p>{text.reminderBody}</p>
        </div>
        <button onClick={() => void enable()} type="button">
          {text.reminderAction}
        </button>
      </aside>
    );
  }

  if (state === "SUCCESS") {
    return (
      <div
        aria-live="polite"
        className="push-consent-success"
        dir={locale === "ar" ? "rtl" : "ltr"}
        role="status"
      >
        <span aria-hidden="true">✓</span>
        {text.success}
      </div>
    );
  }

  const blocked = state === "BLOCKED";
  const installRequired = state === "INSTALL_REQUIRED";
  const failed = state === "FAILED";
  const unsupported = state === "UNSUPPORTED";

  return (
    <div className="push-consent-layer" dir={locale === "ar" ? "rtl" : "ltr"}>
      <span aria-hidden="true" className="push-consent-backdrop" />
      <section aria-labelledby="push-consent-title" aria-modal="true" role="dialog">
        <div className="push-consent-visual">
          <span className="push-consent-orbit" aria-hidden="true" />
          <span className="push-consent-bell" aria-hidden="true">
            <BellIcon />
          </span>
          <b>{text.eyebrow}</b>
          <small>01 · LIVE REQUEST SIGNAL</small>
        </div>
        <div className="push-consent-content">
          <span>{text.eyebrow}</span>
          <h2 id="push-consent-title">
            {blocked
              ? text.blockedTitle
              : installRequired
                ? text.installTitle
                : unsupported
                  ? text.unsupportedTitle
                  : failed
                    ? text.failedTitle
                    : text.title}
          </h2>
          <p>
            {blocked
              ? text.blockedBody
              : installRequired
                ? text.installBody
                : unsupported
                  ? text.unsupportedBody
                  : failed
                    ? text.failedBody
                    : text.body}
          </p>
          {!blocked && !installRequired && !failed && !unsupported ? (
            <ul>
              <li>
                <i aria-hidden="true">01</i>
                {text.featureOne}
              </li>
              <li>
                <i aria-hidden="true">02</i>
                {text.featureTwo}
              </li>
              <li>
                <i aria-hidden="true">03</i>
                {text.featureThree}
              </li>
            </ul>
          ) : null}
          {installRequired ? (
            <ol className="push-install-steps">
              <li>
                <i aria-hidden="true">01</i>
                {locale === "ar" ? "اضغط زر المشاركة في المتصفح." : "Open the browser Share menu."}
              </li>
              <li>
                <i aria-hidden="true">02</i>
                {locale === "ar"
                  ? "اختر «إضافة إلى الشاشة الرئيسية»."
                  : "Choose “Add to Home Screen”."}
              </li>
              <li>
                <i aria-hidden="true">03</i>
                {locale === "ar"
                  ? "افتح رحال من الأيقونة، ثم فعّل الإشعارات داخله."
                  : "Open Rahal from its icon, then enable notifications inside the app."}
              </li>
            </ol>
          ) : null}
          <div className="push-consent-actions">
            {!installRequired && !unsupported ? (
              <button disabled={state === "ENABLING"} onClick={() => void enable()} type="button">
                <BellIcon />
                {state === "ENABLING"
                  ? text.enabling
                  : blocked || failed
                    ? text.retry
                    : text.enable}
              </button>
            ) : null}
            <button onClick={defer} type="button">
              {installRequired || unsupported ? text.understood : text.later}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function BellIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
