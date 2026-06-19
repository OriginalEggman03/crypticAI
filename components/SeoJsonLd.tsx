import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_NAME_ALT,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site-config";

export function SeoJsonLd() {
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_NAME_ALT,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en-GB",
  };

  const app = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    alternateName: SITE_NAME_ALT,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
    },
    featureList: [
      "British cryptic anagram clue generation",
      "Theme-based inspiration",
      "Clue archive and search",
      "Share clues",
    ],
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: SITE_NAME_ALT,
    url: SITE_URL,
    description: `${SITE_NAME} — ${SITE_TAGLINE}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(app) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
    </>
  );
}
