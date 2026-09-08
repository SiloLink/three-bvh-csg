import { BufferAttribute, BoxGeometry } from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import { Pool } from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/src/core/utils/Pool.js';
import { Brush, Evaluator, INTERSECTION, CDTTriangleSplitter } from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/src/index.js';
import { createHash } from 'node:crypto';
const pools = new Set();
const getInstance = Pool.prototype.getInstance;
Pool.prototype.getInstance = function () { pools.add(this); return getInstance.call(this); };
const clearPool = process.argv.includes('--clear');
const triangulate = CDTTriangleSplitter.prototype.triangulate;
if (clearPool) CDTTriangleSplitter.prototype.triangulate = function () {
  const vp = [...pools].find(pool => pool._pool[0]?.isVector3); vp?.clear();
  return triangulate.call(this);
};
const loops = Number(process.argv.at(-1)) || 1000;
const a = new Brush(new BoxGeometry(2, 2, 2, 2, 2, 2));
const b = new Brush(new BoxGeometry(2, 2, 2, 2, 2, 2));
for (const brush of [a, b]) { for (const key of ['position', 'normal']) { const src = brush.geometry.getAttribute(key); brush.geometry.setAttribute(key, new BufferAttribute(new Float64Array(src.array), src.itemSize)); } }
b.position.set(.31, .27, .23); b.rotation.set(.1,.2,.3); a.updateMatrixWorld(); b.updateMatrixWorld();
const evaluator = new Evaluator(); evaluator.useGroups = false; evaluator.useCDTClipping = true; evaluator.attributes = ['position','normal'];
const hashes = new Set(); const milestones = [];
let vectorPool;
function sample(iteration) { global.gc(); milestones.push({iteration, heapUsed: process.memoryUsage().heapUsed, vectorPoolIndex:vectorPool?._index, retainedVectorCount:vectorPool?._pool.length}); }
sample(0);
for (let i=0; i<loops; i++) {
  const result = evaluator.evaluate(a,b,INTERSECTION); const hash = createHash('sha256');
  for (const key of ['position','normal']) { const data=result.geometry.getAttribute(key).array; hash.update(new Uint8Array(data.buffer,data.byteOffset,data.byteLength)); }
  const indices=result.geometry.index.array; hash.update(new Uint8Array(indices.buffer,indices.byteOffset,indices.byteLength)); hashes.add(hash.digest('hex'));
  result.geometry.dispose(); evaluator.reset();
  vectorPool = [...pools].find(pool=>pool._pool[0]?.isVector3);
  if ([1,10,100,500,1000,2000,loops].includes(i+1)) sample(i+1);
}
console.log(JSON.stringify({clearPool,loops,hashes:[...hashes],milestones},null,2));
