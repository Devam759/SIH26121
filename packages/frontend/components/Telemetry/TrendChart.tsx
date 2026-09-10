'use client';

import { useRef, useState } from 'react';
import { TelemetrySample } from '../../hooks/useSSE';
import { Pt } from '../../lib/chart';
import { Download } from 'lucide-react';

interface TrendChartProps {
  history: TelemetrySample[];
  currentDepth: number;
}

type MetricKey = 'rop_m_hr' | 'torque_kn_m' | 'gas_units' | 'spp_psi';

const METRICS: {
  key: MetricKey;
  short: string;
  label: string;
  unit: string;
  decimals: number;
  ceiling: number;
  excursion: string;
}[] = [
  {
    key: 'rop_m_hr',
    short: 'ROP',
    label: 'Rate of penetration',
    unit: 'm/hr',
    decimals: 1,
    ceiling: 18,
    excursion: 'Drilling break',
  },
  {
    key: 'torque_kn_m',
    short: 'Torque',
    label: 'Downhole torque',
    unit: 'kN·m',
    decimals: 1,
    ceiling: 22,
    excursion: 'Micro-sticking',
  },
  {
    key: 'gas_units',
    short: 'Gas',
    label: 'Total gas',
    unit: 'units',
    decimals: 0,
    ceiling: 100,
    excursion: 'Gas influx',
  },
  {
    key: 'spp_psi',
    short: 'SPP',
    label: 'Standpipe pressure',
    unit: 'psi',
    decimals: 0,
    ceiling: 3600,
    excursion: 'Pressure spike',
  },
];

// Fixed viewBox. Left gutter carries the value axis, bottom carries depth.
const W = 760;
const H = 264;
const PAD = { l: 46, r: 52, t: 14, b: 30 };

