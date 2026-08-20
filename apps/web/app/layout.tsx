import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { MarketingConsentGate } from "../components/marketing-consent-gate";
import { PushPermissionGate } from "../components/push-permission-gate";
import "./globals.css";
import "./reports.css";
import "./customers.css";

const manrope = localFont({
  src: "./fonts/manrope-latin.woff2",
  display: "swap",
  weight: "200 800",
  variable: "--font-manrope",
});

const cormorant = localFont({
  src: "./fonts/cormorant-garamond-latin.woff2",
  display: "optional",
  preload: false,
  weight: "300 700",
  variable: "--font-cormorant",
});

const arabicInterface = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-arabic-400.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-sans-arabic-600.woff2", weight: "600" },
  ],
  display: "optional",
  preload: false,
  variable: "--font-ibm-plex-arabic",
});

const publicWebUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://rahal-eg.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const path = requestHeaders.get("x-rahal-path") ?? "/";
  const arabicPath = path === "/en" ? "/" : path.replace(/^\/en(?=\/)/, "") || "/";
  const englishPath = arabicPath === "/" ? "/en" : `/en${arabicPath}`;

  return {
    metadataBase: new URL(publicWebUrl),
    title: "RAHAL | رحال لتأجير السيارات",
    description: "استعرض سيارات رحال، تحقق من المواعيد، وأرسل طلب الحجز.",
    alternates: {
      canonical: path,
      languages: {
        "ar-EG": arabicPath,
        "en-EG": englishPath,
        "x-default": arabicPath,
      },
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "RAHAL",
    },
    icons: {
      icon: "/images/rahal-logo.png",
      apple: "/images/rahal-logo.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#1c1d1a",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-rahal-locale") === "en" ? "en" : "ar";

  return (
    <html lang={locale === "en" ? "en-EG" : "ar-EG"} dir={locale === "en" ? "ltr" : "rtl"}>
      <body
        className={`${manrope.className} ${manrope.variable} ${cormorant.variable} ${arabicInterface.variable}`}
      >
        <PushPermissionGate locale={locale} />
        <MarketingConsentGate locale={locale} />
        {children}
      </body>
    </html>
  );
}
