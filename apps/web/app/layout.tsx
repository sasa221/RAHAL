import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAHAL | رحال لتأجير السيارات",
  description: "استعرض سيارات رحال، تحقق من المواعيد، وأرسل طلب الحجز.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
