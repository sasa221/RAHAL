import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RAHAL | رحال",
    short_name: "RAHAL",
    description: "منصة رحال لتأجير السيارات وإدارة طلبات الحجز في مصر.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0e8",
    theme_color: "#1c1d1a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/images/rahal-logo.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/rahal-logo.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
