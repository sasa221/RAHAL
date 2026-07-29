import type { PublicLocale } from "./public-content";

export type PushSetupErrorCode =
  "BLOCKED" | "INSTALL_REQUIRED" | "NOT_CONFIGURED" | "REGISTRATION_FAILED" | "UNSUPPORTED";

export class PushSetupError extends Error {
  constructor(readonly code: PushSetupErrorCode) {
    super(code);
    this.name = "PushSetupError";
  }
}

export function supportsWebPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function isStandaloneWebApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function isIosDevice() {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

export function requiresIosInstallation() {
  return isIosDevice() && !isStandaloneWebApp();
}

export async function currentPushSubscription() {
  if (!supportsWebPush()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function enablePushNotifications(locale: PublicLocale) {
  if (requiresIosInstallation()) throw new PushSetupError("INSTALL_REQUIRED");
  if (!supportsWebPush()) throw new PushSetupError("UNSUPPORTED");

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== "granted") throw new PushSetupError("BLOCKED");

  const keyResponse = await fetch("/api/notifications/push-key", {
    credentials: "include",
    cache: "no-store",
  });
  const keyPayload = (await keyResponse.json().catch(() => null)) as {
    data?: { publicKey?: string | null };
  } | null;
  const publicKey = keyPayload?.data?.publicKey;
  if (!keyResponse.ok || !publicKey) throw new PushSetupError("NOT_CONFIGURED");

  try {
    const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(publicKey),
      }));
    const serialized = subscription.toJSON();
    const response = await fetch("/api/notifications/push-subscriptions", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: serialized.endpoint,
        p256dh: serialized.keys?.p256dh,
        auth: serialized.keys?.auth,
      }),
    });
    if (!response.ok) throw new PushSetupError("REGISTRATION_FAILED");

    await registration.showNotification(
      locale === "ar" ? "إشعارات رحال جاهزة" : "Rahal alerts are ready",
      {
        body:
          locale === "ar"
            ? "ستظهر تحديثات الطلب والحجز هنا حتى عندما يكون الموقع في الخلفية."
            : "Request and reservation updates will appear here, even while Rahal is in the background.",
        icon: "/images/rahal-logo.png",
        badge: "/images/rahal-logo.png",
        data: { url: locale === "ar" ? "/account/requests" : "/en/account/requests" },
        tag: "rahal-push-ready",
      },
    );
    window.dispatchEvent(new CustomEvent("rahal:push-state-changed", { detail: "enabled" }));
    return subscription;
  } catch (error) {
    if (error instanceof PushSetupError) throw error;
    throw new PushSetupError("REGISTRATION_FAILED");
  }
}

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}
