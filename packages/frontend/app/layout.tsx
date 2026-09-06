import './globals.css';
import type { Metadata } from 'next';
import { AlertOctagon, Activity } from 'lucide-react';

export const metadata: Metadata = {
  title: 'eRTMAC-NWIS | Nearby Wells Intelligence System | Oil India Limited',
  description: 'AI-enabled nearby wells intelligence system for drilling operations in Assam/Brahmaputra Basin. SIH 26121.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
        {/* MANDATORY SYNTHETIC DEMO BANNER */}
        <div className="bg-amber-600 text-slate-950 font-bold px-4 py-1 text-center text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm">
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>[SYNTHETIC – DEMO DATA] — Fictional Well Data for SIH 2026 Hackathon Demonstration</span>
        </div>

        {/* Global Navigation Bar */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center font-black text-white text-sm shadow-md">
              OIL
            </div>
            <div>
              <div className="text-sm font-black tracking-wide text-slate-100 flex items-center gap-2">
                <span>eRTMAC-NWIS</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  SIH 26121
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Nearby Wells Intelligence System • Oil India Limited
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Assam Basin Active Monitor</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-200">Engineer Console</div>
              <div className="text-[11px] text-slate-400">engineer@oilindia.in</div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
