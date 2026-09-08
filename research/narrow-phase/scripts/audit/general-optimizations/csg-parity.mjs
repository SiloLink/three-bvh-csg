import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as T from '../../../review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import * as reference from '../root/variants/adaptive-only/csg/src/index.js';
import * as candidate from '../root/variants/edge-bounds/csg/src/index.js';

const ops = ['INTERSECTION', 'ADDITION', 'SUBTRACTION', 'REVERSE_SUBTRACTION', 'DIFFERENCE', 'HOLLOW_INTERSECTION', 'HOLLOW_SUBTRACTION'];
const summary = { analyticCases: 0, analyticOperations: 0, analyticReferenceFailures: 0, analyticCandidateFailures: 0, geometryChecks: 0, exceptions: [], differences: [] };
function hash(mesh) {
 const h = createHash('sha256'), g = mesh.geometry;
 for (const name of [...Object.keys(g.attributes).sort(), 'index']) {
  const a = name === 'index' ? g.index : g.attributes[name];
  h.update(JSON.stringify([name, a?.array.constructor.name, a?.itemSize, a?.normalized]));
  if (a) h.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
 }
 h.update(JSON.stringify({ groups: g.groups, drawRange: g.drawRange, matrix: mesh.matrix.elements, world: mesh.matrixWorld.elements }));
 return h.digest('hex');
}
function run(lib, aGeometry, bGeometry, aMatrix, bMatrix, cdt, groups, operationNames) {
 const a = new lib.Brush(aGeometry.clone()), b = new lib.Brush(bGeometry.clone());
 a.matrixAutoUpdate = b.matrixAutoUpdate = false;
 a.matrix.copy(aMatrix); b.matrix.copy(bMatrix); a.updateMatrixWorld(true); b.updateMatrixWorld(true);
 const e = new lib.Evaluator(); e.useCDTClipping = cdt; e.useGroups = groups;
 return operationNames.map(op => {
  try {
   const mesh = e.evaluate(a, b, lib[op]);
   return { hash: hash(mesh), volume: lib.computeMeshVolume(mesh) };
  } catch (error) { return { error: String(error) }; }
 });
}
function compare(label, a, b, names) {
 for (let i = 0; i < names.length; i++) {
  summary.geometryChecks++;
  if (a[i].error || b[i].error) summary.exceptions.push({ label, op: names[i], reference: a[i], candidate: b[i] });
  if (a[i].hash !== b[i].hash || !Object.is(a[i].volume, b[i].volume) || a[i].error !== b[i].error) {
   summary.differences.push({ label, op: names[i], reference: a[i], candidate: b[i] });
  }
 }
}
const identity = new T.Matrix4();
for (const cdt of [false, true]) for (const segments of [1, 2]) for (const x of [-2, -1, -.75, -.5, 0, .25, .5, .75, 1, 2]) for (const y of [0, .5, 1]) for (const dimensions of [[1, 1, 1], [2, 2, 2], [.5, .5, .5]]) {
 const pos = [x, y, 0], intersection = dimensions.reduce((v, d, i) => v * Math.max(0, Math.min(.5, pos[i] + d / 2) - Math.max(-.5, pos[i] - d / 2)), 1);
 const vb = dimensions.reduce((a, b) => a * b), expected = [intersection, 1 + vb - intersection, 1 - intersection, vb - intersection, 1 + vb - 2 * intersection];
 const ag = new T.BoxGeometry(1, 1, 1, segments, segments, segments), bg = new T.BoxGeometry(...dimensions, segments, segments, segments);
 const bm = new T.Matrix4().makeTranslation(...pos), names = ops.slice(0, 5);
 const a = run(reference, ag, bg, identity, bm, cdt, false, names), b = run(candidate, ag, bg, identity, bm, cdt, false, names);
 compare({ family: 'analytic-box', cdt, segments, pos, dimensions }, a, b, names);
 for (let i = 0; i < expected.length; i++) {
  summary.analyticOperations++;
  summary.analyticReferenceFailures += !Number.isFinite(a[i].volume) || Math.abs(a[i].volume - expected[i]) > 1e-5;
  summary.analyticCandidateFailures += !Number.isFinite(b[i].volume) || Math.abs(b[i].volume - expected[i]) > 1e-5;
 }
 summary.analyticCases++;
}

// Geometry families, precision, splitter, grouping and transforms are independent of IFC models.
const forms = [new T.BoxGeometry(1, 1.3, .8, 2, 2, 2), new T.SphereGeometry(.8, 10, 7), new T.TorusGeometry(.8, .25, 6, 10), new T.CylinderGeometry(.6, .9, 1.2, 10), new T.PlaneGeometry(2, 2, 3, 3)];
function precision(g, Float) {
 const copy = g.clone();
 for (const name of Object.keys(copy.attributes)) {
  const a = copy.attributes[name]; copy.setAttribute(name, new T.BufferAttribute(new Float(a.array), a.itemSize, a.normalized));
 }
 return copy;
}
const transforms = [identity,
 new T.Matrix4().makeRotationFromEuler(new T.Euler(.23, -.41, .67)).setPosition(1e4, -2e4, 3e4),
 new T.Matrix4().makeScale(-1, 2, .6),
 new T.Matrix4().set(1, .35, 0, 3, 0, 1, .2, -4, .1, 0, 1, 5),
 new T.Matrix4().makeScale(1e-4, 1e-4, 1e-4),
 new T.Matrix4().makeScale(1e4, 1e4, 1e4)
];
for (const [shape, form] of forms.entries()) for (const Float of [Float32Array, Float64Array]) for (const cdt of [false, true]) for (const [ti, transform] of transforms.entries()) {
 const ag = precision(form, Float), bg = precision(forms[(shape + 1) % forms.length], Float);
 const bm = transform.clone().multiply(new T.Matrix4().makeRotationZ(.19)).multiply(new T.Matrix4().makeTranslation(.23, -.17, .09));
 const groups = ti % 2 === 0;
 const a = run(reference, ag, bg, transform, bm, cdt, groups, ops), b = run(candidate, ag, bg, transform, bm, cdt, groups, ops);
 compare({ family: 'general', shape, precision: Float.name, cdt, transform: ti, groups }, a, b, ops);
}
fs.writeFileSync(new URL('./csg-parity.json', import.meta.url), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (summary.differences.length || summary.exceptions.length) process.exitCode = 1;
