"use client";

import type { ApiSuccess, InAppNotification, NotificationInbox } from "@rahal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { localizedPath, type PublicLocale } from "../lib/public-content";
import {
  currentPushSubscription,
  enablePushNotifications,
  PushSetupError,
  requiresIosInstallation,
  supportsWebPush,
} from "../lib/push-notifications";

type InboxFilter = "ALL" | "UNREAD" | "IMPORTANT";

const copy = {
  ar: {
    label: "الإشعارات",
    signal: "RAHAL SIGNAL",
    title: "كل تحديث في مكان واضح",
    subtitle: "تحديثات الطلبات وإجراءات الفرع التي تهمك الآن.",
    unread: "جديد",
    importantCount: "مهم",
    total: "الإجمالي",
    markAll: "تعليم الكل كمقروء",
    all: "الكل",
    unreadOnly: "الجديدة",
    importantOnly: "المهمة",
    empty: "لا توجد إشعارات حتى الآن.",
    emptyFiltered: "لا توجد تحديثات في هذا القسم.",
    loading: "جاري تجهيز مركز الإشعارات…",
    error: "تعذر تحديث الإشعارات الآن.",
    retry: "إعادة المحاولة",
    close: "إغلاق مركز الإشعارات",
    important: "أولوية",
    openUpdate: "فتح التحديث المرتبط",
    live: "متصل",
    enablePush: "تفعيل تنبيهات المتصفح",
    enablingPush: "جارٍ التفعيل...",
    pushEnabled: "تنبيهات المتصفح مفعّلة",
    pushUnavailable: "تعذر تفعيل تنبيهات المتصفح على هذا الجهاز.",
    newSignal: "تحديث جديد من رحال",
    dismissPreview: "إخفاء معاينة الإشعار",
  },
  en: {
    label: "Notifications",
    signal: "RAHAL SIGNAL",
    title: "Every update, clearly in view",
    subtitle: "Request and branch updates that matter right now.",
    unread: "New",
    importantCount: "Priority",
    total: "Total",
    markAll: "Mark all as read",
    all: "All",
    unreadOnly: "New",
    importantOnly: "Priority",
    empty: "No notifications yet.",
    emptyFiltered: "There are no updates in this view.",
    loading: "Preparing your notification center…",
    error: "Notifications could not be refreshed.",
    retry: "Try again",
    close: "Close notification center",
    important: "Priority",
    openUpdate: "Open linked update",
    live: "Live",
    enablePush: "Enable browser alerts",
    enablingPush: "Enabling alerts...",
    pushEnabled: "Browser alerts enabled",
    pushUnavailable: "Browser alerts could not be enabled on this device.",
    newSignal: "New Rahal update",
    dismissPreview: "Dismiss notification preview",
  },
} as const;

