import { CelestiaApp } from "@/components/CelestiaApp";
import { BRAND, CONTACT } from "@/lib/config";
import { siteUrl } from "@/lib/site";

// Structured data so search engines understand who the site belongs to.
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND.company,
  url: siteUrl(),
  slogan: BRAND.tagline,
  foundingDate: String(BRAND.founded),
  founders: BRAND.founders.map((name) => ({ "@type": "Person", name })),
  email: CONTACT.email,
  sameAs: [CONTACT.telegramUrl],
  description: "Web design and development company building modern, fast and secure websites for businesses.",
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
      <CelestiaApp />
    </>
  );
}