export default function TrendChart({ history, currentDepth }: TrendChartProps) {
  const [metricKey, setMetricKey] = useState<MetricKey>('rop_m_hr');
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const metric = METRICS.find((m) => m.key === metricKey)!;

  const samples = history.slice(-120);
  const values = samples.map((s) => s[metric.key] as number);

  // Trailing mean over the last 15 samples — the comparison an engineer wants:
  // "is this reading a step change, or just where we have been drilling?".
  const baselineValues = values.map((_, i) => {
    const window = values.slice(Math.max(0, i - 15), i + 1);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });

  // The ceiling is always in frame, so the trace is read against its limit.
  const rawLo = values.length ? Math.min(...values, ...baselineValues) : 0;
  const rawHi = values.length ? Math.max(...values, ...baselineValues, metric.ceiling) : 1;
  const margin = (rawHi - rawLo || Math.max(1, rawHi * 0.1)) * 0.12;
  const lo = rawLo - margin;
  const hi = rawHi + margin;

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const yFor = (v: number) => PAD.t + plotH - ((v - lo) / (hi - lo)) * plotH;
  const xFor = (i: number) =>
    PAD.l + (values.length > 1 ? (i / (values.length - 1)) * plotW : plotW / 2);

  const line = (vals: number[]) =>
    vals.map((v, i) => `${i ? 'L' : 'M'} ${xFor(i).toFixed(2)} ${yFor(v).toFixed(2)}`).join(' ');

  const pts: Pt[] = values.map((v, i) => ({ x: xFor(i), y: yFor(v) }));
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + t * (hi - lo));
  const ceilingY = yFor(metric.ceiling);
  const ceilingInFrame = metric.ceiling > lo && metric.ceiling < hi;

  // Depth ticks: labelled marks on a real axis, roughly one per 90px.
  const tickCount = Math.min(7, Math.max(2, Math.floor(plotW / 105)));
  const ticks = samples.length
    ? Array.from({ length: tickCount }, (_, i) => {
        const idx = Math.round((i / Math.max(1, tickCount - 1)) * (samples.length - 1));
        return { x: xFor(idx), depth: samples[idx].depth };
      })
    : [];

  const peakIdx = values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
  const hasExcursion = values.length > 2 && values[peakIdx] > metric.ceiling;

  const readIdx = hover !== null && values[hover] !== undefined ? hover : values.length - 1;
  const currentValue = values.length ? values[readIdx] : 14.5;
  const readDepth = samples.length ? samples[readIdx].depth : currentDepth;
  const readOut = currentValue > metric.ceiling;

  // Nearest-sample hover: the deck is read at a glance, so the readout snaps
  // to a real sample rather than interpolating between two.
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || values.length === 0) return;
    const box = svg.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const t = (x - PAD.l) / plotW;
    const idx = Math.round(t * Math.max(1, values.length - 1));
    setHover(Math.min(values.length - 1, Math.max(0, idx)));
  };

  const exportCsv = () => {
    const rows = [
      [
        'depth_m',
        'rop_m_hr',
        'wob_tonnes',
        'rpm',
        'torque_kn_m',
        'mud_weight_sg',
        'spp_psi',
        'gas_units',
      ],
      ...history.map((s) => [
        s.depth,
        s.rop_m_hr,
        s.wob_tonnes,
        s.rpm,
        s.torque_kn_m,
        s.mud_weight_sg,
        s.spp_psi,
        s.gas_units,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `ertmac-telemetry-${currentDepth.toFixed(0)}m.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel flex flex-col">
      <div className="panel-head px-4 py-2 flex-wrap">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h2 className="panel-title">{metric.label}</h2>
          <span className="meta truncate">
            {!samples.length
              ? 'awaiting WITSML stream'
              : hover !== null
                ? `reading at ${readDepth.toFixed(1)} m`
                : `${samples[0].depth.toFixed(1)}–${samples[samples.length - 1].depth.toFixed(1)} m · ${samples.length} samples`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="seg" role="group" aria-label="Channel">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetricKey(m.key)}
                aria-pressed={m.key === metricKey}
              >
                {m.short}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={history.length === 0}
            className="btn"
            title="Download the full sample buffer as CSV"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Current reading, stated once, at instrument scale. */}
      <div className="px-4 pt-3 flex items-baseline gap-3 flex-wrap">
        <span className={`readout text-readout font-semibold ${readOut ? 'text-brand-ink' : ''}`}>
          {currentValue.toFixed(metric.decimals)}
          <span className="readout-unit text-body">{metric.unit}</span>
        </span>
        {readOut && <span className="tag tag-crit">{metric.excursion}</span>}
        {hover !== null && (
          <span className="meta">at {readDepth.toFixed(1)} m &mdash; move away to follow the bit</span>
        )}
      </div>

      <div className="px-2 pb-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-none"
          role="img"
          aria-label={`${metric.label} against depth`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        >
          {/* Out-of-envelope band. Tinting the region above the ceiling says
              "anything up here is a problem" without colouring the trace. */}
          {ceilingInFrame && (
            <rect
              x={PAD.l}
              y={PAD.t}
              width={plotW}
              height={Math.max(0, ceilingY - PAD.t)}
              fill="var(--brand)"
              opacity="0.06"
            />
          )}

          {/* Value gridlines + axis labels */}
          {gridValues.map((v, i) => (
            <g key={i}>
              <line
                x1={PAD.l}
                x2={PAD.l + plotW}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="var(--line-soft)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.l - 7}
                y={yFor(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fill="var(--ink-3)"
                className="text-[9px] font-mono"
              >
                {v.toFixed(metric.decimals)}
              </text>
            </g>
          ))}

          {/* Axis spines */}
          <line
            x1={PAD.l}
            x2={PAD.l}
            y1={PAD.t}
            y2={PAD.t + plotH}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={PAD.l}
            x2={PAD.l + plotW}
            y1={PAD.t + plotH}
            y2={PAD.t + plotH}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {/* Depth ticks */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={t.x}
                x2={t.x}
                y1={PAD.t + plotH}
                y2={PAD.t + plotH + 4}
                stroke="var(--line)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={t.x}
                y={PAD.t + plotH + 16}
                textAnchor="middle"
                fill="var(--ink-3)"
                className="text-[9px] font-mono"
              >
                {t.depth.toFixed(0)}
              </text>
            </g>
          ))}
          <text
            x={PAD.l + plotW}
            y={PAD.t + plotH + 26}
            textAnchor="end"
            fill="var(--ink-3)"
            className="text-[9px] font-mono"
          >
            bit depth (m)
          </text>

          {/* Operating limit, labelled in the right gutter. */}
          {ceilingInFrame && (
            <g>
              <line
                x1={PAD.l}
                x2={PAD.l + plotW}
                y1={ceilingY}
                y2={ceilingY}
                stroke="var(--warn)"
                strokeWidth="1"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={PAD.l + plotW + 6}
                y={ceilingY}
                dominantBaseline="middle"
                fill="var(--warn-ink)"
                className="text-[9px] font-mono"
              >
                {metric.ceiling} limit
              </text>
            </g>
          )}

          {/* Trailing-mean comparison. Dashed and dim: it is a reference, not
              a reading. */}
          {baselineValues.length > 1 && (
            <path
              d={line(baselineValues)}
              fill="none"
              stroke="var(--ink-3)"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.7"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Measured channel. A polyline at sample resolution — no smoothing,
              no gradient fill, no glow. */}
          {values.length > 1 && (
            <path
              d={line(values)}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Bit position: the newest sample, in the operational accent. */}
          {pts.length > 0 && (
            <g>
              <line
                x1={pts[pts.length - 1].x}
                x2={pts[pts.length - 1].x}
                y1={PAD.t}
                y2={PAD.t + plotH}
                stroke="var(--accent)"
                strokeWidth="1"
                opacity="0.45"
                vectorEffect="non-scaling-stroke"
              />
              <rect
                x={pts[pts.length - 1].x - 2.5}
                y={pts[pts.length - 1].y - 2.5}
                width="5"
                height="5"
                fill="var(--accent)"
              />
            </g>
          )}

          {/* Peak excursion marker */}
          {hasExcursion && (
            <g>
              <rect
                x={pts[peakIdx].x - 3}
                y={pts[peakIdx].y - 3}
                width="6"
                height="6"
                fill="var(--brand-ink)"
              />
              <text
                x={pts[peakIdx].x}
                y={pts[peakIdx].y - 8}
                textAnchor="middle"
                fill="var(--brand-ink)"
                className="text-[9px] font-mono font-semibold"
              >
                {values[peakIdx].toFixed(metric.decimals)}
              </text>
            </g>
          )}

          {/* Hover crosshair */}
          {hover !== null && pts[hover] && (
            <g pointerEvents="none">
              <line
                x1={pts[hover].x}
                x2={pts[hover].x}
                y1={PAD.t}
                y2={PAD.t + plotH}
                stroke="var(--ink-2)"
                strokeWidth="1"
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={PAD.l}
                x2={PAD.l + plotW}
                y1={pts[hover].y}
                y2={pts[hover].y}
                stroke="var(--ink-2)"
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity="0.55"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={pts[hover].x} cy={pts[hover].y} r="2.5" fill="var(--ink)" />
            </g>
          )}

          {values.length <= 1 && (
            <text
              x={W / 2}
              y={H / 2}
              textAnchor="middle"
              fill="var(--ink-3)"
              className="text-label"
            >
              Waiting for initial WITSML telemetry
            </text>
          )}
        </svg>
      </div>

      {/* Legend. Named series, stated once, at the foot of the module. */}
      <div className="px-4 py-2 border-t border-line-soft flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-ink-3">
        <span className="flex items-center gap-1.5">
          <svg width="14" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="14" y2="3" stroke="var(--ink)" strokeWidth="1.5" />
          </svg>
          Measured
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="14" height="6" aria-hidden="true">
            <line
              x1="0"
              y1="3"
              x2="14"
              y2="3"
              stroke="var(--ink-3)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          </svg>
          15-sample mean
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="14" height="6" aria-hidden="true">
            <line
              x1="0"
              y1="3"
              x2="14"
              y2="3"
              stroke="var(--warn)"
              strokeWidth="1"
              strokeDasharray="5 4"
            />
          </svg>
          Operating limit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-accent" aria-hidden="true" />
          Bit position
        </span>
      </div>
    </section>
  );
}
