import type { Metadata } from "next";
import { STORIES } from "@/content/chapters";
import { STYLES, type PaintingStyle } from "@/lib/styles";
import type { JourneyContent } from "@/journeys/types";

/**
 * Absolute origin for canonical URLs and link-preview images.
 * A blank NEXT_PUBLIC_SITE_URL is ignored (`??` would keep it, and `new URL("")` crashes the build).
 * On Vercel, the production domain is used when the public URL is unset.
 */
function siteOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
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

/** Parv, the whole site: one page per festival. */
export const SITE = {
  name: "Parv",
  title: "Parv — the festivals of India, one scroll at a time",
  description:
    "Scroll-driven, hand-painted journeys through India's festivals: Durga Puja, Navratri, Diwali, Chhath, Lohri and Baisakhi, Makar Sankranti, Pongal, Holi, Bihu, Onam, Janmashtami and Ganesh Chaturthi, each a single page with its own music.",
  keywords: [
    "Parv",
    "पर्व",
    "Indian festivals",
    "Hindu festivals",
    "Durga Puja",
    "Diwali",
    "Deepavali",
    "Chhath Puja",
    "Holi",
    "Ganesh Chaturthi",
    "Navratri",
    "Garba",
    "Lohri",
    "Baisakhi",
    "Makar Sankranti",
    "Uttarayan",
    "Pongal",
    "Bihu",
    "Onam",
    "Janmashtami",
  ],
};

/** Trinayanī, the Durga Puja journey at /durga-puja. */
export const DURGA_PUJA = {
  name: "Trinayanī",
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
  bengal:
    "A Bengali Durga pratima with a shola crown, surrounded by a ring of ten golden astras and a row of clay diyas.",
  madhubani:
    "Durga painted in the Madhubani style of Bihar, with double black outlines, a lotus halo, and a ring of ten golden astras.",
  pachedi:
    "Durga on a Mata ni Pachedi shrine cloth in red, black and white, with devotees, peacocks and garbo pots, and a ring of golden astras.",
};

/** Title, canonical URL and link preview for one region's page. */
export function pageMetadata(style: PaintingStyle): Metadata {
  const { title, path } = STYLES[style];
  const description = STORIES[style].share + " Scroll, with sound on.";
  const image = {
    url: `/share/og-${style}.jpg`,
    width: 1200,
    height: 630,
    alt: SHARE_ALT[style],
    type: "image/jpeg",
  };
  return {
    title: { absolute: title },
    keywords: DURGA_PUJA.keywords,
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
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/** Title, canonical URL and link preview for the Parv home page. */
export function homeMetadata(): Metadata {
  const image = {
    url: "/share/og-parv.jpg",
    width: 1200,
    height: 630,
    alt: "Parv: Durga painted in the styles of Bengal, Bihar and Gujarat, beside a list of India's festivals.",
    type: "image/jpeg",
  };
  return {
    title: { absolute: SITE.title },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: SITE.name,
      title: SITE.title,
      description: SITE.description,
      locale: "en_IN",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE.title,
      description: SITE.description,
      images: [image],
    },
  };
}

/** Title, canonical URL and link preview for a festival journey (see src/journeys). */
export function journeyMetadata(content: JourneyContent): Metadata {
  const description = `${content.share} Scroll, with sound on.`;
  const image = {
    url: `/share/og-${content.id}.jpg`,
    width: 1200,
    height: 630,
    alt: `${content.name}: ${content.share}`,
    type: "image/jpeg",
  };
  return {
    title: { absolute: content.pageTitle },
    description: content.description,
    keywords: content.keywords,
    alternates: { canonical: content.path },
    openGraph: {
      type: "website",
      url: content.path,
      siteName: SITE.name,
      title: content.pageTitle,
      description,
      locale: "en_IN",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: content.pageTitle,
      description,
      images: [image],
    },
  };
}
