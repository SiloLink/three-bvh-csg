import fs from 'node:fs';
import {createHash} from 'node:crypto';
const [variant,kind='hot',repeatsArg='1']=process.argv.slice(2),repeats=Number(repeatsArg);
const {createNarrowPhaseRuntime}=await import(`../root/variants/${variant}/backend/src/core/narrow/narrow-phase.js`);
const {Evaluator}=await import(`../root/variants/${variant}/backend/node_modules/three-bvh-csg/src/index.js`);
const project=JSON.parse(fs.readFileSync(new URL(kind==='hot'?'../full-project-bench/bvg-v1/project.json':'../root/real-project.json',import.meta.url)));
const pairs=kind==='hot'?JSON.parse(fs.readFileSync(new URL('../full-project-bench/bvg-v1/hot-batches.json',import.meta.url))).batches.find(b=>b.batchNumber===241).pairs:JSON.parse(fs.readFileSync(new URL('../root/broad-sample-pairs.json',import.meta.url)));
const runtime=await createNarrowPhaseRuntime({projectDescriptor:project,cacheObjects:true,narrowPhaseGeometryBudgetBytes:512*1048576});
const sha=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
let capture=false;const geometries=[];const original=Evaluator.prototype.evaluate;
Evaluator.prototype.evaluate=function(...args){const o=original.apply(this,args);if(capture){const g=o.geometry;geometries.push({position:sha(g.attributes.position.array),normal:g.attributes.normal?sha(g.attributes.normal.array):null,index:g.index?sha(g.index.array):null,drawRange:g.drawRange});}return o;};
const warm=await runtime.runPairs({pairs});
const samples=[];for(let i=0;i<repeats;i++){const r=await runtime.runPairs({pairs});samples.push(r.timing);if(JSON.stringify(warm.results)!==JSON.stringify(r.results))throw new Error('unstable results');console.log(JSON.stringify({variant,kind,run:i,csgMs:r.timing.csgEvaluateMs,totalMs:r.timing.durationMs}));}
capture=true;const check=await runtime.runPairs({pairs,includeTraceFields:true});
if(geometries.length!==check.timing.csgOperationCount)throw new Error('CSG instrumentation did not match runtime module');
const output={variant,kind,pairCount:pairs.length,samples,results:check.results,geometries};fs.writeFileSync(new URL(`./probe-${kind}-${variant}.json`,import.meta.url),JSON.stringify(output,null,2));runtime.dispose();
