import type { MetadataRoute } from "next";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/** Lets customers "Add to Home screen" on Android with the right name and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Wholesale agro inputs`,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
