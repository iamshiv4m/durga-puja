import { STORIES } from "@/content/chapters";
import { DURGA_PUJA, SITE, SITE_URL } from "@/lib/site";
import { STYLES, type PaintingStyle } from "@/lib/styles";
import { Experience } from "./Experience";

export function RegionPage({ style }: { style: PaintingStyle }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: STYLES[style].title,
    url: new URL(STYLES[style].path, SITE_URL).toString(),
    description: STORIES[style].share,
    inLanguage: ["en", "bn", "hi", "gu", "sa"],
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE_URL },
    keywords: DURGA_PUJA.keywords.join(", "),
    about: {
      "@type": "Thing",
      name: style === "pachedi" ? "Navratri" : "Durga Puja",
      alternateName: style === "pachedi" ? ["Navaratri", "નવરાત્રી"] : ["Durga Pujo", "দুর্গাপূজা", "दुर्गा पूजा"],
      sameAs: style === "pachedi" ? "https://en.wikipedia.org/wiki/Navaratri" : "https://en.wikipedia.org/wiki/Durga_Puja",
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Experience initialStyle={style} />
    </>
  );
}
