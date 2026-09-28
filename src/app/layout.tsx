import type { Metadata, Viewport } from "next";
import {
  Cormorant,
  Cormorant_SC,
  Noto_Serif_Gujarati,
  Noto_Serif_Gurmukhi,
  Noto_Serif_Malayalam,
  Noto_Serif_Tamil,
  Tiro_Bangla,
  Tiro_Devanagari_Sanskrit,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE, SITE_URL } from "@/lib/site";
import "./globals.css";

const serif = Cormorant({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const smallCaps = Cormorant_SC({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  variable: "--font-sc",
});

const bangla = Tiro_Bangla({
  subsets: ["bengali"],
  weight: "400",
  variable: "--font-bangla",
});

const deva = Tiro_Devanagari_Sanskrit({
  subsets: ["devanagari"],
  weight: "400",
  variable: "--font-deva",
});

const gujarati = Noto_Serif_Gujarati({
  subsets: ["gujarati"],
  weight: "400",
  variable: "--font-gujarati",
});

// Only the festival pages in these scripts use them, so they are not preloaded everywhere.
const gurmukhi = Noto_Serif_Gurmukhi({
  subsets: ["gurmukhi"],
  weight: "400",
  variable: "--font-gurmukhi",
  preload: false,
});

const tamil = Noto_Serif_Tamil({
  subsets: ["tamil"],
  weight: "400",
  variable: "--font-tamil",
  preload: false,
});

const malayalam = Noto_Serif_Malayalam({
  subsets: ["malayalam"],
  weight: "400",
  variable: "--font-malayalam",
  preload: false,
});

// Each page adds its own title, canonical URL and link preview (see `pageMetadata`).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  category: "culture",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  appleWebApp: { title: SITE.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#070304",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${smallCaps.variable} ${bangla.variable} ${deva.variable} ${gujarati.variable} ${gurmukhi.variable} ${tamil.variable} ${malayalam.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
