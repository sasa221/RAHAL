"use client";

import type { AuthSession } from "@rahal/contracts";
import { useEffect, useState } from "react";
import type { PublicLocale } from "../lib/public-content";
import { NotificationCenter } from "./notification-center";

export function PublicNotificationEntry({ locale }: { locale: PublicLocale }) {
  const [kind, setKind] = useState<"customer" | "sales" | null>(null);

  useEffect(() => {
    let active = true;
    const loadSession = () => {
      void fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) return null;
          const payload = (await response.json()) as { data?: AuthSession };
          return payload.data ?? null;
        })
        .then((session) => {
          if (!active) return;
          setKind(session ? (session.user.role === "CUSTOMER" ? "customer" : "sales") : null);
        })
        .catch(() => {
          if (active) setKind(null);
        });
    };

    loadSession();
    window.addEventListener("rahal:session-changed", loadSession);
    return () => {
      active = false;
      window.removeEventListener("rahal:session-changed", loadSession);
    };
  }, []);

  if (!kind) return null;

  return (
    <div className="public-header-notifications">
      <NotificationCenter kind={kind} locale={locale} />
    </div>
  );
}
