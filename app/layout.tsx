import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Sora } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin", "latin-ext"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Celestia AI — Your Digital Assistant by WEB-CREATORS",
  description:
    "Celestia AI is the multilingual virtual assistant of WEB-CREATORS. Ask anything about websites, services, pricing and your next digital project. We Build Websites. You Grow Your Business.",
  applicationName: "Celestia AI",
  keywords: [
    "WEB-CREATORS",
    "Celestia AI",
    "website development",
    "web design",
    "website for business",
    "online store",
    "Uzbekistan",
    "Tashkent",
    "сайт под ключ",
    "veb-sayt yaratish",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Celestia AI — Your Digital Assistant by WEB-CREATORS",
    description: "We Build Websites. You Grow Your Business.",
    url: "/",
    siteName: "WEB-CREATORS · Celestia AI",
    type: "website",
    locale: "en_US",
    alternateLocale: ["ru_RU", "uz_UZ", "tr_TR", "zh_CN"],
  },
  twitter: { card: "summary", title: "Celestia AI by WEB-CREATORS", description: "We Build Websites. You Grow Your Business." },
  robots: { index: true, follow: true },
  // Optional: the code from Google Search Console's "HTML tag" verification method.
  ...(process.env.GOOGLE_SITE_VERIFICATION?.trim()
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION.trim() } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#03050A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
