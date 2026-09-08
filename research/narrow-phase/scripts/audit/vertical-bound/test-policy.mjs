import fs from 'node:fs';
import * as T from '../../../review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import * as C from '../root/variants/vertical-control/csg/src/index.js';
import { createCollisionReport } from '../root/variants/vertical-control/backend/src/core/narrow/narrow-phase.js';
import { classifyClash } from '../root/variants/vertical-control/backend/src/core/narrow/collision-classification.js';
import { assessVerticalRejection } from './policy.mjs';
const policyOptions = { boxContainmentTolerance: .001, duplicateVolumeDiffRatio: .10, intersectionVolumeMatchRatio: .98 };
function box(x, y, z, position = [0, 0, 0]) {
 const g = new T.BoxGeometry(1, 1, 1);
 for (const name of ['position', 'normal']) { const a = g.attributes[name]; g.setAttribute(name, new T.BufferAttribute(new Float64Array(a.array), a.itemSize)); }
 g.scale(x, y, z); g.computeBoundingBox();
 const b = new C.Brush(g); b.matrixAutoUpdate = false; b.matrix.makeTranslation(...position); b.updateMatrixWorld(true); return b;
}
function metrics(brushes) {
 const box = new T.Box3(); let volume = 0;
 for (const b of brushes) { box.union(new T.Box3().setFromObject(b)); volume += Math.abs(C.computeMeshVolume(b)) * 1e9; }
 return { box, volume };
}
function runCase(name, a, b, expectedEligible, expectedCollision, expectedType) {
 const ma = metrics(a), mb = metrics(b);
 const classifyArgs = { ...policyOptions, collision: true, volumeA: ma.volume, volumeB: mb.volume, boxA: ma.box, boxB: mb.box };
 const couldBeDuplicate = classifyClash({ ...classifyArgs, intersectionVolume: Infinity }) === 'Duplicate';
 const decision = assessVerticalRejection({ brushesA: a, brushesB: b, verticalMm: 10, couldBeDuplicate });
 const e = new C.Evaluator(); e.attributes = ['position','normal']; e.useCDTClipping = true; e.useGroups = false;
 const overlaps = []; let volume = 0;
 for (const aa of a) for (const bb of b) {
  if (!new T.Box3().setFromObject(aa).intersectsBox(new T.Box3().setFromObject(bb))) continue;
  const o = e.evaluate(aa, bb, C.INTERSECTION); o.updateMatrixWorld(true); const v = Math.abs(C.computeMeshVolume(o)) * 1e9;
  if (v > 1) { overlaps.push(o); volume += v; }
 }
 const collision = volume > 1;
 const clashType = classifyClash({ ...classifyArgs, collision, intersectionVolume: volume });
 const report = createCollisionReport({ 'Clash GUID': name, toleranceMm: { horizontal: 0, vertical: 10 } }, { collision, clashType, volumeMm3: volume, overlapObjects: overlaps, options: { includeTraceFields: true } });
 const passed = decision.eligible === expectedEligible && (report.Collision === 'TRUE') === expectedCollision && (!expectedType || clashType === expectedType);
 return { name, decision, report, passed };
}
const cases = [
 runCase('single-thin-overlap', [box(1,1,.008)], [box(2,2,.1)], true, false, 'Overlapping'),
 runCase('above-vertical-limit', [box(1,1,.01010001)], [box(2,2,.1)], false, true, 'Overlapping'),
 runCase('small-duplicate-exemption', [box(.004,.004,.004)], [box(.004,.004,.004)], false, true, 'Duplicate'),
 runCase('separated-thin-overlaps-union-is-tall', [box(1,1,.004,[0,0,-.5]),box(1,1,.004,[0,0,.5])], [box(1.4,1.4,.1,[0,0,-.5]),box(1.4,1.4,.1,[0,0,.5])], false, true, 'Overlapping'),
 runCase('separated-z-intervals', [box(1,1,.008,[0,0,-1])], [box(2,2,.1,[0,0,1])], true, false, 'NA'),
];

// Exhaust necessary-condition monotonicity using the actual classifier.
let checks = 0, failures = 0;
const ba = new T.Box3(new T.Vector3(0,0,0),new T.Vector3(1,1,1));
for (const av of [0, 1, 64, 1e6, 1e12]) for (const bv of [0, 1, 64, 1e6, 1e12]) for (const shift of [0, .00099999, .001, .00100001, .1]) for (const match of [0, .97, .98, .99, 1, 2]) {
 const bb = ba.clone().translate(new T.Vector3(shift,shift,shift));
 const options = {...policyOptions, collision: true, volumeA: av, volumeB: bv, boxA: ba, boxB: bb};
 const possible = classifyClash({...options, intersectionVolume: Infinity}) === 'Duplicate';
 const actual = classifyClash({...options, intersectionVolume: Math.min(av,bv)*match}) === 'Duplicate';
 checks++; failures += actual && !possible;
}
const result = { cases, duplicateNecessaryConditionChecks: checks, duplicateFalseExclusions: failures };
fs.writeFileSync(new URL('./test-policy.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if (failures || cases.some(c => !c.passed)) process.exitCode = 1;
