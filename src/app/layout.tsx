import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://freshnexus.vercel.app"),
  title: {
    default: "FreshNexus — Grocery Intelligence",
    template: "%s · FreshNexus",
  },
  description:
    "A live, SEO-indexable grocery catalogue powered by Open Food Facts. Explore products, nutrition, and market trends.",
  keywords: [
    "grocery",
    "open food facts",
    "nutrition",
    "food database",
    "market insights",
    "freshnexus",
  ],
  openGraph: {
    type: "website",
    siteName: "FreshNexus",
    title: "FreshNexus — Grocery Intelligence",
    description:
      "Search thousands of products, dig into nutrition facts, and see live market trends.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="border-b border-black/10 bg-cream/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="inline-block h-7 w-7 rounded-md bg-moss relative">
            <span className="absolute inset-[5px] rounded-sm bg-lime" />
          </span>
          <span className="font-serif text-xl tracking-tight">FreshNexus</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-moss">Discover</Link>
          <Link href="/insights" className="hover:text-moss">Market Insights</Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-black/10">
      <div className="max-w-6xl mx-auto px-5 py-8 text-sm text-black/60 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <p>
          Built for the FreshNexus WebApp Challenge. Data from{" "}
          <a className="underline" href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
            Open Food Facts
          </a>
          .
        </p>
        <p>&copy; {new Date().getFullYear()} FreshNexus.</p>
      </div>
    </footer>
  );
}
