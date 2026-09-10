// Verifies every text/background pairing in the design token ramp clears WCAG AA.
// Tokens are parsed out of app/globals.css so this can't drift from the real palette.
//
//   node scripts/check-contrast.mjs
//
// Exits non-zero if any pairing regresses, so it works as a pre-commit or CI step.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', 'app', 'globals.css'), 'utf8');

// --name: oklch(L C H);  (alpha variants are skipped — they composite, so a
// static ratio would be meaningless.)
const TOKENS = Object.fromEntries(
  [...css.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)\s*;/g)].map((m) => [
    m[1],
    [Number(m[2]), Number(m[3]), Number(m[4])],
  ])
);

const oklchToLinearRgb = ([L, C, hDeg]) => {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

// WCAG relative luminance is defined on linear-light sRGB, which is what we have.
const luminance = (rgb) => {
  const c = rgb.map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const contrast = (fg, bg) => {
  const a = luminance(oklchToLinearRgb(TOKENS[fg]));
  const b = luminance(oklchToLinearRgb(TOKENS[bg]));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

const SURFACES = ['bg-deep', 'bg', 'raised', 'surface'];
const TEXT = ['ink', 'ink-2', 'ink-3', 'accent-ink', 'brand-ink', 'warn', 'ok'];

// 4.5 = text. 3.0 = a state carried by colour alone (bar fills, status dots,
// the rail's current-page marker), per WCAG 1.4.11.
//
// Filled buttons are deliberately not held to 3:1 against their panel: on this
// palette a fill dark enough for white text to clear 4.5:1 cannot also sit 3:1
// off a mid-tone indigo card. The label carries the contrast, and the button is
// identified by its shape and text, not by its edge.
const PAIRS = [
  ...TEXT.flatMap((t) => SURFACES.map((s) => [t, s, 4.5])),
  ['ink', 'accent-solid', 4.5], // white label on the primary button and hero card
  ['ink', 'brand-solid', 4.5], // white OIL mark on the rail
  ...SURFACES.map((s) => ['accent', s, 3.0]), // live dot, rail marker, bit-depth line
  ...SURFACES.map((s) => ['brand', s, 3.0]), // HIGH-hazard bars and dots
  ...SURFACES.map((s) => ['warn', s, 3.0]),
  ...SURFACES.map((s) => ['ok', s, 3.0]),
  ['line-soft', 'surface', 1.15], // dividers must stay visible without shouting
  ['ink-2', 'ink-3', 1.1], // the two muted ranks must not collapse into one
];

let failed = 0;
for (const [fg, bg, min] of PAIRS) {
  if (!TOKENS[fg] || !TOKENS[bg]) {
    console.log(`SKIP  ${fg} on ${bg} — token not found in globals.css`);
    continue;
  }
  const ratio = contrast(fg, bg);
  const pass = ratio >= min;
  if (!pass) failed++;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${fg.padEnd(11)} on ${bg.padEnd(11)} ${ratio.toFixed(2)}:1  (min ${min})`
  );
}

console.log(
  failed === 0
    ? `\nAll ${PAIRS.length} pairings clear WCAG AA.`
    : `\n${failed} pairing(s) below AA.`
);
process.exit(failed === 0 ? 0 : 1);
