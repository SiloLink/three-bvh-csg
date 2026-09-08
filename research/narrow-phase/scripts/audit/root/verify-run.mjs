import fs from 'node:fs';
import {createHash} from 'node:crypto';
const variant=process.argv[2],kind=process.argv[3]||'real';
const {createNarrowPhaseRuntime}=await import(`./variants/${variant}/backend/src/core/narrow/narrow-phase.js`);
const {Evaluator}=await import(`./variants/${variant}/csg/src/index.js`);
const project=JSON.parse(fs.readFileSync(new URL('./real-project.json',import.meta.url)));
const pairs=JSON.parse(fs.readFileSync(new URL(kind==='broad'?'./broad-sample-pairs.json':'./real-pairs.json',import.meta.url)));
const runtime=await createNarrowPhaseRuntime({projectDescriptor:project,narrowPhaseGeometryBudgetBytes:512*1024*1024});
let capture=false;const geometry=[];const original=Evaluator.prototype.evaluate;
function sha(a){return createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');}
Evaluator.prototype.evaluate=function(...args){const result=original.apply(this,args);if(capture){const g=result.geometry;geometry.push({position:sha(g.attributes.position.array),index:sha(g.index.array),normal:g.attributes.normal?sha(g.attributes.normal.array):null,drawRange:g.drawRange});}return result;};
// Prime identical input/geometry caches; no timing instrumentation inside predicates.
const warm=await runtime.runPairs({pairs});
const samples=[];for(let i=0;i<3;i++){const r=await runtime.runPairs({pairs});samples.push(r.timing);if(JSON.stringify(r.results)!==JSON.stringify(warm.results))throw new Error('unstable report');}
capture=true;const verification=await runtime.runPairs({pairs});
const result={variant,kind,pairCount:pairs.length,failed:verification.failed,positive:verification.results.filter(r=>r.Collision==='TRUE').length,samples,results:verification.results,geometry};
fs.writeFileSync(new URL(`./verify-${kind}-${variant}.json`,import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({variant,kind,pairCount:pairs.length,failed:result.failed,positive:result.positive,samples:samples.map(t=>({csg:t.csgEvaluateMs,total:t.durationMs,ops:t.csgOperationCount,dup:t.duplicateFastPathCount,aabb:t.csgAabbRejectedCount}))}));runtime.dispose();
