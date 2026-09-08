import fs from 'node:fs';
import {createRequire} from 'node:module';
import {incircle} from './predicate-lab/node_modules/robust-predicates/index.js';
const require=createRequire('__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head/package.json');
const exact=require('robust-in-sphere')[4];
let seed=0x1739082;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const points=[];let mismatch=0,zero=0;
for(let i=0;i<100000;i++){
 const exponent=[-50,-20,-6,0,20,50][i%6],s=2**exponent;
 let p;
 if(i%4===0)p=Array.from({length:4},()=>[(rand()-.5)*s,(rand()-.5)*s]);
 else if(i%4===1){const shift=(i%2?1e6:0)*s;p=[[shift+s,shift],[shift,shift+s],[shift-s,shift],[shift,shift-s*(1+(i%3-1)*Number.EPSILON)]];}
 else if(i%4===2){p=Array.from({length:4},()=>{const x=rand()*s;return[x,x*(1+(rand()-.5)*1e-13)];});}
 else{p=Array.from({length:3},()=>[Math.floor(rand()*8)*s,Math.floor(rand()*8)*s]);p.push([...p[i%3]]);}
 const a=exact(...p),b=incircle(...p.flat());if(a===0)zero++;if(Math.sign(a)!==Math.sign(b)){mismatch++;if(mismatch<4)console.log('mismatch',p,a,b);}
 points.push(p);
}
let sink=0;const timing={};for(const [name,fn] of [['exact',p=>exact(...p)],['adaptive',p=>incircle(...p.flat())]]){const t=performance.now();for(const p of points)sink+=Math.sign(fn(p));timing[name]=performance.now()-t;}
const result={count:points.length,zero,mismatch,timing,sink};console.log(JSON.stringify(result));fs.writeFileSync(new URL('./predicate-parity-results.json',import.meta.url),JSON.stringify(result,null,2));
