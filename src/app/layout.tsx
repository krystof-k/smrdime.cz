import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";

const TITLE = "Smrdíme? Kolik pražských tramvají jede bez klimatizace";
const DESCRIPTION = "Živý přehled, kolik pražských tramvají zrovna jezdí bez klimatizace.";

const OG_IMAGE = {
  url: "/og",
  width: 1200,
  height: 630,
  alt: TITLE,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://smrdime.cz"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
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
