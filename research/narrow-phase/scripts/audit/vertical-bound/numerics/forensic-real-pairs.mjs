import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as T from '../../../../review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import { worldZBounds, worldZBoundsFromBox, intervalOverlapHeightMm } from './world-z-bounds.mjs';

delete process.env.CSG_VERTICAL_AUDIT_DIR;
const variant = process.argv[2] ?? 'vertical-shadow';
const { createNarrowPhaseRuntime } = await import(`../../root/variants/${variant}/backend/src/core/narrow/narrow-phase.js`);
const { Evaluator, computeMeshVolume } = await import(`../../root/variants/${variant}/backend/node_modules/three-bvh-csg/src/index.js`);
const project = JSON.parse(fs.readFileSync(new URL('../wbdg-office/project.json', import.meta.url)));
const fixtures = JSON.parse(fs.readFileSync(new URL('./real-pairs.json', import.meta.url)));
const hash = array => createHash('sha256').update(Buffer.from(array.buffer, array.byteOffset, array.byteLength)).digest('hex');
const view = new DataView(new ArrayBuffer(8));
function exact(x) {
  assert.ok(Number.isFinite(x));
  view.setFloat64(0, x, false);
  const word = view.getBigUint64(0, false);
  const exponent = Number(word >> 52n & 2047n);
  const mantissa = (word & ((1n << 52n) - 1n)) + (exponent ? 1n << 52n : 0n);
  return { n: word >> 63n ? -mantissa : mantissa, e: exponent ? exponent - 1075 : -1074 };
}
function add(a, b) {
  const e = Math.min(a.e, b.e);
  return { n: (a.n << BigInt(a.e - e)) + (b.n << BigInt(b.e - e)), e };
}
function mul(a, b) { return { n: a.n * b.n, e: a.e + b.e }; }
function cmp(a, b) { const n = add(a, { n: -b.n, e: b.e }).n; return n < 0n ? -1 : n > 0n ? 1 : 0; }
function exactZ(p, e) {
  return add(add(add(mul(exact(p[0]), exact(e[2])), mul(exact(p[1]), exact(e[6]))), mul(exact(p[2]), exact(e[10]))), exact(e[14]));
}
function boxArray(box) { return { min: box.min.toArray(), max: box.max.toArray() }; }
function pointSetBounds(points, indices) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const i of indices) for (let j = 0; j < 3; j++) {
    min[j] = Math.min(min[j], points[i][j]); max[j] = Math.max(max[j], points[i][j]);
  }
  return { min, max, heightMm: (max[2] - min[2]) * 1000 };
}
function topology(g) {
  const p = g.attributes.position;
  const ids = new Map(), edges = new Map(), faces = new Map(), orientedFaces = new Map();
  const vertex = i => {
    const key = `${p.getX(i)},${p.getY(i)},${p.getZ(i)}`;
    if (!ids.has(key)) ids.set(key, ids.size);
    return ids.get(key);
  };
  const n = g.index ? g.index.count : p.count;
  let degenerate = 0;
  for (let i = 0; i < n; i += 3) {
    const t = [0, 1, 2].map(j => vertex(g.index ? g.index.getX(i + j) : i + j));
    const faceKey = [...t].sort((a, b) => a - b).join(',');
    faces.set(faceKey, (faces.get(faceKey) ?? 0) + 1);
    const start = t.indexOf(Math.min(...t));
    const orientedKey = [t[start], t[(start + 1) % 3], t[(start + 2) % 3]].join(',');
    orientedFaces.set(orientedKey, (orientedFaces.get(orientedKey) ?? 0) + 1);
    if (new Set(t).size < 3) degenerate++;
    for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
      const key = `${Math.min(a, b)},${Math.max(a, b)}`;
      const edge = edges.get(key) ?? { count: 0, orientation: 0 };
      edge.count++; edge.orientation += a < b ? 1 : -1; edges.set(key, edge);
    }
  }
  const histogram = values => Object.fromEntries([...new Set(values)].sort((a, b) => a - b).map(n => [n, values.filter(v => v === n).length]));
  return { weldedVertices: ids.size, edges: edges.size, triangles: n / 3, degenerateIndexTriangles: degenerate,
    uniqueUnorientedFaces: faces.size, uniqueOrientedFaces: orientedFaces.size,
    faceMultiplicityHistogram: histogram([...faces.values()]), edgeIncidenceHistogram: histogram([...edges.values()].map(e => e.count)),
    boundaryEdges: [...edges.values()].filter(e => e.count === 1).length,
    nonTwoIncidenceEdges: [...edges.values()].filter(e => e.count !== 2).length,
    nonCancellingOrientationEdges: [...edges.values()].filter(e => e.orientation !== 0).length };
}
function snapshotInput(b) {
  const g = b.geometry, p = g.attributes.position;
  const local = [], world = [], v = new T.Vector3();
  let nonfinite = 0, boxViolations = 0, exactViolations = 0;
  const boxBounds = worldZBoundsFromBox(g.boundingBox, b.matrixWorld);
  const scanBounds = worldZBounds(g, b.matrixWorld);
  for (let i = 0; i < p.count; i++) {
    const row = [p.getX(i), p.getY(i), p.getZ(i)]; local.push(row);
    if (!row.every(Number.isFinite)) { nonfinite++; continue; }
    v.set(...row);
    if (!g.boundingBox.containsPoint(v)) boxViolations++;
    const z = exactZ(row, b.matrixWorld.elements);
    if (!boxBounds.certified || cmp(z, exact(boxBounds.min)) < 0 || cmp(z, exact(boxBounds.max)) > 0) exactViolations++;
    v.applyMatrix4(b.matrixWorld); world.push(v.toArray());
  }
  const all = Array.from({ length: p.count }, (_, i) => i);
  const localExtents = pointSetBounds(local, all);
  const worldExtents = pointSetBounds(world, all);
  const stored = boxArray(g.boundingBox);
  return { brushUuid: b.uuid, geometryUuid: g.uuid, userData: b.userData,
    positionCount: p.count, positionType: p.array.constructor.name, positionHash: hash(p.array), indexHash: g.index ? hash(g.index.array) : null,
    matrix: b.matrix.toArray(), matrixWorld: b.matrixWorld.toArray(), matrixAutoUpdate: b.matrixAutoUpdate,
    storedLocalBox: stored, localExtents, worldExtents, boxBounds, scanBounds,
    storedBoxEqualsScannedExtrema: JSON.stringify(stored) === JSON.stringify({ min: localExtents.min, max: localExtents.max }),
    nonfinite, boxViolations, exactViolations, topology: topology(g), volumeMm3: computeMeshVolume(b) * 1e9 };
}
function inspectOutput(output, a, b) {
  const g = output.geometry, p = g.attributes.position, v = new T.Vector3(), world = [];
  for (let i = 0; i < p.count; i++) world.push(v.fromBufferAttribute(p, i).applyMatrix4(output.matrixWorld).toArray());
  const all = Array.from({ length: p.count }, (_, i) => i), used = new Set();
  const end = Math.min(g.index ? g.index.count : p.count, g.drawRange.start + g.drawRange.count);
  for (let i = g.drawRange.start; i < end; i++) used.add(g.index ? g.index.getX(i) : i);
  const inputMin = Math.max(a.boxBounds.min, b.boxBounds.min), inputMax = Math.min(a.boxBounds.max, b.boxBounds.max);
  const outside = all.filter(i => world[i][2] < inputMin || world[i][2] > inputMax);
  const outsideUsed = outside.filter(i => used.has(i));
  const extremeIndices = [...all].sort((x, y) => world[x][2] - world[y][2]);
  const extremes = [...new Set([...extremeIndices.slice(0, 2), ...extremeIndices.slice(-2)])].map(i => ({ i, used: used.has(i), world: world[i], local: [p.getX(i), p.getY(i), p.getZ(i)] }));
  const retainedIndices = g.index ? Array.from(g.index.array).slice(g.drawRange.start, end) : all.slice(g.drawRange.start, end);
  let entirelyOutsideZTriangles = 0, anyOutsideZTriangles = 0;
  for (let i = 0; i < retainedIndices.length; i += 3) {
    const zs = retainedIndices.slice(i, i + 3).map(j => world[j][2]);
    if (Math.max(...zs) < inputMin || Math.min(...zs) > inputMax) entirelyOutsideZTriangles++;
    if (zs.some(z => z < inputMin || z > inputMax)) anyOutsideZTriangles++;
  }
  return { positionCount: p.count, positionType: p.array.constructor.name, indexCount: g.index?.count ?? null,
    positionHash: hash(p.array), indexHash: g.index ? hash(g.index.array) : null,
    drawRange: { start: g.drawRange.start, count: g.drawRange.count === Infinity ? 'Infinity' : g.drawRange.count },
    matrixWorld: output.matrixWorld.toArray(), matrixAutoUpdate: output.matrixAutoUpdate,
    usedPositionCount: used.size, unusedPositionCount: p.count - used.size,
    allPositionExtents: pointSetBounds(world, all), liveIndexExtents: pointSetBounds(world, used),
    certifiedInputOverlapHeightMm: intervalOverlapHeightMm(a.boxBounds, b.boxBounds),
    inputOverlapInterval: { min: inputMin, max: inputMax }, outsidePositions: outside.length, outsideUsedPositions: outsideUsed.length,
    entirelyOutsideZTriangles, anyOutsideZTriangles, extremes, volumeMm3: computeMeshVolume(output) * 1e9,
    topology: topology(g) };
}

