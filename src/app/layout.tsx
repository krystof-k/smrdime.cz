import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "./globals.css";

const TITLE = "Smrdíme? Kolik pražských tramvají jede bez klimatizace";
const DESCRIPTION = "Živý přehled, kolik pražských tramvají zrovna jezdí bez klimatizace.";

// A 30s time bucket busts the og:image URL so a platform re-scraping the page
// pulls a fresh render instead of its cached copy. Matches the /og edge TTL, so
// repeat scrapes within a bucket still hit the cache. Needs the route rendered
// dynamically (see `dynamic` in page.tsx), otherwise the bucket freezes at build.
export function generateMetadata(): Metadata {
  const bucket = Math.floor(Date.now() / 30_000);
  // Dimensions match the 2x-supersampled /og output (1200x630 logical).
  const image = { url: `/og?t=${bucket}`, width: 2400, height: 1260, alt: TITLE };
  return {
    metadataBase: new URL("https://smrdime.cz"),
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      type: "website",
      locale: "cs_CZ",
      title: TITLE,
      description: DESCRIPTION,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: [image],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-white font-sans text-gray-800 antialiased dark:bg-slate-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
