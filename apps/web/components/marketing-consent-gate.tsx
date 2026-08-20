"use client";

import type { ApiSuccess, AuthSession, CustomerAccountOverview } from "@rahal/contracts";
import { useCallback, useEffect, useState } from "react";
import type { PublicLocale } from "../lib/public-content";

type GateState = "ERROR" | "HIDDEN" | "LOADING" | "PROMPT" | "SAVING" | "SAVED";

const copy = {
  ar: {
    eyebrow: "RAHAL FIRST",
    title: "خليك أول واحد يعرف.",
    body: "وافق على تحديثات رحال الاختيارية لتصلك السيارات الجديدة والعروض الحقيقية فور نزولها. لن نرسل رسائل عشوائية، ويمكنك تغيير اختيارك في أي وقت.",
    featureOne: "سيارات جديدة قبل ما المواعيد تتملي",
    featureTwo: "عروض وخصومات رحال فقط",
    featureThree: "تحكم كامل من إعدادات حسابك",
    accept: "أيوه، ابعتولي العروض",
    decline: "لا شكرًا",
    saving: "جارٍ حفظ اختيارك...",
    accepted: "تمام، هتكون أول واحد يعرف الجديد.",
    declined: "تم احترام اختيارك. تقدر تغيّره لاحقًا من حسابك.",
    failed: "تعذر حفظ اختيارك الآن. حاول مرة أخرى.",
    retry: "إعادة المحاولة",
  },
  en: {
    eyebrow: "RAHAL FIRST",
    title: "Be the first to know.",
    body: "Opt in to optional Rahal updates for newly available vehicles and genuine offers. No random messages, and you can change your choice anytime.",
    featureOne: "New vehicles before dates fill up",
    featureTwo: "Rahal offers and discounts only",
    featureThree: "Full control from account settings",
    accept: "Yes, keep me updated",
    decline: "No thanks",
    saving: "Saving your choice...",
    accepted: "Done. You will be among the first to know.",
    declined: "Your choice is saved. You can change it later in your account.",
    failed: "Your choice could not be saved. Please try again.",
    retry: "Try again",
  },
} as const;

export function MarketingConsentGate({ locale }: { locale: PublicLocale }) {
  const text = copy[locale];
  const [state, setState] = useState<GateState>("LOADING");
  const [overview, setOverview] = useState<CustomerAccountOverview | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<boolean | null>(null);

  const releasePushGate = useCallback((allowPushPrompt: boolean) => {
    window.dispatchEvent(
      new CustomEvent("rahal:marketing-gate-ready", { detail: { allowPushPrompt } }),
    );
  }, []);

  const check = useCallback(async () => {
    setState("LOADING");
    try {
      const sessionResponse = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      if (!sessionResponse.ok) {
        setState("HIDDEN");
        releasePushGate(false);
        return;
      }
      const sessionPayload = (await sessionResponse.json()) as ApiSuccess<AuthSession>;
      if (sessionPayload.data.user.role !== "CUSTOMER") {
        setState("HIDDEN");
        releasePushGate(true);
        return;
      }
      const accountResponse = await fetch("/api/account", {
        credentials: "include",
        cache: "no-store",
      });
      if (!accountResponse.ok) throw new Error("ACCOUNT_UNAVAILABLE");
      const accountPayload = (await accountResponse.json()) as ApiSuccess<CustomerAccountOverview>;
      setOverview(accountPayload.data);
      const decided = accountPayload.data.notifications.marketingConsentDecided;
      setState(decided ? "HIDDEN" : "PROMPT");
      releasePushGate(decided);
    } catch {
      setState("HIDDEN");
      releasePushGate(false);
    }
  }, [releasePushGate]);

  useEffect(() => {
    void check();
    const sessionChanged = () => void check();
    window.addEventListener("rahal:session-changed", sessionChanged);
    return () => window.removeEventListener("rahal:session-changed", sessionChanged);
  }, [check]);

  async function decide(marketingEnabled: boolean) {
    if (!overview) return;
    setPendingDecision(marketingEnabled);
    setState("SAVING");
    try {
      const preferences = overview.notifications;
      const response = await fetch("/api/account/notifications", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled: preferences.emailEnabled,
          whatsappEnabled: preferences.whatsappEnabled,
          pushEnabled: preferences.pushEnabled,
          marketingEnabled,
          quietHoursStart: preferences.quietHoursStart,
          quietHoursEnd: preferences.quietHoursEnd,
        }),
      });
      if (!response.ok) throw new Error("CONSENT_SAVE_FAILED");
      const payload = (await response.json()) as ApiSuccess<CustomerAccountOverview>;
      setOverview(payload.data);
      setAccepted(marketingEnabled);
      setState("SAVED");
      window.dispatchEvent(new Event("rahal:marketing-consent-changed"));
      window.setTimeout(() => setState("HIDDEN"), 3_500);
    } catch {
      setState("ERROR");
    }
  }

  if (state === "HIDDEN" || state === "LOADING") return null;

  if (state === "SAVED") {
    return (
      <div
        aria-live="polite"
        className="marketing-consent-saved"
        dir={locale === "ar" ? "rtl" : "ltr"}
        role="status"
      >
        <span aria-hidden="true">✓</span>
        {accepted ? text.accepted : text.declined}
      </div>
    );
  }

  return (
    <aside
      aria-labelledby="marketing-consent-title"
      className="marketing-consent-card"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <div className="marketing-consent-signal" aria-hidden="true">
        <i />
        <span>R</span>
        <b>FIRST</b>
      </div>
      <div className="marketing-consent-copy">
        <small>{text.eyebrow}</small>
        <h2 id="marketing-consent-title">{text.title}</h2>
        <p>{state === "ERROR" ? text.failed : text.body}</p>
        {state !== "ERROR" ? (
          <ul>
            <li>{text.featureOne}</li>
            <li>{text.featureTwo}</li>
            <li>{text.featureThree}</li>
          </ul>
        ) : null}
        <div>
          <button
            disabled={state === "SAVING"}
            onClick={() =>
              state === "ERROR" ? void decide(pendingDecision ?? true) : void decide(true)
            }
            type="button"
          >
            {state === "SAVING" ? text.saving : state === "ERROR" ? text.retry : text.accept}
          </button>
          {state !== "ERROR" ? (
            <button disabled={state === "SAVING"} onClick={() => void decide(false)} type="button">
              {text.decline}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
