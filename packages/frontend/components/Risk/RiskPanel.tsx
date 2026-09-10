'use client';

import { useMemo, useState } from 'react';
import { RiskAssessment } from '../../lib/api';
import { assessRiskAt } from '../../lib/simulation';
import { ASSAM_STRATA, formationAt } from '../../lib/strata';
import { FileText, ChevronRight, ChevronDown } from 'lucide-react';

interface RiskPanelProps {
  risk: RiskAssessment | null;
  currentDepth: number;
  formation: string;
  wellName: string;
  radiusKm: number;
  onOpenHazardBrief?: () => void;
  onSelectEvidenceWell?: (wellName: string) => void;
}

const FACTOR_LABELS: Record<string, string> = {
  depth_proximity: 'Depth proximity',
  formation_match: 'Formation match',
  event_recurrence: 'Historical recurrence',
  context_score: 'Multi-incident context',
};

const EMPTY_FACTORS = [
  { name: 'depth_proximity', score: 0, max: 35 },
  { name: 'formation_match', score: 0, max: 25 },
  { name: 'event_recurrence', score: 0, max: 20 },
  { name: 'context_score', score: 0, max: 20 },
];

/** The score at which the engine raises an alert — the line the profile is
 *  read against, and the same threshold the alert stream documents. */
const ALERT_THRESHOLD = 40;

