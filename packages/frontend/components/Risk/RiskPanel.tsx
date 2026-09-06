'use client';

import { RiskAssessment, EvidenceItem } from '../../lib/api';
import { AlertTriangle, ShieldCheck, FileSpreadsheet, Compass, Layers, ExternalLink } from 'lucide-react';

interface RiskPanelProps {
  risk: RiskAssessment | null;
  currentDepth: number;
  formation: string;
  wellName: string;
  isSimulating: boolean;
  onOpenHazardBrief?: () => void;
  onSelectEvidenceWell?: (wellName: string) => void;
}

export default function RiskPanel({
  risk,
  currentDepth,
  formation,
  wellName,
  isSimulating,
  onOpenHazardBrief,
  onSelectEvidenceWell,
}: RiskPanelProps) {
  const score = risk?.score ?? 0;
  const level = risk?.level ?? 'LOW';
  const confidence = risk?.confidence ?? 'LOW';

  const levelColor =
    level === 'HIGH' ? 'text-red-300 bg-[#3A0B10] border-[#ED1C24]' :
    level === 'MEDIUM' ? 'text-amber-300 bg-amber-950/60 border-amber-600' :
    'text-emerald-300 bg-emerald-950/60 border-emerald-800';

  const scoreBarColor =
    score >= 70 ? 'bg-[#ED1C24]' :
    score >= 40 ? 'bg-amber-500' :
    'bg-emerald-500';

  return (
    <div className="bg-[#161B22]/95 border border-[#2E3642] rounded-lg p-4 flex flex-col gap-4 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2E3642] pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            Real-Time Proximity Hazard Engine
          </div>
          <div className="text-base font-black text-slate-100 flex items-center gap-2">
            <span>{wellName}</span>
            {isSimulating && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#3A0B10] border border-[#8E1218] text-[#ED1C24]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ED1C24] animate-pulse" />
                Live SSE (+0.5m/3s)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded text-xs font-bold border ${levelColor}`}>
            {level} RISK
          </div>
          <div className="px-2 py-1 rounded bg-[#1D232C] border border-[#2E3642] text-[11px] text-slate-300 font-mono">
            {confidence} Conf.
          </div>
        </div>
      </div>

      {/* Depth and Formation Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1D232C] border border-[#2E3642] rounded p-2.5 flex items-center gap-3">
          <Compass className="w-5 h-5 text-[#ED1C24] shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Current Depth (MD)</div>
            <div className="text-lg font-bold font-mono text-slate-100">{currentDepth.toFixed(1)} m</div>
          </div>
        </div>

        <div className="bg-[#1D232C] border border-[#2E3642] rounded p-2.5 flex items-center gap-3">
          <Layers className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Formation Interval</div>
            <div className="text-sm font-bold text-amber-300 truncate">{formation}</div>
          </div>
        </div>
      </div>

      {/* Total Score Meter */}
      <div className="bg-[#1D232C]/80 border border-[#2E3642] rounded-lg p-3">
        <div className="flex justify-between items-center mb-1.5 text-xs">
          <span className="text-slate-300 font-semibold">Proximity Hazard Score</span>
          <span className="text-sm font-black text-slate-100 font-mono">{score} / 100</span>
        </div>
        <div className="w-full bg-[#0F1216] h-2.5 rounded-full overflow-hidden border border-[#2E3642]">
          <div
            className={`h-full transition-all duration-500 rounded-full ${scoreBarColor}`}
            style={{ width: `${Math.min(100, Math.max(2, score))}%` }}
          />
        </div>
      </div>

      {/* Factor Breakdown (4 Core Factors) */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold text-slate-200">Weighted Risk Factors</div>
        {(risk?.factors || [
          { name: 'depth_proximity', score: 0, max: 35 },
          { name: 'formation_match', score: 0, max: 25 },
          { name: 'event_recurrence', score: 0, max: 20 },
          { name: 'context_score', score: 0, max: 20 },
        ]).map((f) => {
          const factorLabels: Record<string, string> = {
            depth_proximity: 'Depth Proximity',
            formation_match: 'Formation Match',
            event_recurrence: 'Historical Recurrence',
            context_score: 'Multi-Incident Context',
          };
          const pct = Math.round((f.score / f.max) * 100);

          return (
            <div key={f.name} className="flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>{factorLabels[f.name] || f.name}</span>
                <span className="text-slate-300 font-mono font-medium">{f.score} / {f.max} pts</span>
              </div>
              <div className="w-full bg-[#0F1216] h-1.5 rounded-full overflow-hidden border border-[#2E3642]">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Grounded Evidence List */}
      <div className="flex flex-col gap-2 border-t border-[#2E3642] pt-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-200">Historical Evidence ({risk?.evidence?.length || 0})</span>
          <span className="text-[11px] text-slate-400 font-mono">{risk?.evidenceWellCount || 0} offset wells involved</span>
        </div>

        {risk?.evidence && risk.evidence.length > 0 ? (
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {risk.evidence.map((ev, i) => (
              <div
                key={ev.id || i}
                onClick={() => onSelectEvidenceWell && onSelectEvidenceWell(ev.well_name)}
                className="bg-[#1D232C] hover:bg-[#252C37] border border-[#2E3642] rounded p-2 text-xs flex flex-col gap-1 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <span>{ev.well_name}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0F1216] text-slate-300 font-mono border border-[#2E3642]">
                    {ev.depth_m}m
                  </span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  <span className="font-semibold text-red-300 uppercase">{ev.event_type.replace('_', ' ')}</span>
                  {ev.formation && ` in ${ev.formation}`}
                </div>
                {ev.mitigation && (
                  <div className="text-slate-400 text-[10px] bg-[#0F1216] p-1.5 rounded border border-[#2E3642]">
                    <span className="text-emerald-400 font-semibold">Curing Action:</span> {ev.mitigation}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-3 text-center bg-[#1D232C]/40 rounded border border-dashed border-[#2E3642]">
            No high-risk offset incidents at current depth window
          </div>
        )}
      </div>

      {/* Action Button: Export Pre-Spud Hazard Brief */}
      {onOpenHazardBrief && (
        <button
          onClick={onOpenHazardBrief}
          className="mt-1 bg-[#1D232C] hover:bg-[#252C37] border border-[#ED1C24]/60 text-slate-100 py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          <span>Generate Pre-Spud Hazard Brief (OIL Format)</span>
        </button>
      )}
    </div>
  );
}
