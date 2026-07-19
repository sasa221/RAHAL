import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${manrope.className} ${manrope.variable} ${cormorant.variable} ${alexandria.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
