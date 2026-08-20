import type { MetadataRoute } from "next";
import { getPublicVehicles } from "../lib/public-api";

const publicWebUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://rahal-eg.vercel.app";
const publicPages = [
  "",
  "/about",
  "/cars",
  "/contact",
  "/faq",
  "/fleet",
  "/how-it-works",
  "/privacy",
  "/reviews",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await getPublicVehicles();
  const paths = [...publicPages, ...vehicles.map((vehicle) => `/cars/${vehicle.id}`)];
  const lastModified = new Date();

  return paths.flatMap((path) => {
    const arabicUrl = `${publicWebUrl}${path || "/"}`;
    const englishUrl = `${publicWebUrl}/en${path}`;
    const alternates = { languages: { "ar-EG": arabicUrl, "en-EG": englishUrl } };
    return [
      { url: arabicUrl, lastModified, changeFrequency: "weekly" as const, alternates },
      { url: englishUrl, lastModified, changeFrequency: "weekly" as const, alternates },
    ];
  });
}
