import './globals.css';
import type { Metadata } from 'next';
import { AlertOctagon, Flame, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'eRTMAC-NWIS | Oil India Limited | Nearby Wells Intelligence System',
  description: 'AI-enabled nearby wells intelligence system for drilling operations in Assam/Brahmaputra Basin. SIH 26121 | Oil India Limited (A Maharatna CPSE).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0F1216] text-slate-100 flex flex-col selection:bg-[#ED1C24] selection:text-white">
        {/* MANDATORY SYNTHETIC DEMO BANNER */}
        <div className="bg-[#B71622] text-white font-bold px-4 py-1 text-center text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm border-b border-[#8E1218]">
          <AlertOctagon className="w-3.5 h-3.5 text-amber-300" />
          <span>[SYNTHETIC – DEMO DATA] — Fictional Well Data for SIH 2026 Hackathon Demonstration</span>
        </div>

        {/* Global Navigation Bar - Oil India Limited Branding */}
        <header className="bg-[#161B22]/95 backdrop-blur-md border-b border-[#2E3642] px-6 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-3">
            {/* Oil India Official Emblem Shape with Red Brand Color */}
            <div className="w-9 h-9 rounded bg-[#ED1C24] flex items-center justify-center font-black text-white text-base shadow-md border border-[#F34D53] tracking-tighter">
              OIL
            </div>
            <div>
              <div className="text-sm font-black tracking-wide text-white flex items-center gap-2">
                <span>eRTMAC-NWIS</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ED1C24]/20 border border-[#ED1C24]/60 text-[#ED1C24]">
                  SIH 26121
                </span>
                <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/50 text-amber-400">
                  Maharatna CPSE
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                ऑयल इंडिया लिमिटेड • Oil India Limited • Assam Basin Operations
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1D232C] border border-[#2E3642] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Duliajan Ops Hub • Active</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-200 flex items-center justify-end gap-1">
                <span>Drilling Operations Console</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">engineer@oilindia.in</div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
