"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PublicLocale } from "../lib/public-content";
import { isIosDevice, isStandaloneWebApp } from "../lib/push-notifications";

type WorkspaceAppKind = "admin" | "sales";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const copy = {
  ar: {
    install: "تثبيت التطبيق",
    close: "إغلاق دليل التثبيت",
    eyebrow: "RAHAL WORKSPACE",
    salesTitle: "ثبّت تطبيق مبيعات رحال",
    adminTitle: "ثبّت تطبيق إدارة رحال",
    salesBody: "افتح الطلبات وتنبيهات المراجعة مباشرة من أيقونة مستقلة لفريق المبيعات.",
    adminBody: "افتح مركز التحكم والتنبيهات الإدارية مباشرة من أيقونة مستقلة.",
    iosLabel: "على iPhone أو iPad",
    iosSteps: [
      "اضغط زر المشاركة في المتصفح.",
      "اختر «إضافة إلى الشاشة الرئيسية».",
      "افتح التطبيق من الأيقونة، ثم فعّل الإشعارات داخله.",
    ],
    browserLabel: "على Android أو الكمبيوتر",
    browserSteps: [
      "افتح قائمة المتصفح.",
      "اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».",
      "افتح التطبيق من الأيقونة الجديدة.",
    ],
    understood: "تمام، فهمت",
  },
  en: {
    install: "Install app",
    close: "Close installation guide",
    eyebrow: "RAHAL WORKSPACE",
    salesTitle: "Install the Rahal Sales app",
    adminTitle: "Install the Rahal Admin app",
    salesBody: "Open assigned requests and review alerts directly from a dedicated sales app icon.",
    adminBody:
      "Open the control center and administration alerts directly from a dedicated app icon.",
    iosLabel: "On iPhone or iPad",
    iosSteps: [
      "Open the browser Share menu.",
      "Choose “Add to Home Screen”.",
      "Open the new app icon, then enable notifications inside it.",
    ],
    browserLabel: "On Android or desktop",
    browserSteps: [
      "Open the browser menu.",
      "Choose “Install app” or “Add to Home Screen”.",
      "Open Rahal from its new app icon.",
    ],
    understood: "Got it",
  },
} as const;

export function WorkspaceInstallAction({
  kind,
  locale,
}: {
  kind: WorkspaceAppKind;
  locale: PublicLocale;
}) {
  const text = copy[locale];
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneWebApp());
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/push-sw.js", { scope: "/" }).catch(() => undefined);
    }

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setGuideOpen(false);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  useEffect(() => {
    if (!guideOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGuideOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [guideOpen]);

  if (installed) return null;

  async function install() {
    if (!isIosDevice() && promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setPromptEvent(null);
        return;
      }
    }
    setGuideOpen(true);
  }

  const title = kind === "admin" ? text.adminTitle : text.salesTitle;
  const body = kind === "admin" ? text.adminBody : text.salesBody;
  const ios = isIosDevice();
  const steps = ios ? text.iosSteps : text.browserSteps;

  return (
    <>
      <button
        aria-label={text.install}
        className="workspace-install-trigger"
        onClick={() => void install()}
        type="button"
      >
        <InstallIcon />
        <span>{text.install}</span>
      </button>

      {guideOpen
        ? createPortal(
            <div className="workspace-install-layer" dir={locale === "ar" ? "rtl" : "ltr"}>
              <button
                aria-label={text.close}
                className="workspace-install-backdrop"
                onClick={() => setGuideOpen(false)}
                type="button"
              />
              <section aria-labelledby="workspace-install-title" aria-modal="true" role="dialog">
                <header>
                  <span>{text.eyebrow}</span>
                  <button aria-label={text.close} onClick={() => setGuideOpen(false)} type="button">
                    ×
                  </button>
                </header>
                <div className="workspace-install-mark" aria-hidden="true">
                  <InstallIcon />
                  <b>{kind === "admin" ? "A" : "S"}</b>
                </div>
                <p>{ios ? text.iosLabel : text.browserLabel}</p>
                <h2 id="workspace-install-title">{title}</h2>
                <p>{body}</p>
                <ol>
                  {steps.map((step, index) => (
                    <li key={step}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <button
                  className="workspace-install-understood"
                  onClick={() => setGuideOpen(false)}
                >
                  {text.understood}
                </button>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function InstallIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 18v2h14v-2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
