'use client';

import { DrillingTelemetry } from '../../lib/api';
import { TelemetrySample } from '../../hooks/useSSE';
import { Play, Pause, RotateCcw, ArrowUp, ArrowDown, FileText } from 'lucide-react';

interface ERTMACTelemetryStripProps {
  telemetry: DrillingTelemetry | null;
  history: TelemetrySample[];
  currentDepth: number;
  isSimulating: boolean;
  onOpenHazardBrief?: () => void;
  onToggleSimulate?: () => void;
  onResetDepth?: () => void;
}

/** Change over the last ~10 samples (≈5 m of hole), as a percentage. */
function trend(history: TelemetrySample[], key: keyof DrillingTelemetry): number | null {
  if (history.length < 4) return null;
  const now = history[history.length - 1][key];
  const then = history[Math.max(0, history.length - 11)][key];
  if (typeof now !== 'number' || typeof then !== 'number' || !then) return null;
  return ((now - then) / then) * 100;
}

/** Signed delta over the trailing interval. `goodWhenUp` flips the colour for
 *  channels where a rising number is the bad news (torque, gas). */
function Delta({ value, goodWhenUp = true }: { value: number | null; goodWhenUp?: boolean }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-ink-3 font-mono text-micro">&mdash;</span>;
  }
  const rising = value >= 0;
  const flat = Math.abs(value) < 0.5;
  const Icon = rising ? ArrowUp : ArrowDown;
  return (
    <span
      className={`font-mono text-micro tnum inline-flex items-center gap-0.5 ${
        flat ? 'text-ink-3' : rising === goodWhenUp ? 'text-ok-ink' : 'text-brand-ink'
      }`}
      title="Change over the last ~5 m drilled"
    >
      <Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

const SPARK_W = 88;
const SPARK_H = 22;

/**
 * One secondary channel in the instrument strip. These are cells divided by
 * hairlines inside a single module — not four free-floating cards.
 */
function Channel({
  label,
  value,
  unit,
  decimals,
  limit,
  delta,
  goodWhenUp,
  series,
  note,
}: {
  label: string;
  value: number;
  unit: string;
  decimals: number;
  limit: number;
  delta: number | null;
  goodWhenUp?: boolean;
  series: number[];
  note: string;
}) {
  const out = value > limit;

  // The trace and the limit line share one y-range, so the crossing point is
  // real. Normalising them separately would draw a limit the data never meets.
  const lo = Math.min(...series, limit);
  const hi = Math.max(...series, limit);
  const pad = 2;
  const yFor = (v: number) =>
    hi === lo ? SPARK_H / 2 : pad + (1 - (v - lo) / (hi - lo)) * (SPARK_H - pad * 2);
  const step = series.length > 1 ? SPARK_W / (series.length - 1) : 0;
  // A polyline, not an eased curve — a smoothed sensor trace hides the spikes
  // that are the whole reason to look at it.
  const path = series.map((v, i) => `${i ? 'L' : 'M'} ${i * step} ${yFor(v)}`).join(' ');
  const limitY = yFor(limit);

  return (
    <div className="flex-1 min-w-[8.5rem] px-3.5 py-3 border-l border-line-soft first:border-l-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label text-ink-3">{label}</span>
        <Delta value={delta} goodWhenUp={goodWhenUp} />
      </div>

      <div className="mt-1 flex items-end justify-between gap-2">
        <span className={`readout text-xl font-semibold ${out ? 'text-brand-ink' : 'text-ink'}`}>
          {value.toFixed(decimals)}
          <span className="readout-unit">{unit}</span>
        </span>

        <svg
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          className="w-[5.5rem] h-[22px] shrink-0"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            x2={SPARK_W}
            y1={limitY}
            y2={limitY}
            stroke="var(--warn)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.45"
            vectorEffect="non-scaling-stroke"
          />
          {series.length > 1 && (
            <path
              d={path}
              fill="none"
              stroke={out ? 'var(--brand-ink)' : 'var(--ink-3)'}
              strokeWidth="1.25"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>

      <p className="mt-1.5 text-micro text-ink-3 truncate" title={note}>
        {note}
      </p>
    </div>
  );
}

export default function ERTMACTelemetryStrip({
  telemetry,
  history,
  currentDepth,
  isSimulating,
  onOpenHazardBrief,
  onToggleSimulate,
  onResetDepth,
}: ERTMACTelemetryStripProps) {
  const rop = telemetry?.rop_m_hr ?? 14.5;
  const wob = telemetry?.wob_tonnes ?? 12.5;
  const rpm = telemetry?.rpm ?? 110;
  const torque = telemetry?.torque_kn_m ?? 18.2;
  const mudWeight = telemetry?.mud_weight_sg ?? 1.16;
  const gas = telemetry?.gas_units ?? 34;
  const spp = telemetry?.spp_psi ?? 3120;

  const isAnomaly = telemetry?.status === 'ANOMALY_DETECTED' || gas > 100 || torque > 22;

  const tail = history.slice(-20);
  const series = (key: keyof TelemetrySample, fallback: number) =>
    tail.length > 1 ? tail.map((s) => (s[key] as number) ?? fallback) : [fallback, fallback];

  // ROP against its target band — the number the driller is steering by.
  const ropOnTarget = rop >= 12 && rop <= 18;

  return (
    <section aria-label="Drilling telemetry overview" className="panel">
      {/* Provenance row: what feed, tied to which depth, in what state. */}
      <div className="panel-head px-4 py-2 flex-wrap">
        <div className="flex items-baseline gap-2 text-body min-w-0">
          <span className="panel-title">eRTMAC WITSML</span>
          <span className="text-ink-3">synchronised to bit depth</span>
          <span className="font-mono tnum text-ink font-semibold">{currentDepth.toFixed(1)} m</span>
        </div>

        {isAnomaly ? (
          <span className="tag tag-crit">
            <span className="led bg-brand" aria-hidden="true" />
            Gas / torque excursion
          </span>
        ) : (
          <span className="tag tag-ok">
            <span className="led bg-ok" aria-hidden="true" />
            Within envelope
          </span>
        )}
      </div>

      <div className="flex flex-col xl:flex-row">
        {/*
          Primary instrument. ROP gets the largest type and its own region
          because it is the number the whole deck is steering by; everything
          right of the divider is supporting context.
        */}
        <div className="xl:w-[22rem] xl:shrink-0 min-w-0 px-4 py-3.5 border-b xl:border-b-0 xl:border-r border-line-soft">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-label text-ink-3">Rate of penetration</h2>
            <span className="text-micro font-mono text-ink-3">target 12&ndash;18 m/hr</span>
          </div>

          <div className="mt-1 flex items-baseline gap-3">
            <span
              className={`readout text-hero font-semibold ${
                ropOnTarget ? 'text-ink' : 'text-warn-ink'
              }`}
            >
              {rop.toFixed(1)}
            </span>
            <span className="text-body text-ink-3">m/hr</span>
            <Delta value={trend(history, 'rop_m_hr')} />
          </div>

          {/* Supporting channels for the primary reading, as a spec row. */}
          <dl className="mt-2.5 flex items-baseline gap-4 text-label border-t border-line-soft pt-2">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-ink-3">WOB</dt>
              <dd className="font-mono tnum text-ink-2 font-medium">{wob.toFixed(1)} t</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-ink-3">RPM</dt>
              <dd className="font-mono tnum text-ink-2 font-medium">{rpm}</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-ink-3">SPP</dt>
              <dd className="font-mono tnum text-ink-2 font-medium">{spp} psi</dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {onOpenHazardBrief && (
              <button type="button" onClick={onOpenHazardBrief} className="btn btn-primary">
                <FileText className="w-3.5 h-3.5" strokeWidth={2} />
                Pre-spud brief
              </button>
            )}

            {onToggleSimulate && (
              <button type="button" onClick={onToggleSimulate} className="btn">
                {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isSimulating ? 'Hold feed' : 'Resume feed'}
              </button>
            )}

            {onResetDepth && (
              <button
                type="button"
                onClick={onResetDepth}
                title="Reset bit depth to 2700 m (Barail trigger interval)"
                className="btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                2700 m
              </button>
            )}
          </div>
        </div>

        {/* Secondary channels — one divided strip, and an envelope reference. */}
        <div className="flex-1 min-w-0 flex flex-wrap">
          <Channel
            label="Torque"
            value={torque}
            unit="kN·m"
            decimals={1}
            limit={22}
            delta={trend(history, 'torque_kn_m')}
            goodWhenUp={false}
            series={series('torque_kn_m', 18.2)}
            note={torque > 22 ? 'Micro-sticking · limit 22.0' : 'Smooth rotation · limit 22.0'}
          />
          <Channel
            label="Mud weight"
            value={mudWeight}
            unit="SG"
            decimals={2}
            limit={1.24}
            delta={trend(history, 'mud_weight_sg')}
            series={series('mud_weight_sg', 1.16)}
            note={`Out ${(mudWeight - 0.02).toFixed(2)} SG · limit 1.24`}
          />
          <Channel
            label="Total gas"
            value={gas}
            unit="units"
            decimals={0}
            limit={100}
            delta={trend(history, 'gas_units')}
            goodWhenUp={false}
            series={series('gas_units', 34)}
            note={gas > 100 ? 'Influx indication · limit 100' : 'Background · limit 100'}
          />

          {/*
            The envelope the readings above are judged against. This replaced a
            dashed "add a card" placeholder that carried no information.
          */}
          <dl className="w-full sm:w-auto sm:min-w-[10rem] px-3.5 py-3 border-l border-line-soft bg-bg/40">
            <div className="hdr pb-1.5 mb-1 border-b border-line-soft">Envelope</div>
            {[
              ['WOB', '8.0 – 16.0 t'],
              ['Torque', '≤ 22.0 kN·m'],
              ['Mud wt', '1.10 – 1.24 SG'],
              ['Gas', '≤ 100 units'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-0.5">
                <dt className="text-micro text-ink-3">{k}</dt>
                <dd className="text-micro font-mono tnum text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
