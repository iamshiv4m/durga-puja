import type { Metadata } from "next";
import { STORIES } from "@/content/chapters";
import { STYLES, type PaintingStyle } from "@/lib/styles";

/**
 * Absolute origin for canonical URLs and link-preview images.
 * A blank NEXT_PUBLIC_SITE_URL is ignored (`??` would keep it, and `new URL("")` crashes the build).
 * On Vercel, the production domain is used when the public URL is unset.
 */
function siteOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return undefined;
  }
}

export const SITE_URL =
  siteOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
  siteOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  siteOrigin(process.env.VERCEL_URL) ??
  "http://localhost:3000";

export const SITE = {
  name: "Trinayanī",
  title: "Trinayanī — the eyes of Durga",
  description:
    "Scroll through the five days of Durga Puja: watch her eyes painted on Mahalaya, hear the dhak at Sandhi Puja, and follow her to the river at Bisarjan.",
  shareText: "The five days of Durga Puja, from Chokkhu Daan to Bisarjan. Scroll, with sound on.",
  keywords: [
    "Durga Puja",
    "Durga Pujo",
    "দুর্গাপূজা",
    "Mahalaya",
    "Chokkhu Daan",
    "Bodhon",
    "Sandhi Puja",
    "Mahishasuramardini",
    "Sindoor Khela",
    "Bisarjan",
    "dhak",
    "Kolkata",
    "Bengal",
    "Devi Mahatmya",
    "Navratri",
    "Garba",
    "Garbo",
    "Dandiya",
    "Mata ni Pachedi",
    "Madhubani",
    "Mithila",
    "Bihar Durga Puja",
    "Gujarat Navratri",
  ],
};

export const SHARE_ALT: Record<PaintingStyle, string> = {
  bengal: "A Bengali Durga pratima with a shola crown, surrounded by a ring of ten golden astras and a row of clay diyas.",
  madhubani:
    "Durga painted in the Madhubani style of Bihar, with double black outlines, a lotus halo, and a ring of ten golden astras.",
  pachedi:
    "Durga on a Mata ni Pachedi shrine cloth in red, black and white, with devotees, peacocks and garbo pots, and a ring of golden astras.",
};

/** Title, canonical URL and link preview for one region's page. */
export function pageMetadata(style: PaintingStyle): Metadata {
  const { title, path } = STYLES[style];
  const description = STORIES[style].share + " Scroll, with sound on.";
  const image = { url: `/share/og-${style}.jpg`, width: 1200, height: 630, alt: SHARE_ALT[style], type: "image/jpeg" };
  return {
    title: { absolute: title },
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE.name,
      title,
      description,
      locale: "en_IN",
      alternateLocale: ["bn_IN", "hi_IN", "gu_IN"],
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
