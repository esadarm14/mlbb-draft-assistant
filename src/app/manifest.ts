import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MLBB Draft Assistant",
    short_name: "MLBB Draft",
    description: "Asisten draft Mobile Legends langsung di browser HP.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0e1a",
    theme_color: "#0a0e1a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
