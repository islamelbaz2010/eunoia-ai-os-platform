import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eunoia AI OS",
    short_name: "Eunoia",
    description: "AI Operating System for Hotels, Resorts & Hospitality Groups",
    start_url: "/",
    display: "standalone",
    background_color: "#08090d",
    theme_color: "#6366f1",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