export default function RiskPanel({
  risk,
  currentDepth,
  formation,
  wellName,
  radiusKm,
  onOpenHazardBrief,
  onSelectEvidenceWell,
}: RiskPanelProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  const score = risk?.score ?? 0;
  const level = risk?.level ?? 'LOW';
  const confidence = risk?.confidence ?? 'LOW';
  const isHazardActive = level === 'HIGH' || score >= ALERT_THRESHOLD;

  const activeFormation = formationAt(currentDepth);

  // Each bar is the score the engine actually returns at the middle of that
  // interval, so the chart is a hazard profile of the hole — not decoration.
  const bars = useMemo(
    () =>
      ASSAM_STRATA.map((s) => {
        const peak = Math.max(
          ...[0.2, 0.4, 0.5, 0.6, 0.8].map(
            (t) => assessRiskAt(s.topM + (s.bottomM - s.topM) * t, formation, radiusKm).score
          )
        );
        return {
          short: s.short,
          name: s.name,
          score: peak,
          isCurrent: s.name === activeFormation.name,
        };
      }),
    [formation, radiusKm, activeFormation.name]
  );

  const evidence = risk?.evidence ?? [];

  return (
    <section className="panel flex flex-col h-full">
      <div className="panel-head px-4 py-2">
        <h2 className="panel-title">Proximity hazard score</h2>
        <button
          type="button"
          onClick={() => setShowEvidence((v) => !v)}
          aria-expanded={showEvidence}
          className="btn btn-quiet px-1.5 py-1"
        >
          {showEvidence ? 'Factors' : `Evidence (${evidence.length})`}
          {showEvidence ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={`readout text-readout font-semibold ${
              isHazardActive ? 'text-brand-ink' : ''
            }`}
          >
            {score}
            <span className="readout-unit">/ 100</span>
          </span>

          <span className={`tag ${isHazardActive ? 'tag-crit' : 'tag-ok'}`}>
            <span className={`led ${isHazardActive ? 'bg-brand' : 'bg-ok'}`} aria-hidden="true" />
            {level} &middot; {confidence.toLowerCase()} confidence
          </span>
        </div>

        <p className="meta mt-1">
          {wellName} &middot; {activeFormation.name} &middot; {currentDepth.toFixed(1)} m &middot;{' '}
          {risk?.evidenceWellCount ?? 0} offset wells in {radiusKm} km
        </p>
      </div>

      {/* Hazard profile down the hole. Bars are the peak score the engine
          returns inside each interval, against the alert threshold. */}
      <div className="px-4 pt-4">
        <div className="hdr pb-1.5">Peak score by formation</div>
        <div className="relative h-24 flex items-end gap-1.5 border-b border-line">
          {/* Alert threshold, drawn across the profile. */}
          <div
            className="absolute inset-x-0 border-t border-dashed border-warn-line pointer-events-none"
            style={{ bottom: `${ALERT_THRESHOLD}%` }}
            aria-hidden="true"
          >
            <span className="absolute left-0 -top-3.5 text-micro font-mono text-warn-ink bg-raised pr-1">
              alert {ALERT_THRESHOLD}
            </span>
          </div>

          {bars.map((bar) => {
            const hot = bar.score >= 70;
            const warm = bar.score >= ALERT_THRESHOLD;
            return (
              <div
                key={bar.short}
                className="flex-1 h-full flex items-end group relative"
                title={`${bar.name}: peak score ${bar.score}/100`}
              >
                <div
                  style={{ height: `${Math.max(2, bar.score)}%` }}
                  className={`w-full transition-[height] duration-300 ${
                    hot ? 'bg-brand' : warm ? 'bg-warn' : 'bg-line'
                  } ${bar.isCurrent ? 'outline outline-1 outline-accent' : ''}`}
                />
                <span className="absolute -top-3.5 inset-x-0 text-center text-micro font-mono tnum text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {bar.score}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5 pt-1">
          {bars.map((bar) => (
            <span
              key={bar.short}
              className={`flex-1 text-center text-micro font-mono truncate ${
                bar.isCurrent ? 'text-accent-ink font-semibold' : 'text-ink-3'
              }`}
            >
              {bar.short}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 min-h-0">
        {showEvidence ? (
          evidence.length === 0 ? (
            <p className="text-label text-ink-3 leading-relaxed">
              No approved offset incidents within &plusmn;100 m of the bit inside the {radiusKm} km
              buffer. Widen the radius or drill ahead to accumulate evidence.
            </p>
          ) : (
            <ul className="max-h-44 overflow-y-auto border-t border-line-soft">
              {evidence.map((ev) => (
                <li key={ev.id} className="border-b border-line-soft last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onSelectEvidenceWell?.(ev.well_name)}
                    className="w-full text-left py-1.5 px-1 hover:bg-surface/60 transition-colors group"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-label font-mono font-semibold text-ink group-hover:text-accent-ink transition-colors">
                        {ev.well_name}
                      </span>
                      <span className="font-mono text-micro tnum text-ink-3 shrink-0">
                        {ev.depth_m} m &middot; {Math.abs(ev.depth_m - currentDepth).toFixed(0)} m
                        away
                      </span>
                    </div>
                    <p className="text-micro text-ink-3 mt-0.5 truncate">
                      {ev.event_type.replace(/_/g, ' ')} &middot; {ev.severity} &middot;{' '}
                      {ev.formation}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="border-t border-line-soft">
            {(risk?.factors ?? EMPTY_FACTORS).map((f) => {
              const pct = Math.round((f.score / f.max) * 100);
              return (
                <div
                  key={f.name}
                  className="py-1.5 border-b border-line-soft last:border-b-0 flex items-center gap-3"
                >
                  <span className="text-label text-ink-2 flex-1 min-w-0 truncate">
                    {FACTOR_LABELS[f.name] ?? f.name}
                  </span>
                  {/* Neutral fill: these bars show how much of each factor's
                      ceiling is used, which the numbers already state. Painting
                      them amber would spend the accent on four bars at once. */}
                  <div className="w-24 h-1.5 bg-bg shrink-0" aria-hidden="true">
                    <div
                      className="h-full bg-ink-3 transition-[width] duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-micro tnum text-ink-2 w-11 text-right shrink-0">
                    {f.score}
                    <span className="text-ink-3">/{f.max}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {onOpenHazardBrief && (
        <div className="px-4 py-3 mt-3 border-t border-line-soft">
          {/* Secondary styling on purpose: the telemetry strip already carries
              the primary "Pre-spud brief" action, and two solid amber slabs for
              one action is exactly the noise the accent is meant to avoid. */}
          <button type="button" onClick={onOpenHazardBrief} className="btn w-full">
            <FileText className="w-3.5 h-3.5" />
            Generate pre-spud hazard brief
          </button>
        </div>
      )}
    </section>
  );
}
