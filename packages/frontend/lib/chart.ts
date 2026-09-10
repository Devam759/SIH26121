// Minimal SVG path maths for the telemetry visuals. Inline SVG beats a chart
// library here: two shapes, fixed viewBox, no interaction beyond hover.

export type Pt = { x: number; y: number };

/** Map values onto a viewBox, y inverted. Flat series render mid-height. */
export function points(values: number[], w: number, h: number, pad = 0): Pt[] {
  if (values.length === 0) return [];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const inner = h - pad * 2;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: values.length > 1 ? i * step : w / 2,
    y: hi === lo ? h / 2 : pad + inner - ((v - lo) / span) * inner,
  }));
}

/**
 * Catmull-Rom through the points, emitted as cubic beziers — the eased curve
 * the reference deck uses. Tension 0.5 keeps it from overshooting on spikes.
 */
export function smoothPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length < 3) return `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Close a line path down to the baseline so it can be filled. */
export function areaPath(pts: Pt[], h: number): string {
  if (pts.length === 0) return '';
  return `${smoothPath(pts)} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
}
