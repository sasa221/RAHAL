"use client";

import type { ApiSuccess, InAppNotification, NotificationInbox } from "@rahal/contracts";
import { useCallback, useEffect, useState } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";

const copy = {
  ar: {
    label: "الإشعارات",
    title: "آخر التحديثات",
    unread: "غير مقروء",
    markAll: "تعليم الكل كمقروء",
    empty: "لا توجد إشعارات حتى الآن.",
    loading: "جاري تحميل الإشعارات…",
    error: "تعذر تحديث الإشعارات الآن.",
    close: "إغلاق",
    important: "مهم",
  },
  en: {
    label: "Notifications",
    title: "Latest updates",
    unread: "Unread",
    markAll: "Mark all as read",
    empty: "No notifications yet.",
    loading: "Loading notifications…",
    error: "Notifications could not be refreshed.",
    close: "Close",
    important: "Important",
  },
} as const;

export function NotificationCenter({
  kind,
  locale,
}: {
  kind: "customer" | "sales";
  locale: PublicLocale;
}) {
  const text = copy[locale];
  const [inbox, setInbox] = useState<NotificationInbox | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      if (response.status === 401) return;
      const payload = (await response.json()) as ApiSuccess<NotificationInbox>;
      if (!response.ok) throw new Error("NOTIFICATIONS_UNAVAILABLE");
      setInbox(payload.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

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

  async function markRead(notification: InAppNotification) {
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
      const base = localizedPath(locale, kind === "sales" ? "/sales" : "/account/requests");
      window.location.assign(`${base}?request=${encodeURIComponent(notification.target.id)}`);
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

  return (
    <div className="notification-center">
      <button
        aria-expanded={open}
        aria-label={text.label}
        className="notification-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
        {inbox?.unreadCount ? (
          <span aria-label={`${inbox.unreadCount} ${text.unread}`}>
            {inbox.unreadCount > 99 ? "99+" : inbox.unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            aria-label={text.close}
            className="notification-backdrop"
            onClick={() => setOpen(false)}
            type="button"
          />
          <aside className="notification-drawer" aria-label={text.label}>
            <header>
              <div>
                <span>{text.label}</span>
                <h2>{text.title}</h2>
              </div>
              <button onClick={() => setOpen(false)} type="button">
                ×
              </button>
            </header>
            <div className="notification-drawer__tools">
              <strong>
                {inbox?.unreadCount ?? 0} {text.unread}
              </strong>
              <button
                disabled={markingAll || !inbox?.unreadCount}
                onClick={() => void markAllRead()}
                type="button"
              >
                {text.markAll}
              </button>
            </div>
            {error ? <p className="notification-error">{text.error}</p> : null}
            {loading ? <p className="notification-state">{text.loading}</p> : null}
            {!loading && !inbox?.items.length ? (
              <p className="notification-state">{text.empty}</p>
            ) : null}
            <ol className="notification-list">
              {inbox?.items.map((notification) => (
                <li
                  className={`${notification.readAt ? "is-read" : "is-unread"}${notification.important ? " is-important" : ""}`}
                  key={notification.id}
                >
                  <button onClick={() => void markRead(notification)} type="button">
                    <span>
                      {notification.important ? <b>{text.important}</b> : null}
                      <time dateTime={notification.createdAt}>
                        {formatNotificationDate(notification.createdAt, locale)}
                      </time>
                    </span>
                    <strong>{notification.title}</strong>
                    <p>{notification.body}</p>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        </>
      ) : null}
    </div>
  );
}

function formatNotificationDate(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