export function NotificationCenter({
  kind,
  locale,
}: {
  kind: "customer" | "sales" | "admin";
  locale: PublicLocale;
}) {
  const text = copy[locale];
  const [inbox, setInbox] = useState<NotificationInbox | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [pushState, setPushState] = useState<"IDLE" | "ENABLING" | "ENABLED" | "FAILED">("IDLE");
  const [featuredNotification, setFeaturedNotification] = useState<InAppNotification | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const response = await fetch(`/api/notifications?locale=${locale}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401) return;
        const payload = (await response.json()) as ApiSuccess<NotificationInbox>;
        if (!response.ok) throw new Error("NOTIFICATIONS_UNAVAILABLE");
        setInbox(payload.data);
        const latestUnread = payload.data.items.find((item) => !item.readAt);
        if (latestUnread) {
          const previewKey = `rahal:notification-preview:${latestUnread.id}`;
          if (!sessionStorage.getItem(previewKey)) {
            sessionStorage.setItem(previewKey, "shown");
            setFeaturedNotification(latestUnread);
          }
        }
        setError(false);
      } catch {
        setError(true);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [load, open]);

  useEffect(() => {
    if (!supportsWebPush()) return;
    const syncPushState = () => {
      void currentPushSubscription()
        .then((subscription) => {
          if (subscription) setPushState("ENABLED");
        })
        .catch(() => undefined);
    };
    syncPushState();
    window.addEventListener("rahal:push-state-changed", syncPushState);
    return () => window.removeEventListener("rahal:push-state-changed", syncPushState);
  }, []);

  const filteredItems = useMemo(
    () =>
      (inbox?.items ?? []).filter((item) => {
        if (filter === "UNREAD") return !item.readAt;
        if (filter === "IMPORTANT") return item.important;
        return true;
      }),
    [filter, inbox],
  );
  const importantCount = inbox?.items.filter((item) => item.important).length ?? 0;

  async function markRead(notification: InAppNotification) {
    setFeaturedNotification((current) => (current?.id === notification.id ? null : current));
    if (!notification.readAt) {
      const now = new Date().toISOString();
      setInbox((current) =>
        current
          ? {
              unreadCount: Math.max(0, current.unreadCount - 1),
              items: current.items.map((item) =>
                item.id === notification.id ? { ...item, readAt: now } : item,
              ),
            }
          : current,
      );
      await fetch(`/api/notifications/${encodeURIComponent(notification.id)}/read`, {
        method: "POST",
        credentials: "include",
      }).catch(() => undefined);
    }
    if (notification.target?.kind === "RESERVATION") {
      const base = localizedPath(
        locale,
        kind === "admin" ? "/admin/requests" : kind === "sales" ? "/sales" : "/account/requests",
      );
      window.location.assign(`${base}?request=${encodeURIComponent(notification.target.id)}`);
    } else if (notification.target?.kind === "URL") {
      window.location.assign(localizedPath(locale, notification.target.path));
    }
  }

  async function markAllRead() {
    if (!inbox?.unreadCount) return;
    setMarkingAll(true);
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("MARK_ALL_FAILED");
      const now = new Date().toISOString();
      setInbox((current) =>
        current
          ? {
              unreadCount: 0,
              items: current.items.map((item) => ({ ...item, readAt: item.readAt ?? now })),
            }
          : current,
      );
    } catch {
      setError(true);
    } finally {
      setMarkingAll(false);
    }
  }

  async function enablePush() {
    if (requiresIosInstallation()) {
      setOpen(false);
      window.dispatchEvent(new Event("rahal:push-guide-requested"));
      return;
    }
    if (!supportsWebPush()) {
      setPushState("FAILED");
      return;
    }
    setPushState("ENABLING");
    try {
      await enablePushNotifications(locale);
      setPushState("ENABLED");
    } catch (error) {
      if (error instanceof PushSetupError && error.code === "INSTALL_REQUIRED") {
        setOpen(false);
        window.dispatchEvent(new Event("rahal:push-guide-requested"));
      } else {
        setPushState("FAILED");
      }
    }
  }

  return (
    <div className="notification-center">
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={text.label}
        className={`notification-trigger${inbox?.unreadCount ? " has-unread" : ""}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="notification-trigger__icon">
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path
              d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        </span>
        <span className="notification-trigger__label">{text.label}</span>
        {inbox?.unreadCount ? (
          <b aria-label={`${inbox.unreadCount} ${text.unread}`}>
            {inbox.unreadCount > 99 ? "99+" : inbox.unreadCount}
          </b>
        ) : null}
      </button>

      {featuredNotification
        ? createPortal(
            <aside
              aria-label={text.newSignal}
              aria-live="polite"
              className={`notification-preview is-${notificationTone(featuredNotification.eventKey)}`}
              dir={locale === "ar" ? "rtl" : "ltr"}
            >
              <button
                aria-label={text.dismissPreview}
                className="notification-preview__close"
                onClick={() => setFeaturedNotification(null)}
                type="button"
              >
                ×
              </button>
              <button
                className="notification-preview__content"
                onClick={() => void markRead(featuredNotification)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`notification-event-icon notification-event-icon--${notificationTone(featuredNotification.eventKey)}`}
                >
                  {notificationGlyph(featuredNotification.eventKey)}
                </span>
                <span>
                  <small>{text.newSignal}</small>
                  <strong>{featuredNotification.title}</strong>
                  <p>{featuredNotification.body}</p>
                </span>
              </button>
            </aside>,
            document.body,
          )
        : null}

      {open
        ? createPortal(
            <div className="notification-layer" dir={locale === "ar" ? "rtl" : "ltr"}>
              <button
                aria-label={text.close}
                className="notification-backdrop"
                onClick={() => setOpen(false)}
                type="button"
              />
              <aside
                aria-label={text.label}
                aria-modal="true"
                className="notification-drawer"
                role="dialog"
              >
                <header className="notification-drawer__header">
                  <div className="notification-drawer__signal">
                    <span>{text.signal}</span>
                    <b>
                      <i aria-hidden="true" />
                      {text.live}
                    </b>
                  </div>
                  <div className="notification-drawer__heading">
                    <div>
                      <h2>{text.title}</h2>
                      <p>{text.subtitle}</p>
                    </div>
                    <button aria-label={text.close} onClick={() => setOpen(false)} type="button">
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                  <div className="notification-drawer__metrics">
                    <article>
                      <strong>{String(inbox?.unreadCount ?? 0).padStart(2, "0")}</strong>
                      <span>{text.unread}</span>
                    </article>
                    <article>
                      <strong>{String(importantCount).padStart(2, "0")}</strong>
                      <span>{text.importantCount}</span>
                    </article>
                    <article>
                      <strong>{String(inbox?.items.length ?? 0).padStart(2, "0")}</strong>
                      <span>{text.total}</span>
                    </article>
                  </div>
                </header>

                <div className="notification-drawer__tools">
                  <div aria-label={text.label} className="notification-filters" role="tablist">
                    {(["ALL", "UNREAD", "IMPORTANT"] as const).map((value) => (
                      <button
                        aria-selected={filter === value}
                        key={value}
                        onClick={() => setFilter(value)}
                        role="tab"
                        type="button"
                      >
                        {value === "ALL"
                          ? text.all
                          : value === "UNREAD"
                            ? text.unreadOnly
                            : text.importantOnly}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={markingAll || !inbox?.unreadCount}
                    onClick={() => void markAllRead()}
                    type="button"
                  >
                    {text.markAll}
                  </button>
                </div>
                <div className={`notification-push-state is-${pushState.toLowerCase()}`}>
                  <span aria-hidden="true">{pushState === "ENABLED" ? "✓" : "↗"}</span>
                  <p>
                    {pushState === "ENABLED"
                      ? text.pushEnabled
                      : pushState === "FAILED"
                        ? text.pushUnavailable
                        : text.enablePush}
                  </p>
                  {pushState !== "ENABLED" ? (
                    <button
                      disabled={pushState === "ENABLING"}
                      onClick={() => void enablePush()}
                      type="button"
                    >
                      {pushState === "ENABLING" ? text.enablingPush : text.enablePush}
                    </button>
                  ) : null}
                </div>

                <div className="notification-drawer__feed">
                  {error ? (
                    <div className="notification-error" role="alert">
                      <p>{text.error}</p>
                      <button onClick={() => void load()} type="button">
                        {text.retry}
                      </button>
                    </div>
                  ) : null}
                  {loading ? (
                    <div aria-label={text.loading} className="notification-skeleton" role="status">
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : null}
                  {!loading && !inbox?.items.length ? (
                    <p className="notification-state">{text.empty}</p>
                  ) : null}
                  {!loading && inbox?.items.length && !filteredItems.length ? (
                    <p className="notification-state">{text.emptyFiltered}</p>
                  ) : null}
                  <ol className="notification-list">
                    {filteredItems.map((notification, index) => (
                      <li
                        className={`${notification.readAt ? "is-read" : "is-unread"}${notification.important ? " is-important" : ""}`}
                        key={notification.id}
                        style={{ "--notification-index": index } as React.CSSProperties}
                      >
                        <button onClick={() => void markRead(notification)} type="button">
                          <span
                            aria-hidden="true"
                            className={`notification-event-icon notification-event-icon--${notificationTone(notification.eventKey)}`}
                          >
                            {notificationGlyph(notification.eventKey)}
                          </span>
                          <span className="notification-item__content">
                            <span className="notification-item__meta">
                              {notification.important ? <b>{text.important}</b> : <i />}
                              <time dateTime={notification.createdAt}>
                                {formatNotificationDate(notification.createdAt, locale)}
                              </time>
                            </span>
                            <strong>{notification.title}</strong>
                            <p>{notification.body}</p>
                            {notification.target ? <small>{text.openUpdate} →</small> : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function notificationTone(eventKey: string) {
  if (eventKey.includes("REJECT") || eventKey.includes("FAILED")) return "alert";
  if (eventKey.includes("APPROV") || eventKey.includes("CONFIRM")) return "success";
  if (eventKey.includes("DOCUMENT") || eventKey.includes("INFORMATION")) return "document";
  if (eventKey.includes("ALTERNATIVE")) return "alternative";
  return "update";
}

function notificationGlyph(eventKey: string) {
  if (eventKey.includes("DOCUMENT") || eventKey.includes("INFORMATION")) return "▤";
  if (eventKey.includes("APPROV") || eventKey.includes("CONFIRM")) return "✓";
  if (eventKey.includes("REJECT") || eventKey.includes("FAILED")) return "!";
  if (eventKey.includes("ALTERNATIVE")) return "↔";
  return "R";
}

function formatNotificationDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
