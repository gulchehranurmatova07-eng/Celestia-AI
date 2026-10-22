// Official WEB-CREATORS contact channels. Only verified details live here —
// the assistant and the UI must never invent other contact information.
export const CONTACT = {
  email: "webcreatorsjackdaniel@gmail.com",
  telegramHandle: "webcreators10",
  telegramUrl: "https://t.me/webcreators10",
  phone: "+998 90 042 49 94",
  phoneHref: "tel:+998900424994",
  instagramHandle: "webcreators_official",
  instagramUrl: "https://www.instagram.com/webcreators_official",
  website: "https://www.webcreatorsuz.com",
} as const;

export const BRAND = {
  company: "WEB-CREATORS",
  product: "Celestia AI",
  tagline: "We Build Websites. You Grow Your Business.",
  motto: "Building Tomorrow’s Digital Success, Today.",
  founded: 2026,
  founders: ["JackDaniel", "DonAsadMoriarty"],
} as const;

// Portfolio link: the "Our projects" section of the main WEB-CREATORS website.
export const PORTFOLIO_URL = process.env.NEXT_PUBLIC_PORTFOLIO_URL?.trim() || `${CONTACT.website}/#restaurants-work`;
