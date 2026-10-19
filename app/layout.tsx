import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin", "latin-ext"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: "Celestia AI — Your Digital Assistant by WEB-CREATORS",
  description:
    "Celestia AI is the multilingual virtual assistant of WEB-CREATORS. Ask anything about websites, services, pricing and your next digital project. We Build Websites. You Grow Your Business.",
  applicationName: "Celestia AI",
  openGraph: {
    title: "Celestia AI — Your Digital Assistant by WEB-CREATORS",
    description: "We Build Websites. You Grow Your Business.",
    type: "website",
  },
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
