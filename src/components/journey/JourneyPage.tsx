import { JOURNEYS } from "@/journeys/content";
import type { JourneyId } from "@/journeys/types";
import { SITE, SITE_URL } from "@/lib/site";
import { Journey } from "./Journey";

export function JourneyPage({ id }: { id: JourneyId }) {
  const content = JOURNEYS[id];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: content.pageTitle,
    url: new URL(content.path, SITE_URL).toString(),
    description: content.description,
    inLanguage: ["en", content.lang],
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE_URL },
    keywords: content.keywords.join(", "),
    about: { "@type": "Thing", ...content.about },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Journey content={content} />
    </>
  );
}
