import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, JetBrains_Mono } from 'next/font/google';
import SideRail from '../components/Shell/SideRail';
import TopBar from '../components/Shell/TopBar';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'eRTMAC-NWIS | Oil India Limited | Nearby Wells Intelligence System',
  description:
    'AI-enabled nearby wells intelligence system for drilling operations in Assam/Brahmaputra Basin. SIH 26121 | Oil India Limited (A Maharatna CPSE).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg-deep text-ink font-sans antialiased selection:bg-accent-wash selection:text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-modal focus:m-3 focus:bg-ink focus:px-3 focus:py-2 focus:text-body focus:font-semibold focus:text-bg-deep"
        >
          Skip to content
        </a>

        <div className="flex min-h-screen">
          {/* Both read the view out of the URL, so they need a Suspense boundary. */}
          <Suspense
            fallback={<div className="hidden lg:block w-60 shrink-0 border-r border-line-soft bg-bg-deep" />}
          >
            <SideRail />
          </Suspense>

          <div className="flex-1 min-w-0 flex flex-col bg-bg">
            {/*
              Mandatory synthetic-data disclosure. Framed as a provenance strip
              rather than a warning banner — it states what the data is, it is
              not an operational alarm competing with the rig's own alerts.
            */}
            <div className="flex items-center gap-2 border-b border-line-soft bg-bg-deep px-4 py-1 text-micro text-ink-3">
              <span className="led bg-warn" aria-hidden="true" />
              <span className="hdr text-warn-ink">Synthetic data</span>
              <span className="text-line" aria-hidden="true">
                |
              </span>
              <span className="truncate">
                Fictional well records &mdash; SIH 2026 demonstration build
              </span>
            </div>

            <Suspense fallback={<div className="h-14 border-b border-line-soft" />}>
              <TopBar />
            </Suspense>

            <main id="main" className="flex-1 flex flex-col">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
