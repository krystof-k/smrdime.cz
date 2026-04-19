import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";

const TITLE = "Smrdíme? Kolik pražských tramvají jede bez klimatizace";
const DESCRIPTION = "Živý přehled, kolik pražských tramvají zrovna jezdí bez klimatizace.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
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
