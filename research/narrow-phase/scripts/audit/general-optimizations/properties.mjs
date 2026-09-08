import fs from 'node:fs';
import * as T from '../../../review-artifacts/csg-pr2/head/node_modules/three/build/three.module.js';
import {MeshBVH} from '../../../review-artifacts/csg-pr2/head/node_modules/three-mesh-bvh/src/index.js';
import {raycastFirstMinimal,raycastFirstSide} from '../root/variants/ray-side/csg/src/core/operations/raycastSide.js';
import {writeEdgeBounds,separatedEdges,separatedPoint} from '../root/variants/edge-bounds/csg/src/core/edgeBounds.js';
import {minimumAreaRect2D} from '../root/variants/adaptive-only/backend/src/core/geometry/oriented-box.js';
let seed=0x6a09e667;const random=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const uniform=()=>random()*2-1;
let rayChecks=0,rayErrors=[];
const forms=[new T.BoxGeometry(2,3,4),new T.SphereGeometry(1,12,8),new T.TorusGeometry(1,.3,8,16),new T.PlaneGeometry(3,2,4,4)];
const soup=new T.BufferGeometry();soup.setAttribute('position',new T.BufferAttribute(new Float64Array(Array.from({length:64*9},uniform)),3));soup.computeVertexNormals();forms.push(soup);
const tied=new T.BufferGeometry();tied.setAttribute('position',new T.BufferAttribute(new Float64Array([-1,-1,0,1,-1,0,0,1,0,-1,-1,0,0,1,0,1,-1,0]),3));tied.addGroup(0,3,0);tied.addGroup(3,3,1);forms.push(tied);
for(const [shape,form] of forms.entries())for(const indirect of [false,true])for(const Float of [Float32Array,Float64Array])for(const scale of [1e-6,1,1e6]){
 const g=form.clone();const attr=g.attributes.position;g.setAttribute('position',new T.BufferAttribute(new Float(attr.array),3));
 g.scale(scale,scale,scale);if(shape%2)g.translate(scale*1000,-scale*2000,scale*500);g.computeBoundingBox();
 const box=g.boundingBox,center=box.getCenter(new T.Vector3()),extent=box.getSize(new T.Vector3()).length()||scale;
 const bvh=new MeshBVH(g,{indirect,targetLeafSize:3+(shape%3)*3,strategy:shape%3});
 const origin=new T.Vector3(),direction=new T.Vector3(),ray=new T.Ray(origin,direction);
 for(let i=0;i<1000;i++){
  origin.set(uniform(),uniform(),uniform()).multiplyScalar(extent).add(center);direction.set(uniform(),uniform(),uniform()).normalize();
  if(i%4===0)direction.copy(center).sub(origin).normalize();
  if(i%7===0)direction.set(i%2?1:-1,0,i%3===0?-0:0);
  if(i%13===0)origin.fromBufferAttribute(g.attributes.position,i%g.attributes.position.count);
  if(i%29===0)origin.copy(center);
  const near=i%17===0?extent*.05:0,far=i%19===0?extent:Infinity;
  const a=bvh.raycastFirst(ray,T.DoubleSide,near,far),b=raycastFirstMinimal(bvh,ray,near,far);
  const equal=(a===null&&b===null)||(a&&b&&a.faceIndex===b.faceIndex&&Object.is(a.distance,b.distance)&&Object.is(a.point.x,b.x)&&Object.is(a.point.y,b.y)&&Object.is(a.point.z,b.z));
  if(!equal&&rayErrors.length<8)rayErrors.push({shape,indirect,Float:Float.name,scale,i,a,b:{...b},origin:origin.toArray(),direction:direction.toArray()});
  if(near===0&&far===Infinity){const side=a&&ray.direction.dot(a.face.normal)>0?-1:1;if(raycastFirstSide(bvh,ray)!==side)throw new Error('side differs');}
  rayChecks++;
 }
}
let edgeChecks=0,pointChecks=0,edgeRejects=0,pointRejects=0,boundsErrors=[];
const bounds=[],a=new T.Line3(),b=new T.Line3(),c1=new T.Vector3(),c2=new T.Vector3(),v=new T.Vector3(),q=new T.Vector3();
for(let i=0;i<300000;i++){
 const exponent=[-300,-150,-16,-8,0,8,16,100,150,300][i%10],scale=10**exponent;
 for(const p of [a.start,a.end,b.start,b.end,v])p.set(uniform()*scale,uniform()*scale,uniform()*scale);
 if(i%3===0)b.start.copy(a.end);
 if(i%5===0)b.end.copy(b.start);
 if(i%11===0)a.end.copy(a.start);
 if(i%17===0){a.start.set(1e16,0,0);a.end.set(1,0,0);b.start.set(0,0,0);b.end.set(0,1,0);v.set(0,0,0);}
 const threshold=1e-16*Math.max(1,scale);
 writeEdgeBounds(a,bounds,0);writeEdgeBounds(b,bounds,4);
 const skip=separatedEdges(bounds,0,4,threshold),d=a.distanceSqToLine3(b,c1,c2);edgeChecks++;edgeRejects+=skip;
 if(skip&&d<threshold&&boundsErrors.length<8)boundsErrors.push({kind:'edge',i,d,threshold,a,b,bounds:[...bounds]});
 const pskip=separatedPoint(bounds,0,v,threshold),t=a.closestPointToPointParameter(v,true);a.at(t,q);const pd=v.distanceToSquared(q);pointChecks++;pointRejects+=pskip;
 if(pskip&&pd<threshold&&boundsErrors.length<8)boundsErrors.push({kind:'point',i,pd,threshold,a,v,bounds:[...bounds]});
}
let rectangleCounterexample=null;
for(let i=0;i<200000&&!rectangleCounterexample;i++){
 const w=1+random()*10,h=1+random()*10;
 const points=Array.from({length:3+i%5},()=>[random()*w,random()*h]);
 const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
 const outer=[[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY]];
 const innerRect=minimumAreaRect2D(points),outerRect=minimumAreaRect2D(outer);
 if(innerRect.width>outerRect.width*1.01)rectangleCounterexample={points,outer,innerRect,outerRect};
}
const result={rayChecks,rayErrors,edgeChecks,pointChecks,edgeRejects,pointRejects,boundsErrors,rectangleCounterexample};
fs.writeFileSync(new URL('./properties.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(rayErrors.length||boundsErrors.length)process.exitCode=1;
