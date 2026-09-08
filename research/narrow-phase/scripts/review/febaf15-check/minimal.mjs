import {BoxGeometry, BufferAttribute, Triangle, Vector3} from '../head/node_modules/three/build/three.module.js';
import * as head from './source/src/index.js';
import * as base from '../base/src/index.js';
import * as control from '../control/src/index.js';
for (const cdt of [false,true]) for(const type of [Float32Array,Float64Array]) for(const [name,lib] of Object.entries({base,head,control})) {
 if (name === 'base' && type === Float64Array) continue;
 const create = (size) => {
  const g = new BoxGeometry(size,size,size,2,2,2);
  g.setAttribute('position',new BufferAttribute(new type(g.attributes.position.array),3));
  return new lib.Brush(g);
 };
 const a=create(1),b=create(2); b.position.x=-1; a.updateMatrixWorld(); b.updateMatrixWorld();
 const e=new lib.Evaluator(); e.attributes=['position'];e.useGroups=false;e.useCDTClipping=cdt;
 let results={};
 for(const op of ['INTERSECTION','SUBTRACTION','HOLLOW_INTERSECTION']) {
  const r=e.evaluate(a,b,lib[op]);
  let surface=0; const tri = new Triangle();
  for(let i=0;i<r.geometry.index.count;i+=3) {
   tri.a.fromBufferAttribute(r.geometry.attributes.position,r.geometry.index.getX(i));
   tri.b.fromBufferAttribute(r.geometry.attributes.position,r.geometry.index.getX(i+1));
   tri.c.fromBufferAttribute(r.geometry.attributes.position,r.geometry.index.getX(i+2));
   surface+=tri.getArea();
  }
  results[op]={volume:lib.computeMeshVolume(r),surface,triangles:r.geometry.index.count/3};
 }
 console.log(JSON.stringify({cdt,type:type.name,name,results}));
}
