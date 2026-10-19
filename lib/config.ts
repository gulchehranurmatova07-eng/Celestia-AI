// Official WEB-CREATORS contact channels. Only verified details live here —
// the assistant and the UI must never invent other contact information.
export const CONTACT = {
  email: "webcreatorsjackdaniel@gmail.com",
  telegramHandle: "webcreators10",
  telegramUrl: "https://t.me/webcreators10",
} as const;

export const BRAND = {
  company: "WEB-CREATORS",
  product: "Celestia AI",
  tagline: "We Build Websites. You Grow Your Business.",
  motto: "Building Tomorrow’s Digital Success, Today.",
  founded: 2026,
  founders: ["JackDaniel", "DonAsadMoriarty"],
} as const;

// Optional public portfolio link. Leave unset until a real page exists.
export const PORTFOLIO_URL = process.env.NEXT_PUBLIC_PORTFOLIO_URL?.trim() || null;
