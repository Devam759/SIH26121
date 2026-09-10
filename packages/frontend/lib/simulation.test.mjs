// node lib/simulation.test.mjs — guards the offline engine against drift from
// packages/api/src/services/riskEngine.js, whose weights it mirrors.
import assert from 'node:assert/strict';
import { transpile } from './_tsc.mjs';

const {
  OFFSET_EVENTS,
  NEARBY_WELLS,
  telemetryAt,
  assessRiskAt,
  distanceKm,
  wellsAround,
  searchEvents,
  ANOMALY_WINDOW,
} = await transpile('lib/simulation.ts');

// --- corpus ---------------------------------------------------------------
assert.ok(OFFSET_EVENTS.length > 50, 'corpus survived extraction');
assert.ok(
  OFFSET_EVENTS.every((e) => e.depth_m > 0 && e.lat && e.lon && e.well_name),
  'every event carries depth and coordinates'
);
assert.ok(
  OFFSET_EVENTS.some((e) => e.formation === 'Barail' && e.depth_m > 2700),
  'the Barail demo interval has evidence behind it'
);

// --- telemetry ------------------------------------------------------------
assert.deepEqual(telemetryAt(2700), telemetryAt(2700), 'same depth redraws identically');

const calm = telemetryAt(2700);
const spike = telemetryAt(ANOMALY_WINDOW.top + 10);
assert.equal(calm.status, 'NORMAL');
assert.equal(spike.status, 'ANOMALY_DETECTED');
assert.ok(spike.gas_units > calm.gas_units * 3, 'gas spikes inside the window');
assert.ok(spike.torque_kn_m > calm.torque_kn_m, 'torque climbs inside the window');
assert.ok(spike.rop_m_hr < calm.rop_m_hr, 'ROP drops inside the window');
assert.ok(
  telemetryAt(ANOMALY_WINDOW.bottom + 1).status === 'NORMAL',
  'the window closes'
);

// --- risk -----------------------------------------------------------------
const barren = assessRiskAt(120, 'Barail', 10);
assert.equal(barren.score, 0, 'no offset events in range scores zero');
assert.equal(barren.level, 'LOW');
assert.deepEqual(
  barren.factors.map((f) => f.max),
  [35, 25, 20, 20],
  'factor caps match the API engine'
);

const hot = assessRiskAt(2750, 'Barail', 25);
assert.ok(hot.score > 0, 'the Barail interval scores');
assert.ok(hot.evidence.length > 0 && hot.evidence.length <= 5, 'evidence is capped at 5');
assert.ok(hot.evidenceWellCount > 0);
assert.ok(
  hot.factors.every((f) => f.score <= f.max),
  'no factor can exceed its cap'
);
assert.equal(
  hot.score,
  hot.factors.reduce((a, f) => a + f.score, 0),
  'score is the sum of its factors'
);

// Widening the radius can only add evidence, never remove it.
const near = assessRiskAt(2750, 'Barail', 5);
const far = assessRiskAt(2750, 'Barail', 25);
assert.ok(far.evidenceWellCount >= near.evidenceWellCount, 'radius is monotonic');

// Evidence is ordered by proximity to the bit, like the SQL ORDER BY.
const deltas = hot.evidence.map((e) => Math.abs(e.depth_m - 2750));
assert.deepEqual(deltas, [...deltas].sort((a, b) => a - b), 'nearest event first');

// --- geo ------------------------------------------------------------------
const ref = { lat: 26.852, lon: 94.532 };
assert.equal(Math.round(distanceKm(ref, ref)), 0);
assert.ok(Math.abs(distanceKm(ref, { lat: 26.942, lon: 94.532 }) - 10) < 0.2, '0.09° ≈ 10 km');

// --- offset well list -----------------------------------------------------
assert.ok(NEARBY_WELLS.length > 10, 'the map has more than the old 4 stub pins');
const evented = new Set(OFFSET_EVENTS.map((e) => e.well_name));
const listed = new Set(NEARBY_WELLS.map((w) => w.name));
assert.ok([...evented].every((n) => listed.has(n)), 'every event joins to a well');

const around = wellsAround({ lat: 26.852, lon: 94.532 });
assert.equal(around.length, NEARBY_WELLS.length);
assert.equal(around[0].distance_km, 0, 'the rig itself sorts first');
assert.deepEqual(
  around.map((w) => w.distance_km),
  [...around.map((w) => w.distance_km)].sort((a, b) => a - b),
  'sorted by distance'
);

// --- copilot fallback retrieval -------------------------------------------
assert.deepEqual(searchEvents(''), [], 'an empty question retrieves nothing');
const kicks = searchEvents('kick in the Barail formation');
assert.ok(kicks.length > 0, 'a plain question retrieves evidence');
assert.ok(kicks.some((e) => e.event_type === 'KICK'), 'the right event type surfaces');
assert.ok(searchEvents('stuck pipe').every((e) => e.mitigation !== undefined));
assert.ok(
  searchEvents('problems near 2800 m').some((e) => Math.abs(e.depth_m - 2800) <= 120),
  'a depth in the question biases retrieval toward that interval'
);

console.log(
  'simulation.ts ok —',
  OFFSET_EVENTS.length,
  'offset events,',
  NEARBY_WELLS.length,
  'wells'
);
