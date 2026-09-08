import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../../../../review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import { Brush, Evaluator, INTERSECTION, computeMeshVolume } from '../../root/variants/vertical-control/csg/src/index.js';
import { computeOrientedClashSize } from '../../root/variants/vertical-control/backend/src/core/geometry/oriented-box.js';
import { classifyClash } from '../../root/variants/vertical-control/backend/src/core/narrow/collision-classification.js';
import { shouldFilterOverlappingByTolerance, shouldFilterByFillRatio } from '../../root/variants/vertical-control/backend/src/core/narrow/tolerance-filter.js';
import { worldZBoundsFromBox, intervalOverlapHeightMm } from './world-z-bounds.mjs';

function boxBrush(dimensions, matrix) {
  const g = new T.BoxGeometry(1, 1, 1);
  const old = g.attributes.position;
  const positions = new Float64Array(old.count * 3);
  for (let i = 0; i < old.count; i++) {
    positions[3 * i] = old.getX(i) * dimensions[0];
    positions[3 * i + 1] = old.getY(i) * dimensions[1];
    positions[3 * i + 2] = old.getZ(i) * dimensions[2];
  }
  g.setAttribute('position', new T.BufferAttribute(positions, 3));
  g.computeBoundingBox();
  const brush = new Brush(g);
  brush.matrixAutoUpdate = false;
  brush.matrix.copy(matrix);
  brush.matrixWorld.copy(matrix);
  return brush;
}

const dimensionsA = [4, 4, 1.8];
const dimensionsB = [1, 1, .01009999999999999];
const a = boxBrush(dimensionsA, new T.Matrix4().set(
  1, 0, 0, 0,
  0, 1, 0, 0,
  .2, 0, 1, 0,
  0, 0, 0, 1));
const b = boxBrush(dimensionsB, new T.Matrix4().makeTranslation(.3, 0, 0));
const boundsA = worldZBoundsFromBox(a.geometry.boundingBox, a.matrixWorld);
const boundsB = worldZBoundsFromBox(b.geometry.boundingBox, b.matrixWorld);
const certifiedInputHeightMm = intervalOverlapHeightMm(boundsA, boundsB);
const evaluator = new Evaluator();
evaluator.useCDTClipping = true;
evaluator.useGroups = false;
evaluator.attributes = ['position', 'normal'];
const output = evaluator.evaluate(a, b, INTERSECTION);
output.updateMatrixWorld(true);
assert.deepEqual(output.matrixWorld.toArray(), a.matrixWorld.toArray(), 'control must preserve the exact affine result matrix');

const position = output.geometry.attributes.position;
const p = new T.Vector3();
const worldPoints = [];
for (let i = 0; i < position.count; i++) {
  p.fromBufferAttribute(position, i).applyMatrix4(output.matrixWorld);
  worldPoints.push([p.x, p.y, p.z]);
}
const sizeM = computeOrientedClashSize(worldPoints);
const sizeMm = { x: sizeM.x * 1000, y: sizeM.y * 1000, z: sizeM.z * 1000 };
const volumeA = computeMeshVolume(a) * 1e9;
const volumeB = computeMeshVolume(b) * 1e9;
const volumeMm3 = computeMeshVolume(output) * 1e9;
const worldBoxA = a.geometry.boundingBox.clone().applyMatrix4(a.matrixWorld);
const worldBoxB = b.geometry.boundingBox.clone().applyMatrix4(b.matrixWorld);
const clashType = classifyClash({ collision: volumeMm3 > 1, volumeA, volumeB, intersectionVolume: volumeMm3,
  boxA: worldBoxA, boxB: worldBoxB, boxContainmentTolerance: .001,
  duplicateVolumeDiffRatio: .1, intersectionVolumeMatchRatio: .98 });
const tolerance = { horizontal: 10, vertical: 10 };
const filteredByTolerance = shouldFilterOverlappingByTolerance(clashType, sizeMm, tolerance);
const filteredByFillRatio = shouldFilterByFillRatio(clashType, volumeMm3, sizeMm);
const volumeDifferenceRatio = Math.abs(volumeA - volumeB) / Math.max(volumeA, volumeB);

assert.ok(certifiedInputHeightMm !== null && certifiedInputHeightMm <= 10.1);
assert.ok(sizeMm.z > 10.1);
assert.ok(volumeMm3 > 1);
assert.ok(volumeDifferenceRatio > .1);
assert.equal(clashType, 'Overlapping');
assert.equal(filteredByTolerance, false);
assert.equal(filteredByFillRatio, false);

// This is a pure transform round-trip error: B is strictly inside A and the
// exact intersection is B. Even without clipping, re-expressing B in A's frame
// and then applying A's frame can exceed the certified original-input interval.
const relative = new T.Matrix4().copy(a.matrixWorld).invert().multiply(b.matrixWorld);
let roundTripMin = Infinity, roundTripMax = -Infinity;
const source = b.geometry.attributes.position;
for (let i = 0; i < source.count; i++) {
  p.fromBufferAttribute(source, i).applyMatrix4(relative).applyMatrix4(a.matrixWorld);
  roundTripMin = Math.min(roundTripMin, p.z);
  roundTripMax = Math.max(roundTripMax, p.z);
}
const roundTripHeightMm = (roundTripMax - roundTripMin) * 1000;
const report = {
  scope: 'Corrected scratch CSG control, not a product change',
  dimensionsA, dimensionsB, matrixA: a.matrixWorld.toArray(), matrixB: b.matrixWorld.toArray(),
  boundsA, boundsB, certifiedInputHeightMm, outputSizeMm: sizeMm, roundTripHeightMm,
  volumeA, volumeB, volumeDifferenceRatio, volumeMm3, clashType,
  filteredByTolerance, filteredByFillRatio,
  exactGeometry: 'B is strictly contained in A; the exact intersection is B and is below the threshold',
  conclusion: 'The certified exact-input bound does not preserve the current CSG plus consumer floating-output decision',
  worldPoints, outputPositionType: position.array.constructor.name,
  outputMatrixAutoUpdate: output.matrixAutoUpdate
};
fs.writeFileSync(new URL('./output-overrun-reproduction.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, worldPoints: undefined }, null, 2));
