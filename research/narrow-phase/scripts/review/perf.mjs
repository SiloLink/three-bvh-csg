import { SphereGeometry } from './head/node_modules/three/build/three.module.js';
import * as head from './head/src/index.js';
import * as base from './base/src/index.js';
for (const segments of [32,64,128]) for(const [name,lib] of Object.entries({base,head})) {
 const a=new lib.Brush(new SphereGeometry(1,segments,segments)),b=new lib.Brush(new SphereGeometry(2,segments,segments));
 a.updateMatrixWorld();b.updateMatrixWorld();a.prepareGeometry();b.prepareGeometry();
 const e=new lib.Evaluator();e.attributes=['position'];e.useGroups=false;e.useCDTClipping=true;
 let rays=0; for (const brush of [a,b]) { const orig=brush.geometry.boundsTree.raycastFirst; brush.geometry.boundsTree.raycastFirst=function(...args){rays++;return orig.apply(this,args);}; }
 for(let i=0;i<3;i++)e.evaluate(a,b,lib.INTERSECTION);
 const samples=[];rays=0;
 for(let i=0;i<7;i++){const t=performance.now();e.evaluate(a,b,lib.INTERSECTION);samples.push(performance.now()-t);}
 samples.sort((a,b)=>a-b);
 console.log(JSON.stringify({name,trianglesPerBrush:a.geometry.index.count/3,medianMs:samples[3],raysPerEval:rays/7}));
}
