import * as THREE from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import * as head from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/febaf15-check/source/src/index.js';
import * as base from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/base/src/index.js';
import * as control from '__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/control/src/index.js';
const {BoxGeometry, Matrix4} = THREE;
let remainingFailures = [];
let count = 0, regressions = [], headFailures = 0, baseFailures = 0, controlFailures=0;
const ops = ['INTERSECTION','ADDITION','SUBTRACTION','REVERSE_SUBTRACTION','DIFFERENCE'];
function run(lib, ax, bx, pos, segments, cdt, transform) {
 const a = new lib.Brush(new BoxGeometry(...ax, segments, segments, segments));
 const b = new lib.Brush(new BoxGeometry(...bx, segments, segments, segments));
 b.position.fromArray(pos);
 a.updateMatrixWorld(); b.updateMatrixWorld();
 if(transform) { a.applyMatrix4(transform); b.applyMatrix4(transform); a.updateMatrixWorld(); b.updateMatrixWorld(); }
 const e = new lib.Evaluator(); e.attributes=['position']; e.useGroups=false; e.useCDTClipping=cdt;
 return ops.map(op => lib.computeMeshVolume(e.evaluate(a,b,lib[op])));
}
const xs = [-2,-1,-0.75,-0.5,0,0.25,0.5,0.75,1,2];
for (const cdt of [false,true]) for (const segments of [1,2]) for(const x of xs) for(const y of [0,0.5,1]) for(const bx of [[1,1,1],[2,2,2],[0.5,0.5,0.5]]) {
 const ax=[1,1,1],pos=[x,y,0];
 const iv = ax.reduce((v,s,i)=>v*Math.max(0,Math.min(s/2,pos[i]+bx[i]/2)-Math.max(-s/2,pos[i]-bx[i]/2)),1);
 const vb=bx.reduce((a,b)=>a*b); const expected=[iv,1+vb-iv,1-iv,vb-iv,1+vb-2*iv];
 const h=run(head,ax,bx,pos,segments,cdt),b=run(base,ax,bx,pos,segments,cdt);
 const c=run(control,ax,bx,pos,segments,cdt);
 count++;
 for(let i=0;i<ops.length;i++) { const hf=Math.abs(h[i]-expected[i])>1e-5,bf=Math.abs(b[i]-expected[i])>1e-5; controlFailures+=Math.abs(c[i]-expected[i])>1e-5; headFailures+=hf; if(hf) remainingFailures.push({cdt,segments,pos,bx,op:ops[i],expected:expected[i],actual:h[i],base:b[i]}); baseFailures+=bf; if(hf&&!bf) regressions.push({cdt,segments,pos,bx,op:ops[i],expected:expected[i],head:h[i],base:b[i]}); }
}
console.log(JSON.stringify({count,remainingFailures,headFailures,baseFailures,controlFailures,regressionCount:regressions.length,byMode:{legacy:regressions.filter(r=>!r.cdt).length,cdt:regressions.filter(r=>r.cdt).length}},null,2));
