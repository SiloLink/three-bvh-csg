import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import * as T from '../../../../review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import { Brush, Evaluator, INTERSECTION, computeMeshVolume } from '../../root/variants/vertical-control/csg/src/index.js';
import { worldZBounds, intervalOverlapHeightMm } from './world-z-bounds.mjs';

function box(x, y, z) {
  const g = new T.BoxGeometry(1, 1, 1);
  const old = g.attributes.position;
  const array = new Float64Array(old.count * 3);
  for (let i = 0; i < old.count; i++) {
    array[3 * i] = old.getX(i) * x;
    array[3 * i + 1] = old.getY(i) * y;
    array[3 * i + 2] = old.getZ(i) * z;
  }
  g.setAttribute('position', new T.BufferAttribute(array, 3));
  return g;
}
function brush(g, matrix) {
  const b = new Brush(g);
  b.matrixAutoUpdate = false;
  b.matrix.copy(matrix);
  b.matrixWorld.copy(matrix);
  return b;
}
function zRange(mesh) {
  let min = Infinity, max = -Infinity;
  const position = mesh.geometry.attributes.position;
  const p = new T.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    min = Math.min(min, p.z); max = Math.max(max, p.z);
  }
  return { min, max, heightMm: (max - min) * 1000 };
}
const evaluator = new Evaluator();
evaluator.useCDTClipping = true;
evaluator.useGroups = false;
evaluator.attributes = ['position', 'normal'];
const start = performance.now();
let attempts = 0;
let evaluations = 0;
const examples = [];
const errors = [];
const shears = [.1, .2, .3, .4, .5, .6, .7, .8, .9, 1, 1.1, 1.25, 1.5, 2, 3, 10, 100];
for (const shear of shears) {
  for (const offset of [0, .1, .123456789, .25, .3, .49, .7]) {
  for (const margin of [1e-18, 3e-18, 5e-18, 1e-17, 1e-16, 1e-15, 1e-14, 1e-12]) {
    if (performance.now() - start > 20000) break;
    const height = .0101 - margin;
    const matrixA = new T.Matrix4().set(1, 0, 0, 0, 0, 1, 0, 0, shear, 0, 1, 0, 0, 0, 0, 1);
    const a = brush(box(4, 4, 4 * shear + 1), matrixA);
    const b = brush(box(1, 1, height), new T.Matrix4().makeTranslation(offset, 0, 0));
    const boundsA = worldZBounds(a.geometry, a.matrixWorld);
    const boundsB = worldZBounds(b.geometry, b.matrixWorld);
    const certifiedHeightMm = intervalOverlapHeightMm(boundsA, boundsB);
    attempts++;
    if (certifiedHeightMm === null || certifiedHeightMm > 10.1) continue;
    try {
      const result = evaluator.evaluate(a, b, INTERSECTION);
      evaluations++;
      const range = zRange(result);
      const volumeMm3 = computeMeshVolume(result) * 1e9;
      if (range.heightMm > 10.1 && volumeMm3 > 1) {
        examples.push({ shear, offset, margin, inputDimensionsA: [4, 4, 4 * shear + 1], inputDimensionsB: [1, 1, height],
          matrixA: matrixA.toArray(), matrixB: b.matrixWorld.toArray(), certifiedHeightMm, boundsA, boundsB,
          outputRange: range, outputPositionType: result.geometry.attributes.position.array.constructor.name,
          outputPositionCount: result.geometry.attributes.position.count, volumeMm3,
          volumeA: computeMeshVolume(a), volumeB: computeMeshVolume(b),
          outputPositions: Array.from(result.geometry.attributes.position.array) });
        if (examples.length >= 5) break;
      }
    } catch (error) { errors.push({ shear, margin, error: error.message }); }
    a.geometry.dispose(); b.geometry.dispose();
  }
  if (examples.length >= 5 || performance.now() - start > 20000) break;
  }
  if (examples.length >= 5 || performance.now() - start > 20000) break;
}
const report = { attempts, evaluations, examples, errors, elapsedMs: performance.now() - start };
fs.writeFileSync(new URL('./output-overrun-search-moderate.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, examples: examples.map(({ outputPositions, ...rest }) => rest) }, null, 2));
