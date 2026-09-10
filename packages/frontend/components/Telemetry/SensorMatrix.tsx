'use client';

import { DrillingTelemetry } from '../../lib/api';
import { formationAt } from '../../lib/strata';

interface SensorMatrixProps {
  telemetry: DrillingTelemetry | null;
  currentDepth?: number;
  isSimulating?: boolean;
}

/**
 * The channels the rig actually reports, each with the envelope the ops manual
 * puts on it. A row turns red when its reading leaves the envelope — so the
 * grid reads as instrumentation rather than decoration.
 */
const CHANNELS: {
  key: keyof DrillingTelemetry;
  label: string;
  unit: string;
  decimals: number;
  min: number;
  max: number;
}[] = [
  { key: 'rop_m_hr', label: 'ROP', unit: 'm/hr', decimals: 1, min: 12, max: 18 },
  { key: 'wob_tonnes', label: 'WOB', unit: 't', decimals: 1, min: 8, max: 16 },
  { key: 'rpm', label: 'RPM', unit: '', decimals: 0, min: 90, max: 130 },
  { key: 'torque_kn_m', label: 'Torque', unit: 'kN·m', decimals: 1, min: 0, max: 22 },
  { key: 'mud_weight_sg', label: 'Mud wt', unit: 'SG', decimals: 2, min: 1.1, max: 1.24 },
  { key: 'spp_psi', label: 'SPP', unit: 'psi', decimals: 0, min: 2800, max: 3400 },
  { key: 'gas_units', label: 'Gas', unit: 'units', decimals: 0, min: 0, max: 100 },
];

export default function SensorMatrix({
  telemetry,
  currentDepth = 2700,
  isSimulating = true,
}: SensorMatrixProps) {
  const readings = CHANNELS.map((c) => {
    const value = telemetry ? (telemetry[c.key] as number) : null;
    const out = value !== null && (value < c.min || value > c.max);
    return { ...c, value, out };
  });

  const excursions = readings.filter((r) => r.out);
  const formation = formationAt(currentDepth);

  return (
    <section className="panel flex flex-col h-full">
      <div className="panel-head px-4 py-2">
        <div className="min-w-0">
          <h2 className="panel-title">Channel envelope monitor</h2>
          <p className="meta truncate">
            {formation.name} &middot; bit at {currentDepth.toFixed(1)} m
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-micro font-mono text-ink-3 shrink-0">
          <span className={`led ${isSimulating ? 'bg-ok' : 'bg-ink-3'}`} aria-hidden="true" />
          {CHANNELS.length} ch {isSimulating ? 'streaming' : 'held'}
        </span>
      </div>

      {/* The headline is the count of channels in trouble, not a decorated tile. */}
      <div className="px-4 pt-3 flex items-baseline gap-2">
        <span className={`readout text-readout font-semibold ${excursions.length ? 'text-brand-ink' : ''}`}>
          {excursions.length}
        </span>
        <span className="text-body text-ink-3">
          {excursions.length === 1 ? 'channel out of envelope' : 'channels out of envelope'}
        </span>
      </div>

      <div className="flex items-center gap-3 px-4 pt-3 pb-1 border-b border-line-soft hdr">
        <span className="w-14 shrink-0">Channel</span>
        <span className="flex-1">Envelope</span>
        <span className="w-24 text-right shrink-0">Reading</span>
      </div>

      <ul className="flex-1 px-4">
        {readings.map((r) => {
          const span = r.max - r.min || 1;
          // Marker position inside the envelope. Clamped, so an out-of-range
          // reading pins to the edge it broke rather than leaving the track.
          const pct =
            r.value === null ? 0 : Math.min(100, Math.max(0, ((r.value - r.min) / span) * 100));
          return (
            <li
              key={r.key}
              className="flex items-center gap-3 py-1.5 border-b border-line-soft last:border-b-0"
              title={`${r.label} envelope ${r.min}–${r.max} ${r.unit}`}
            >
              <span
                className={`w-14 shrink-0 text-label font-mono ${r.out ? 'text-brand-ink font-semibold' : 'text-ink-2'}`}
              >
                {r.label}
              </span>

              {/* Envelope track: the operating range, with the current reading
                  marked on it. Nothing fills — position is the information. */}
              <div className="flex-1 min-w-[3rem] relative h-3 flex items-center" aria-hidden="true">
                <div className="w-full h-[3px] bg-bg-deep" />
                {/* End stops, so the track reads as a bounded range. */}
                <span className="absolute left-0 top-[3px] w-px h-1.5 bg-line" />
                <span className="absolute right-0 top-[3px] w-px h-1.5 bg-line" />
                {r.value !== null && (
                  <span
                    className={`absolute top-0 w-[3px] h-3 -ml-[1.5px] ${r.out ? 'bg-brand' : 'bg-accent'}`}
                    style={{ left: `${pct}%` }}
                  />
                )}
              </div>

              <span
                className={`w-24 text-right shrink-0 font-mono text-label tnum ${
                  r.out ? 'text-brand-ink font-semibold' : 'text-ink-2'
                }`}
              >
                {r.value === null ? '—' : r.value.toFixed(r.decimals)}
                {r.unit && <span className="text-ink-3 ml-1">{r.unit}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="px-4 py-2 border-t border-line-soft flex items-center justify-between gap-3 text-micro">
        {excursions.length ? (
          <span className="text-brand-ink truncate min-w-0">
            {excursions.map((e) => e.label).join(', ')} outside limits
          </span>
        ) : (
          <span className="text-ink-3">All channels nominal</span>
        )}
        <span
          className={`font-mono shrink-0 ${
            telemetry?.status === 'ANOMALY_DETECTED' ? 'text-brand-ink' : 'text-ink-3'
          }`}
        >
          {telemetry?.status === 'ANOMALY_DETECTED' ? 'ANOMALY' : 'NORMAL'}
        </span>
      </div>
    </section>
  );
}
