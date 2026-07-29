import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-sales.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RAHAL Sales",
  },
};

export default function EnglishSalesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
