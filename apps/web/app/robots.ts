import type { MetadataRoute } from "next";

const publicWebUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://rahal-eg.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account/",
        "/admin/",
        "/api/",
        "/auth/",
        "/en/account/",
        "/en/admin/",
        "/en/auth/",
        "/en/reservation",
        "/en/sales/",
        "/reservation",
        "/sales/",
      ],
    },
    sitemap: `${publicWebUrl}/sitemap.xml`,
    host: publicWebUrl,
  };
}
