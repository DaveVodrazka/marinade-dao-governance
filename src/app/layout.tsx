import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Marinade Governance", template: "%s · Marinade Governance" },
  description: "Explore proposals, discussions and on-chain actions governing Marinade.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line bg-surface/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-white">M</span>
              <span>
                Marinade <span className="hidden text-muted sm:inline">Governance</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="rounded-md px-3 py-1.5 text-muted hover:text-fg">
                About
              </Link>
              <Link href="/recent" className="rounded-md px-3 py-1.5 text-muted hover:text-fg">
                Recent
              </Link>
              <Link href="/governance" className="rounded-md px-3 py-1.5 text-muted hover:text-fg">
                Proposals
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-subtle sm:px-6">
            <p>Read-only. Governance state is read directly from Solana mainnet; discussions from the Marinade Forum.</p>
            <a href="https://forum.marinade.finance" target="_blank" rel="noopener noreferrer" className="hover:text-fg">
              forum.marinade.finance ↗
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
