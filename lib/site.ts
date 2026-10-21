// Canonical public address of the site, used for SEO (sitemap, robots, canonical
// links). Prefers an explicit NEXT_PUBLIC_SITE_URL, then Vercel's production
// domain (which becomes your custom domain once one is added), then the default.
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "https://celestia-ai-theta.vercel.app";
}