const original = Evaluator.prototype.evaluate;
let current = null;
Evaluator.prototype.evaluate = function(a, b, ...rest) {
  const beforeA = snapshotInput(a), beforeB = snapshotInput(b);
  const result = original.call(this, a, b, ...rest);
  const output = inspectOutput(result, beforeA, beforeB);
  const afterA = snapshotInput(a), afterB = snapshotInput(b);
  current.operations.push({ beforeA, beforeB, output, inputsUnchanged: JSON.stringify(beforeA) === JSON.stringify(afterA) && JSON.stringify(beforeB) === JSON.stringify(afterB) });
  return result;
};
const runtime = await createNarrowPhaseRuntime({ projectDescriptor: project, cacheObjects: true, narrowPhaseGeometryBudgetBytes: 512 * 1048576 });
const cases = [];
for (const fixture of fixtures) {
  current = { pair: fixture, passes: [], operations: [] };
  const first = await runtime.runPairs({ pairs: [fixture], includeTraceFields: true });
  assert.equal(current.operations.length, first.timing.csgOperationCount);
  current.passes.push({ result: first.results[0], timing: first.timing, operationCount: current.operations.length });
  const firstCount = current.operations.length;
  const second = await runtime.runPairs({ pairs: [fixture], includeTraceFields: true });
  assert.equal(current.operations.length - firstCount, second.timing.csgOperationCount);
  current.passes.push({ result: second.results[0], timing: second.timing, operationCount: current.operations.length - firstCount });
  cases.push(current);
  console.log(JSON.stringify({ variant, pairId: fixture.pairId, passes: current.passes.map(x => ({ result: x.result, csgOperations: x.operationCount })),
    operations: current.operations.map(o => ({ inputsUnchanged: o.inputsUnchanged, boundsA: o.beforeA.worldExtents, boundsB: o.beforeB.worldExtents, output: o.output })) }));
}
runtime.dispose();
const report = { variant, cases, sourceFixture: '../wbdg-office/project.json', inputCsv: '../../general-optimizations/wbdg-office/edge-bounds-1.csv' };
fs.writeFileSync(new URL(`./real-forensic-${variant}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
