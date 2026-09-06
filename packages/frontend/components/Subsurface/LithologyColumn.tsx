'use client';

import { Layers, AlertTriangle, ArrowDown } from 'lucide-react';

interface FormationInterval {
  name: string;
  topM: number;
  bottomM: number;
  lithology: string;
  hazardRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  color: string;
}

const ASSAM_STRATA: FormationInterval[] = [
  { name: 'Alluvium', topM: 0, bottomM: 450, lithology: 'Silt, unconsolidated gravel & coarse sand', hazardRisk: 'LOW', color: 'border-l-amber-700/60 bg-amber-950/20' },
  { name: 'Dhekiajuli', topM: 450, bottomM: 1200, lithology: 'Friable massive sandstones with clay intercalations', hazardRisk: 'LOW', color: 'border-l-yellow-600/60 bg-yellow-950/20' },
  { name: 'Tipam Sandstone', topM: 1200, bottomM: 2100, lithology: 'Massive fluvial sandstones, principal regional reservoir', hazardRisk: 'LOW', color: 'border-l-amber-500/60 bg-amber-900/20' },
  { name: 'Surma / Bokabil', topM: 2100, bottomM: 2600, lithology: 'Siltstone, shale & argillaceous sandstone alternations', hazardRisk: 'MEDIUM', color: 'border-l-orange-500/70 bg-orange-950/25' },
  { name: 'Barail Formation', topM: 2600, bottomM: 3200, lithology: 'Carbonaceous shale, coals, overpressured sands (Prone to Kicks & Losses)', hazardRisk: 'HIGH', color: 'border-l-red-500 bg-red-950/30' },
  { name: 'Kopili Formation', topM: 3200, bottomM: 3800, lithology: 'Splintery marine shales, limestone lenses', hazardRisk: 'MEDIUM', color: 'border-l-purple-500/60 bg-purple-950/20' },
];

interface LithologyColumnProps {
  currentDepth: number;
}

export default function LithologyColumn({ currentDepth }: LithologyColumnProps) {
  // Find current active formation
  const activeStratum = ASSAM_STRATA.find(
    (s) => currentDepth >= s.topM && currentDepth < s.bottomM
  ) || ASSAM_STRATA[ASSAM_STRATA.length - 1];

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-lg p-3 shadow-md flex flex-col gap-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Assam Basin Stratigraphy
          </span>
        </div>
        <span className="text-[11px] font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
          Bit: {currentDepth.toFixed(1)}m
        </span>
      </div>

      {/* Stratigraphic Stack */}
      <div className="flex flex-col gap-1.5">
        {ASSAM_STRATA.map((st) => {
          const isCurrent = activeStratum.name === st.name;
          const isHazard = st.hazardRisk === 'HIGH';

          return (
            <div
              key={st.name}
              className={`border-l-4 rounded p-2 text-xs transition-all relative ${st.color} ${
                isCurrent ? 'ring-1 ring-sky-400 shadow-sm' : 'opacity-85'
              }`}
            >
              {/* Bit Depth Marker indicator when in this formation */}
              {isCurrent && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-ping" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-100">
                  <span>{st.name}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-sky-600 text-white rounded">
                      DRILLING HERE
                    </span>
                  )}
                  {isHazard && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-red-950 text-red-300 border border-red-800 rounded flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      HAZARD
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {st.topM}m – {st.bottomM}m
                </span>
              </div>

              <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                {st.lithology}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
