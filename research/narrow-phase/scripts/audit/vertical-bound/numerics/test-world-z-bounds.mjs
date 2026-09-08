import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { boundPointWorldZ, intervalOverlapHeightMm, nextDown, nextUp, worldZBounds, worldZBoundsFromBox } from './world-z-bounds.mjs';

const started = performance.now();
const view = new DataView(new ArrayBuffer(8));
const one = { n: 1n, e: 0 };
const zero = { n: 0n, e: 0 };

// Independent exact dyadic arithmetic; never rounds multiplication/addition.
function exact(x) {
  assert.ok(Number.isFinite(x));
  view.setFloat64(0, x, false);
  const word = view.getBigUint64(0, false);
  const negative = (word >> 63n) !== 0n;
  const exponent = Number((word >> 52n) & 2047n);
  const fraction = word & ((1n << 52n) - 1n);
  const significand = exponent === 0 ? fraction : fraction + (1n << 52n);
  return { n: negative ? -significand : significand, e: exponent === 0 ? -1074 : exponent - 1075 };
}
function add(a, b) {
  const e = Math.min(a.e, b.e);
  return { n: (a.n << BigInt(a.e - e)) + (b.n << BigInt(b.e - e)), e };
}
function negate(a) { return { n: -a.n, e: a.e }; }
function subtract(a, b) { return add(a, negate(b)); }
function multiply(a, b) { return { n: a.n * b.n, e: a.e + b.e }; }
function compare(a, b) {
  const d = subtract(a, b).n;
  return d < 0n ? -1 : d > 0n ? 1 : 0;
}
function minimum(a, b) { return compare(a, b) <= 0 ? a : b; }
function maximum(a, b) { return compare(a, b) >= 0 ? a : b; }
function affineZ(p, e) {
  return add(add(add(multiply(exact(p[0]), exact(e[2])), multiply(exact(p[1]), exact(e[6]))),
    multiply(exact(p[2]), exact(e[10]))), exact(e[14]));
}
function encloses(range, value) {
  assert.ok(compare(exact(range.min), value) <= 0, 'lower endpoint exceeds exact result');
  assert.ok(compare(exact(range.max), value) >= 0, 'upper endpoint is below exact result');
}

let state = 0x7f914a3b;
function random32() {
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  return state >>> 0;
}
function randomDouble() {
  view.setUint32(0, random32(), false);
  view.setUint32(4, random32(), false);
  const x = view.getFloat64(0, false);
  return Number.isFinite(x) ? x : 0;
}
function moderateDouble() {
  return ((random32() / 2 ** 32) - 0.5) * 2 ** ((random32() % 2001) - 1000);
}
function matrix(zCoefficients = [0, 0, 1, 0]) {
  const e = [1, 0, zCoefficients[0], 0, 0, 1, zCoefficients[1], 0,
    0, 0, zCoefficients[2], 0, 0, 0, zCoefficients[3], 1];
  return { elements: e };
}
function geometry(points) {
  return { attributes: { position: {
    count: points.length, itemSize: 3,
    getX(i) { return points[i][0]; }, getY(i) { return points[i][1]; }, getZ(i) { return points[i][2]; }
  } } };
}

assert.equal(nextUp(0), Number.MIN_VALUE);
assert.equal(nextUp(-0), Number.MIN_VALUE);
assert.equal(nextDown(0), -Number.MIN_VALUE);
assert.equal(nextUp(-Infinity), -Number.MAX_VALUE);
assert.equal(nextDown(Infinity), Number.MAX_VALUE);
assert.equal(nextUp(Number.MAX_VALUE), Infinity);
assert.equal(nextDown(-Number.MAX_VALUE), -Infinity);
assert.ok(Number.isNaN(nextUp(NaN)));
for (const x of [-Number.MAX_VALUE, -1, -Number.MIN_VALUE, Number.MIN_VALUE, 1, Number.MAX_VALUE]) {
  assert.ok(nextDown(x) < x && x < nextUp(x));
}

const adversarial = [
  { p: [0, -0, 0], coefficients: [0, 0, 1, 0] },
  { p: [Number.MIN_VALUE, 0, 0], coefficients: [0.5, 0, 1, 0] },
  { p: [-Number.MIN_VALUE, 0, 0], coefficients: [0.5, 0, 1, 0] },
  { p: [1e16, -1e16, 1], coefficients: [1, 1, 1, 0] },
  { p: [1e16, 1, -1e16], coefficients: [1, 1, 1, 0] },
  { p: [1, 1, 1], coefficients: [1e300, -1e300, 1e-300, 0] },
  { p: [Number.MAX_VALUE, 0, 0], coefficients: [2, 0, 1, 0], fail: true },
  { p: [Number.MAX_VALUE, Number.MAX_VALUE, 0], coefficients: [2, -2, 1, 0], fail: true },
  { p: [1e-200, 1e-200, 1e-200], coefficients: [1e-200, -1e-200, 1e-200, 0] },
  { p: [-10, 2, 30], coefficients: [-3, 4, -5, 1000000] },
];
let pointCases = 0;
let pointCertified = 0;
let roundedTransformChecks = 0;
function checkPoint(p, e, expectedFailure = false) {
  pointCases++;
  const result = boundPointWorldZ(...p, e);
  if (expectedFailure) assert.equal(result.certified, false);
  if (!result.certified) return;
  pointCertified++;
  encloses(result, affineZ(p, e));
  const rounded = e[2] * p[0] + e[6] * p[1] + e[10] * p[2] + e[14];
  assert.ok(Number.isFinite(rounded));
  assert.ok(result.min <= rounded && rounded <= result.max);
  roundedTransformChecks++;
}
for (const entry of adversarial) checkPoint(entry.p, matrix(entry.coefficients).elements, entry.fail);
for (let i = 0; i < 40000; i++) {
  const make = i % 2 ? randomDouble : moderateDouble;
  const p = [make(), make(), make()];
  const e = matrix([make(), make(), make(), make()]).elements;
  checkPoint(p, e);
}

