import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { VEHICLE_MODES } from "@/lib/vehicle-modes";
import "./globals.css";

// Site-wide defaults (trams own the homepage); the tram and bus pages override
// title, description and og:image per mode via generateMetadata.
export const metadata: Metadata = {
  // Must be the www host: the apex 301-redirects there, and OG scrapers
  // commonly refuse to follow redirects on og:image, showing no card at all.
  metadataBase: new URL("https://www.smrdime.cz"),
  title: VEHICLE_MODES.tram.title,
  description: VEHICLE_MODES.tram.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-white font-sans text-gray-800 antialiased dark:bg-slate-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
