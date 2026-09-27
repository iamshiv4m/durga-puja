import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { STYLES, STYLE_ORDER } from "@/lib/styles";

export default function sitemap(): MetadataRoute.Sitemap {
  return STYLE_ORDER.map((style) => ({
    url: new URL(STYLES[style].path, SITE_URL).toString(),
    changeFrequency: "yearly",
    priority: style === "bengal" ? 1 : 0.8,
  }));
}