let meshCases = 0;
let meshCertified = 0;
let interiorChecks = 0;
let boxCertified = 0;
let boxVertexChecks = 0;
for (let i = 0; i < 3000; i++) {
  const scale = 2 ** ((random32() % 1801) - 900);
  const p = Array.from({ length: 3 + random32() % 9 }, () => Array.from({ length: 3 }, () =>
    (random32() / 2 ** 32 - 0.5) * scale));
  const coeff = Array.from({ length: 4 }, () => (random32() / 2 ** 32 - 0.5) * 2 ** ((random32() % 401) - 200));
  if (i % 3 === 0) coeff[2] = -Math.abs(coeff[2]); // reflection, with shear terms retained
  const m = matrix(coeff);
  const result = worldZBounds(geometry(p), m);
  meshCases++;
  const localBox = { min: {}, max: {} };
  for (const [axis, index] of [['x', 0], ['y', 1], ['z', 2]]) {
    localBox.min[axis] = Math.min(...p.map(v => v[index]));
    localBox.max[axis] = Math.max(...p.map(v => v[index]));
  }
  const boxResult = worldZBoundsFromBox(localBox, m);
  if (boxResult.certified) {
    boxCertified++;
    for (const v of p) {
      encloses(boxResult, affineZ(v, m.elements));
      const e = m.elements;
      const rounded = e[2] * v[0] + e[6] * v[1] + e[10] * v[2] + e[14];
      assert.ok(boxResult.min <= rounded && rounded <= boxResult.max);
      boxVertexChecks++;
    }
  }
  if (!result.certified) continue;
  meshCertified++;
  const values = p.map(v => affineZ(v, m.elements));
  for (const value of values) encloses(result, value);
  // Exact convex combinations test the triangle-interior consequence independently.
  const u = { n: BigInt(random32() % 65537), e: -16 };
  const v = { n: BigInt(random32() % 65537), e: -16 };
  const w0 = u;
  const w1 = multiply(subtract(one, u), v);
  const w2 = multiply(subtract(one, u), subtract(one, v));
  const interior = add(add(multiply(w0, values[0]), multiply(w1, values[1])), multiply(w2, values[2]));
  encloses(result, interior);
  interiorChecks++;
}

let heightCases = 0;
let heightCertified = 0;
for (let i = 0; i < 30000; i++) {
  const nums = Array.from({ length: 4 }, randomDouble);
  const a = { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]), certified: true };
  const b = { min: Math.min(nums[2], nums[3]), max: Math.max(nums[2], nums[3]), certified: true };
  const answer = intervalOverlapHeightMm(a, b);
  heightCases++;
  if (answer === null) continue;
  heightCertified++;
  const lower = maximum(exact(a.min), exact(b.min));
  const upper = minimum(exact(a.max), exact(b.max));
  const exactHeight = multiply(maximum(zero, subtract(upper, lower)), exact(1000));
  assert.ok(compare(exact(answer), exactHeight) >= 0);
  const roundedHeight = Math.max(0, Math.min(a.max, b.max) - Math.max(a.min, b.min)) * 1000;
  assert.ok(answer >= roundedHeight);
}

for (const special of [0, Number.MIN_VALUE, nextDown(0.0101), 0.0101, nextUp(0.0101), 1, 1e300]) {
  const a = { min: 0, max: special, certified: true };
  const answer = intervalOverlapHeightMm(a, a);
  if (answer !== null) assert.ok(compare(exact(answer), multiply(exact(special), exact(1000))) >= 0);
}

assert.equal(worldZBounds(geometry([]), matrix()).certified, false);
assert.equal(worldZBounds(geometry([[0, 0, NaN]]), matrix()).certified, false);
assert.equal(worldZBounds(geometry([[0, 0, Infinity]]), matrix()).certified, false);
assert.equal(worldZBoundsFromBox({ min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: Infinity } }, matrix()).certified, false);
assert.equal(worldZBoundsFromBox({ min: { x: 1, y: 0, z: 0 }, max: { x: 0, y: 0, z: 1 } }, matrix()).certified, false);
for (const slot of [3, 7, 11, 15]) {
  const m = matrix(); m.elements[slot] = 0.5;
  assert.equal(worldZBounds(geometry([[0, 0, 0]]), m).certified, false);
}
assert.equal(intervalOverlapHeightMm({ certified: false }, { certified: true, min: 0, max: 1 }), null);
assert.equal(intervalOverlapHeightMm({ certified: true, min: 2, max: 1 }, { certified: true, min: 0, max: 1 }), null);
assert.equal(intervalOverlapHeightMm({ certified: true, min: -Number.MAX_VALUE, max: Number.MAX_VALUE },
  { certified: true, min: -Number.MAX_VALUE, max: Number.MAX_VALUE }), null);

const result = {
  seed: '0x7f914a3b',
  oracle: 'Exact BigInt dyadic arithmetic, independent of floating interval implementation',
  pointCases, pointCertified, pointUncertified: pointCases - pointCertified,
  roundedTransformChecks, meshCases, meshCertified, interiorChecks, boxCertified, boxVertexChecks,
  heightCases, heightCertified, heightUncertified: heightCases - heightCertified,
  mismatches: 0, elapsedMs: performance.now() - started,
  scope: 'Static input affine world-Z and interval-height only; CSG-generated output is not certified'
};
fs.writeFileSync(new URL('./test-world-z-bounds.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
