import { CelestiaApp } from "@/components/CelestiaApp";
import { BRAND, CONTACT } from "@/lib/config";
import { siteUrl } from "@/lib/site";

// Structured data so search engines understand who the site belongs to.
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND.company,
  url: CONTACT.website,
  slogan: BRAND.tagline,
  foundingDate: String(BRAND.founded),
  founders: BRAND.founders.map((name) => ({ "@type": "Person", name })),
  email: CONTACT.email,
  telephone: CONTACT.phone,
  sameAs: [CONTACT.telegramUrl, CONTACT.instagramUrl],
  description: "Web design and development company building modern, fast and secure websites for businesses.",
};

// Suggests "Celestia AI" as the site name Google shows above search results.
const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: BRAND.product,
  alternateName: [`${BRAND.product} by ${BRAND.company}`, "Celestia"],
  url: siteUrl(),
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
      <CelestiaApp />
    </>
  );
}
