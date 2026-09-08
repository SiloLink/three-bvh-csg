import { BufferAttribute, BoxGeometry } from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import { Brush, Evaluator, INTERSECTION, computeMeshVolume } from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/src/index.js';
function box(size=1) { const g = new BoxGeometry(size,size,size); for(const key of ['position','normal']) { const src=g.getAttribute(key); g.setAttribute(key,new BufferAttribute(new Float64Array(src.array),src.itemSize)); } return new Brush(g); }
for (const axis of [null,'x','y','z']) {
 for (const offset of [0,.2]) {
  const a=box(), b=box(); if(axis) b.scale[axis]=-1; b.position.x=offset; a.updateMatrixWorld();b.updateMatrixWorld();
  const e=new Evaluator();e.attributes=['position']; e.useCDTClipping=true;e.useGroups=false;
  const out=e.evaluate(a,b,INTERSECTION); console.log({axis,offset,expected:1-offset,volume:computeMeshVolume(out),triangleCount:out.geometry.drawRange.count/3});
 }
}
{
 const a=box(), b=box(2); a.updateMatrixWorld(); b.updateMatrixWorld(); const e=new Evaluator();e.attributes=['position'];e.useCDTClipping=true;e.useGroups=false; e.evaluate(a,b,INTERSECTION);
 a.disposeCacheData(); let error;try {e.evaluate(a,b,INTERSECTION);} catch(err){error=err.message} console.log({probe:'disposeCacheData then evaluate',error});
}
