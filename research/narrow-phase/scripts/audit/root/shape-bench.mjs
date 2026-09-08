import fs from 'node:fs';
import { BoxGeometry, SphereGeometry, BufferAttribute } from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import * as lib from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/src/index.js';
const cases = [
 {name:'nested-spheres',shape:'sphere',seg:64,offset:[0,0,0],scale:2},
 {name:'crossing-spheres',shape:'sphere',seg:48,offset:[0.5,0.25,0],scale:1},
 {name:'coplanar-boxes',shape:'box',seg:16,offset:[0.3,0,0],scale:1},
 {name:'rotated-boxes',shape:'box',seg:12,offset:[0.3,0.1,0],scale:1,rot:[0.15,0.2,0.3]},
];
function make(c) {
 function geo(scale){const g=c.shape==='sphere'?new SphereGeometry(scale,c.seg,c.seg):new BoxGeometry(scale,scale,scale,c.seg,c.seg,c.seg); for(const key of ['position','normal']) {const a=g.attributes[key];g.setAttribute(key,new BufferAttribute(new Float64Array(a.array),a.itemSize));}return g;}
 const a=new lib.Brush(geo(1)),b=new lib.Brush(geo(c.scale));b.position.fromArray(c.offset); if(c.rot)b.rotation.fromArray(c.rot);a.updateMatrixWorld();b.updateMatrixWorld();a.prepareGeometry();b.prepareGeometry();return [a,b];
}
function evaluate(e,a,b){const r=e.evaluate(a,b,lib.INTERSECTION);const bytes=Buffer.concat([Buffer.from(r.geometry.index.array.buffer),Buffer.from(r.geometry.attributes.position.array.buffer)]);const volume=lib.computeMeshVolume(r);r.geometry.dispose();return {bytes,volume,count:r.geometry.index.count/3};}
const report=[];
for(const c of cases){const [a,b]=make(c);const evaluators=[['normal',['position','normal']],['position',['position']]].map(([name,attrs])=>{const e=new lib.Evaluator();e.attributes=attrs;e.useGroups=false;e.useCDTClipping=true;return {name,e,samples:[]};});let first=null,parity=true;
 for(let iter=0;iter<9;iter++)for(const {name,e,samples} of (iter%2?[...evaluators].reverse():evaluators)){const t=performance.now(); const r=evaluate(e,a,b);const ms=performance.now()-t;if(iter>=2)samples.push(ms);if(!first)first=r;parity&&=r.bytes.equals(first.bytes);}
 report.push({case:c.name,trianglesPerBrush:a.geometry.index.count/3,parity,volume:first.volume,resultTriangles:first.count,timing:evaluators.map(({name,samples})=>({name,medianMs:samples.sort((a,b)=>a-b)[3],samples}))});
}
console.log(JSON.stringify(report,null,2));
