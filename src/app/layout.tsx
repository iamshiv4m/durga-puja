import type { Metadata, Viewport } from "next";
import { Cormorant, Cormorant_SC, Noto_Serif_Gujarati, Tiro_Bangla, Tiro_Devanagari_Sanskrit } from "next/font/google";
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
    <html lang="en" className={`${serif.variable} ${smallCaps.variable} ${bangla.variable} ${deva.variable} ${gujarati.variable}`}>
      <body>{children}</body>
    </html>
  );
}
