'use client';

import { useEffect } from 'react';
import { RiskAssessment, Well } from '../../lib/api';
import { assessRiskAt } from '../../lib/simulation';
import { formationAt } from '../../lib/strata';
import { X, Printer, ShieldAlert } from 'lucide-react';

interface HazardBriefModalProps {
  well: Well | null;
  risk: RiskAssessment | null;
  currentDepth: number;
  formation: string;
  radiusKm: number;
  onClose: () => void;
}

/** Mud programme the brief prescribes, derived from the evidence it cites. */
function precautions(risk: RiskAssessment) {
  const kicks = risk.evidence.filter((e) => e.event_type === 'KICK').length;
  const losses = risk.evidence.filter((e) => e.event_type === 'MUD_LOSS').length;
  const sticking = risk.evidence.filter((e) => e.event_type === 'STUCK_PIPE').length;

  const items: [string, string][] = [
    [
      'Mud density window',
      'Maintain active mud weight between 1.18 SG and 1.21 SG through the interval.',
    ],
    [
      'Kill mud reserve',
      'Keep 80 m³ of 1.24 SG kill mud blended and available in suction tank 2.',
    ],
    ['Pit volume monitoring', 'Set the automated pit gain alarm at ±0.5 m³ deviation.'],
  ];

  if (kicks > 0)
    items.push([
      'Flow checks',
      `${kicks} offset ${kicks === 1 ? 'kick has' : 'kicks have'} been logged in this window — flow-check on every connection and before each trip.`,
    ]);
  if (losses > 0)
    items.push([
      'LCM readiness',
      'Pre-mix a CaCO₃ and mica LCM pill; offset records show losses cured within two hours when spotted early.',
    ]);
  if (sticking > 0)
    items.push([
      'Hole cleaning',
      'Ream every stand and circulate bottoms-up before tripping — differential sticking is documented nearby.',
    ]);

  return items;
}

