import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { STYLES, STYLE_ORDER } from "@/lib/styles";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL("/", SITE_URL).toString(), changeFrequency: "monthly", priority: 1 },
    ...STYLE_ORDER.map((style) => ({
      url: new URL(STYLES[style].path, SITE_URL).toString(),
      changeFrequency: "yearly" as const,
      priority: style === "bengal" ? 0.9 : 0.8,
    })),
  ];
}
