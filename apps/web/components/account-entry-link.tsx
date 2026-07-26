"use client";

import type { AuthSession } from "@rahal/contracts";
import { useEffect, useState } from "react";
import { localizedPath, type PublicLocale } from "../lib/public-content";

export function AccountEntryLink({
  className,
  locale,
  signInLabel,
}: {
  className?: string;
  locale: PublicLocale;
  signInLabel: string;
}) {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let active = true;
    const loadSession = () => {
      void fetch("/api/auth/session", { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) return null;
          const payload = (await response.json()) as { data?: AuthSession };
          return payload.data ?? null;
        })
        .then((value) => {
          if (active) setSession(value);
        })
        .catch(() => {
          if (active) setSession(null);
        });
    };
    loadSession();
    window.addEventListener("rahal:session-changed", loadSession);
    return () => {
      active = false;
      window.removeEventListener("rahal:session-changed", loadSession);
    };
  }, []);

  const destination = session
    ? localizedPath(locale, session.user.role === "CUSTOMER" ? "/account/requests" : "/sales")
    : localizedPath(locale, "/auth");
  const label = session ? (locale === "ar" ? "حسابي" : "My account") : signInLabel;

  return (
    <a className={className} href={destination}>
      {label}
    </a>
  );
}