export default function HazardBriefModal({
  well,
  risk,
  currentDepth,
  formation,
  radiusKm,
  onClose,
}: HazardBriefModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The brief must always open. If the stream has not delivered a scored
  // assessment yet, run the engine here rather than rendering nothing — the
  // button used to be a no-op whenever the API was unreachable.
  const assessment = risk ?? assessRiskAt(currentDepth, formation, radiusKm);
  const interval = formationAt(currentDepth);

  const depths = assessment.evidence.map((e) => e.depth_m);
  const windowTop = depths.length ? Math.min(...depths) : currentDepth - 50;
  const windowBottom = depths.length ? Math.max(...depths) : currentDepth + 50;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pre-spud hazard brief"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/75 print:static print:p-0 print:bg-white"
    >
      <div className="bg-raised border border-line shadow-overlay w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col print:max-h-none print:max-w-none print:border-0 print:rounded-none print:bg-white print:text-black">
        <header className="px-4 py-2.5 border-b border-line-soft flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-wash border border-accent-line grid place-items-center text-accent">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="panel-title">Pre-spud Hazard Brief</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-primary"
            >
              <Printer className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn btn-quiet w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 print:p-8 flex flex-col gap-4 text-xs text-ink-2 print:text-black">
          <div className="pb-4 border-b border-line flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-base font-bold tracking-tight text-ink print:text-black">
                Oil India Limited
              </p>
              <p className="text-xs text-ink-3 print:text-gray-700 mt-0.5">
                Directorate of Operations &middot; eRTMAC-NWIS offset hazard appraisal
              </p>
              <p className="text-label text-ink-3 print:text-gray-600 mt-0.5">
                {well?.field || 'Lakwa'} Field &middot; {well?.basin || 'Brahmaputra'} Basin &middot;
                NWIS-OHB-{new Date().getFullYear()}-{(well?.name || 'W-042').slice(-3)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-mono text-ink-3 print:text-gray-600">
                {new Date().toLocaleDateString('en-GB')}
              </p>
              <p
                className={`text-xs font-semibold mt-1 print:text-red-700 ${
                  assessment.level === 'HIGH'
                    ? 'text-brand-ink'
                    : assessment.level === 'MEDIUM'
                      ? 'text-warn-ink'
                      : 'text-ok-ink'
                }`}
              >
                {assessment.level} proximity risk &middot;{' '}
                <span className="font-mono">{assessment.score}/100</span>
              </p>
              <p className="text-label text-ink-3 print:text-gray-600 mt-0.5">
                {assessment.confidence.toLowerCase()} confidence
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3.5 rounded-xl bg-surface/50 border border-line-soft print:border-gray-300">
            {[
              { label: 'Active rig', value: well?.name ?? '—' },
              { label: 'Bit depth (MD)', value: `${currentDepth.toFixed(1)} m` },
              { label: 'Target formation', value: interval.name },
              { label: 'Search radius', value: `${radiusKm} km` },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-label text-ink-3 print:text-gray-600">{f.label}</p>
                <p className="text-body font-semibold text-ink print:text-black font-mono mt-0.5">
                  {f.value}
                </p>
              </div>
            ))}
          </div>

          <section>
            <h3 className="text-xs font-bold text-ink print:text-black uppercase tracking-wider">
              1. Offset well incident correlation
            </h3>
            {assessment.evidence.length === 0 ? (
              <p className="mt-2 leading-relaxed text-ink-2 print:text-gray-800">
                No approved offset incident falls within &plusmn;100 m of {currentDepth.toFixed(1)} m
                inside the {radiusKm} km buffer, so the proximity engine scores this interval
                {' '}{assessment.score}/100. This is an absence of recorded evidence, not evidence of
                absence — widen the radius or review the {interval.name} interval manually before
                spudding ahead.
              </p>
            ) : (
              <p className="mt-2 leading-relaxed text-ink-2 print:text-gray-800">
                Analysis of {assessment.evidenceWellCount} offset{' '}
                {assessment.evidenceWellCount === 1 ? 'well' : 'wells'} within {radiusKm} km
                confirms geological hazards in the {interval.name} between{' '}
                {windowTop.toFixed(0)} m and {windowBottom.toFixed(0)} m. Historical records cite{' '}
                {Array.from(
                  new Set(
                    assessment.evidence.map((e) => e.event_type.replace(/_/g, ' ').toLowerCase())
                  )
                ).join(', ')}
                , consistent with overpressured permeable sandstone stringers interbedded with coal
                seams.
              </p>
            )}
          </section>

          {assessment.evidence.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-ink print:text-black uppercase tracking-wider">
                2. Key correlated offset incidents
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full mt-3 text-xs border-collapse min-w-[36rem]">
                  <thead>
                    <tr className="text-ink-3 print:text-gray-600 text-left border-b border-line">
                      <th className="font-medium py-2 pr-3">Well</th>
                      <th className="font-medium py-2 pr-3">Event</th>
                      <th className="font-medium py-2 pr-3">Depth</th>
                      <th className="font-medium py-2 pr-3">Severity</th>
                      <th className="font-medium py-2">Mitigation applied</th>
                    </tr>
                  </thead>
                  <tbody className="print:text-gray-800">
                    {assessment.evidence.map((ev) => (
                      <tr key={ev.id} className="border-b border-line-soft">
                        <td className="py-2.5 pr-3 text-ink print:text-black font-medium whitespace-nowrap">
                          {ev.well_name}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-2 print:text-gray-800 whitespace-nowrap">
                          {ev.event_type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-ink-3 print:text-gray-700 whitespace-nowrap">
                          {ev.depth_m} m
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`tag ${
                              ev.severity === 'HIGH'
                                ? 'bg-brand-wash text-brand-ink border border-brand-line'
                                : ev.severity === 'MEDIUM'
                                  ? 'bg-warn-wash text-warn-ink border border-warn-line'
                                  : 'bg-ok-wash text-ok-ink border border-ok-line'
                            }`}
                          >
                            {ev.severity}
                          </span>
                        </td>
                        <td className="py-2.5 text-ink-2 print:text-gray-800">
                          {ev.mitigation || 'Not recorded in the source report'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-bold text-ink print:text-black uppercase tracking-wider">
              {assessment.evidence.length > 0 ? '3.' : '2.'} Mandatory precautions for the{' '}
              {interval.name}
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-ink-2 print:text-gray-800">
              {precautions(assessment).map(([term, detail]) => (
                <li key={term} className="leading-relaxed flex items-start gap-2">
                  <span className="text-accent font-bold">&bull;</span>
                  <span>
                    <strong className="text-ink print:text-black font-semibold">{term}:</strong>{' '}
                    {detail}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <p className="pt-4 border-t border-line text-label text-ink-3 print:text-gray-600 leading-relaxed">
            Generated from synthetic well records for SIH 2026 demonstration. Scores come from the
            eRTMAC proximity engine (depth proximity 35, formation match 25, historical recurrence
            20, multi-incident context 20) over offset events approved by a data steward.
          </p>
        </div>
      </div>
    </div>
  );
}
