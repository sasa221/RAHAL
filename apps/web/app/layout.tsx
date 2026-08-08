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
  display: "swap",
  weight: "300 700",
  variable: "--font-cormorant",
});

const alexandria = localFont({
  src: "./fonts/alexandria-arabic.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-alexandria",
});

export const metadata: Metadata = {
  title: "RAHAL | رحال لتأجير السيارات",
  description: "استعرض سيارات رحال، تحقق من المواعيد، وأرسل طلب الحجز.",
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

export const viewport: Viewport = {
  themeColor: "#1c1d1a",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-rahal-locale") === "en" ? "en" : "ar";

  return (
    <html lang={locale === "en" ? "en-EG" : "ar-EG"} dir={locale === "en" ? "ltr" : "rtl"}>
      <body
        className={`${manrope.className} ${manrope.variable} ${cormorant.variable} ${alexandria.variable}`}
      >
        <PushPermissionGate locale={locale} />
        <MarketingConsentGate locale={locale} />
        {children}
      </body>
    </html>
  );
}
