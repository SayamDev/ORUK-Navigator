import type { Metadata, Viewport } from "next";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/newsreader/600.css";
import "./globals.css";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: { default: "ORUK Navigator", template: "%s — ORUK Navigator" }, description: "Find local support that fits your needs." };
export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><body><a className="skip-link" href="#main-content">Skip to main content</a><SiteHeader />{children}<SiteFooter /></body></html>;
}
