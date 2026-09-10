'use client';

import { ASSAM_STRATA, TOTAL_DEPTH, formationAt } from '../../lib/strata';
import { OFFSET_EVENTS } from '../../lib/simulation';

interface LithologyColumnProps {
  currentDepth: number;
}

/** Offset incidents per interval — the reason a stratum is worth flagging. */
const INCIDENTS_BY_INTERVAL = ASSAM_STRATA.map(
  (s) => OFFSET_EVENTS.filter((e) => e.depth_m >= s.topM && e.depth_m < s.bottomM).length
);

export default function LithologyColumn({ currentDepth }: LithologyColumnProps) {
  const active = formationAt(currentDepth);
  const bitPct = Math.min(100, Math.max(0, (currentDepth / TOTAL_DEPTH) * 100));

  return (
    <section className="panel flex flex-col h-full overflow-hidden">
      <div className="panel-head px-4 py-2">
        <div className="min-w-0">
          <h2 className="panel-title">Stratigraphy profile</h2>
          <p className="meta truncate">
            Assam Basin &middot; scaled to {TOTAL_DEPTH.toLocaleString('en-IN')} m
          </p>
        </div>
        <span className="font-mono text-label tnum text-ink shrink-0">
          bit {currentDepth.toFixed(1)} m
        </span>
      </div>

      <div className="flex-1 flex min-h-0 p-3 gap-2">
        {/* Depth scale down the left edge — the column is a section, so it
            needs an axis to be read against. */}
        <div className="relative w-9 shrink-0 text-right" aria-hidden="true">
          {ASSAM_STRATA.map((s) => (
            <span
              key={s.name}
              className="absolute right-0 -translate-y-1/2 text-micro font-mono tnum text-ink-3 pr-1"
              style={{ top: `${(s.topM / TOTAL_DEPTH) * 100}%` }}
            >
              {s.topM}
            </span>
          ))}
          <span
            className="absolute right-0 -translate-y-1/2 text-micro font-mono tnum text-ink-3 pr-1"
            style={{ top: '100%' }}
          >
            {TOTAL_DEPTH}
          </span>
        </div>

        <div className="relative flex-1 flex flex-col min-h-[300px] border border-line-soft bg-bg-deep">
          {ASSAM_STRATA.map((s, i) => {
            const isActive = active.name === s.name;
            const incidents = INCIDENTS_BY_INTERVAL[i];
            // The left edge carries hazard rating; the fill stays neutral so
            // the column reads as rock, not as a status board.
            const edge =
              s.hazardRisk === 'HIGH'
                ? 'border-l-brand'
                : s.hazardRisk === 'MEDIUM'
                  ? 'border-l-warn'
                  : 'border-l-line';

            return (
              <div
                key={s.name}
                style={{ flexGrow: s.bottomM - s.topM, flexBasis: 0 }}
                className={`relative px-2.5 py-1.5 min-h-0 overflow-hidden border-l-2 ${edge} ${
                  i > 0 ? 'border-t border-t-line-soft' : ''
                } ${isActive ? 'bg-surface' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3
                    className={`text-label truncate ${
                      isActive ? 'text-ink font-semibold' : 'text-ink-2'
                    }`}
                  >
                    {s.name}
                  </h3>
                  <span className="font-mono tnum text-micro text-ink-3 shrink-0">
                    {s.bottomM - s.topM} m
                  </span>
                </div>
                <p className="text-micro text-ink-3 mt-0.5 leading-snug line-clamp-1">
                  {s.lithology}
                </p>
                {incidents > 0 && (
                  <p
                    className={`text-micro mt-0.5 font-mono ${
                      s.hazardRisk === 'HIGH' ? 'text-brand-ink' : 'text-warn-ink'
                    }`}
                  >
                    {incidents} offset {incidents === 1 ? 'incident' : 'incidents'}
                  </p>
                )}
              </div>
            );
          })}

          {/* Bit depth tracker — a survey line across the section. */}
          <div
            className="absolute inset-x-0 pointer-events-none transition-[top] duration-300"
            style={{ top: `${bitPct}%` }}
          >
            <div className="relative h-px bg-accent">
              <span
                className="absolute -top-[3px] left-0 w-1.5 h-1.5 bg-accent"
                aria-hidden="true"
              />
              <span className="absolute -top-2 right-1 px-1 bg-accent text-bg-deep font-mono text-micro font-bold tnum">
                {currentDepth.toFixed(1)} m
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-line-soft flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-3 bg-brand" aria-hidden="true" />
          High hazard
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-3 bg-warn" aria-hidden="true" />
          Medium
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-px bg-accent" aria-hidden="true" />
          Bit depth
        </span>
      </div>
    </section>
  );
}
