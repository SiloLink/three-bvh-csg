import fs from 'node:fs';
import { Vector3, Line3 } from '../../../review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import { writeEdgeBounds, separatedEdges, separatedPoint } from '../root/variants/edge-bounds/csg/src/core/edgeBounds.js';
const view = new DataView(new ArrayBuffer(8));
function adjacent(x, direction) {
 if (!Number.isFinite(x)) return x;
 if (x === 0) return direction * Number.MIN_VALUE;
 view.setFloat64(0, x);
 view.setBigUint64(0, view.getBigUint64(0) + BigInt((x > 0 ? 1 : -1) * direction));
 return view.getFloat64(0);
}
let seed = 0xb7e15162;
const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
const a = new Line3(), b = new Line3(), p = new Vector3(), q = new Vector3(), c1 = new Vector3(), c2 = new Vector3(), bounds = [];
const result = { segmentComparisons: 0, pointComparisons: 0, segmentRejects: 0, pointRejects: 0, falseRejects: [], naiveCancellationCounterexample: null };
for (let i = 0; i < 100000; i++) {
 const scale = 10 ** [-320, -160, -16, -8, 0, 8, 16, 150, 300][i % 9];
 for (const v of [a.start, a.end, b.start, b.end, p]) v.set((random() * 2 - 1) * scale, (random() * 2 - 1) * scale, 0);
 if (i % 3 === 0) { b.start.copy(a.start); b.end.copy(a.end); b.start.y = adjacent(b.start.y, 1); b.end.y = adjacent(b.end.y, 1); }
 if (i % 5 === 0) { p.copy(a.end); p.x = adjacent(p.x, -1); }
 if (i % 7 === 0) b.end.copy(b.start);
 if (i % 11 === 0) a.end.copy(a.start);
 if (i % 17 === 0) { a.start.set(1e16, 0, 0); a.end.set(1, 0, 0); b.start.set(0, 0, 0); b.end.set(0, 1, 0); p.set(0, 0, 0); }
 writeEdgeBounds(a, bounds, 0); writeEdgeBounds(b, bounds, 4);
 const d = a.distanceSqToLine3(b, c1, c2), t = a.closestPointToPointParameter(p, true); a.at(t, q); const pd = p.distanceToSquared(q);
 const thresholds = [0, Number.MIN_VALUE, 1e-16 * scale, d, adjacent(d, -1), adjacent(d, 1), pd, adjacent(pd, -1), adjacent(pd, 1), Infinity];
 for (const threshold of thresholds) {
  const es = separatedEdges(bounds, 0, 4, threshold), ps = separatedPoint(bounds, 0, p, threshold);
  result.segmentComparisons++; result.pointComparisons++; result.segmentRejects += es; result.pointRejects += ps;
  if ((es && d < threshold) || (ps && pd < threshold)) result.falseRejects.push({ i, threshold, d, pd, es, ps, a: a.clone(), b: b.clone(), p: p.clone() });
 }
 if (i === 0) result.naiveCancellationCounterexample = { a: a.clone(), b: b.clone(), d, closest1: c1.clone(), closest2: c2.clone(), bounds: [...bounds] };
}
fs.writeFileSync(new URL('./bounds-boundaries.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (result.falseRejects.length) process.exitCode = 1;
