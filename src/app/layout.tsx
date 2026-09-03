import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/SiteHeader";
import { THEME_SCRIPT } from "@/components/ThemeToggle";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Ledger — crypto market & portfolio tracker",
    template: "%s · Ledger",
  },
  description:
    "Live cryptocurrency prices, charts and a personal portfolio tracker with cost basis and profit/loss.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The stored theme is applied by the script below before paint; without
      // this, React warns about the attribute it did not render.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-plane">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-edge px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <p>
              Market data by{" "}
              <a
                href="https://www.coingecko.com"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2 hover:text-ink-2"
              >
                CoinGecko
              </a>
              . Not financial advice.
            </p>
            <p>Prices cached briefly — refresh for the latest.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
