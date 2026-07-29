import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-admin.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RAHAL Admin",
  },
};

export default function EnglishAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
