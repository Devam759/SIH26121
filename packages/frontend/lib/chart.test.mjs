// node lib/chart.test.mjs — guards the scaling maths the visuals depend on.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transpile } from './_tsc.mjs';

const { points, smoothPath, areaPath } = await transpile('lib/chart.ts');

assert.deepEqual(points([], 100, 50), []);
assert.deepEqual(points([5], 100, 50), [{ x: 50, y: 25 }], 'single sample centres');
assert.deepEqual(points([3, 3, 3], 100, 50), [
  { x: 0, y: 25 },
  { x: 50, y: 25 },
  { x: 100, y: 25 },
], 'flat series must not divide by zero');

const p = points([0, 10], 100, 50);
assert.equal(p[0].y, 50, 'min sits on the floor');
assert.equal(p[1].y, 0, 'max sits on the ceiling');
assert.equal(p[1].x, 100, 'last sample reaches full width');

assert.equal(smoothPath([]), '');
assert.ok(smoothPath(points([1, 5, 2, 8], 100, 50)).startsWith('M '));
assert.ok(smoothPath(points([1, 5, 2, 8], 100, 50)).includes(' C '), '3+ points curve');
assert.ok(areaPath(points([1, 5, 2], 100, 50), 50).endsWith(' Z'), 'area closes');

console.log('chart.ts ok');
