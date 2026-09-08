import fs from 'node:fs';
import inspector from 'node:inspector';
import {promisify} from 'node:util';
import {createNarrowPhaseRuntime} from '../root/variants/adaptive-only/backend/src/core/narrow/narrow-phase.js';
import {Evaluator} from '../root/variants/adaptive-only/backend/node_modules/three-bvh-csg/src/index.js';
const dir=new URL('./bvg-v1/',import.meta.url),project=JSON.parse(fs.readFileSync(new URL('project.json',dir)));
const pairs=JSON.parse(fs.readFileSync(new URL('hot-batches.json',dir))).batches.find(b=>b.batchNumber===241).pairs;
const runtime=await createNarrowPhaseRuntime({projectDescriptor:project,cacheObjects:true,narrowPhaseGeometryBudgetBytes:512*1048576});
await runtime.runPairs({pairs:pairs.slice(0,1)});
const session=new inspector.Session();session.connect();const post=promisify(session.post).bind(session);await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});
let operations=[];const original=Evaluator.prototype.evaluate;
Evaluator.prototype.evaluate=function(a,b,...rest){const t=performance.now(),result=original.call(this,a,b,...rest);operations.push({ms:performance.now()-t,trianglesA:(a.geometry.index?.count??a.geometry.attributes.position.count)/3,trianglesB:(b.geometry.index?.count??b.geometry.attributes.position.count)/3,outputTriangles:(result.geometry.index?.count??result.geometry.attributes.position.count)/3});return result;};
const results=[];await post('Profiler.start');
for(const [index,pair] of pairs.entries()){
 operations=[];const r=await runtime.runPairs({pairs:[pair],includeTraceFields:true});results.push({index,pair,operations,timing:r.timing,result:r.results[0]});
 if((index+1)%25===0)console.log('profiled',index+1);
}
const {profile}=await post('Profiler.stop');session.disconnect();runtime.dispose();
fs.writeFileSync(new URL('hot-241-adaptive.cpuprofile',dir),JSON.stringify(profile));fs.writeFileSync(new URL('hot-241-diagnostics.json',dir),JSON.stringify(results,null,2));
const byId=new Map(profile.nodes.map(n=>[n.id,n]));const byFrame=new Map();for(const [i,id] of profile.samples.entries()){const n=byId.get(id),f=n.callFrame,key=`${f.functionName||'(anonymous)'} @ ${f.url}:${f.lineNumber+1}`;byFrame.set(key,(byFrame.get(key)||0)+(profile.timeDeltas[i]||0));}
console.log(JSON.stringify({samples:profile.samples.length,topSelf:[...byFrame].sort((a,b)=>b[1]-a[1]).slice(0,18),true:results.filter(r=>r.result.Collision==='TRUE').length,rawTrue:results.filter(r=>r.result.Trace?.rawCollision).length,toleranceFiltered:results.filter(r=>r.result.Trace?.filteredByTolerance).length,fillRatioFiltered:results.filter(r=>r.result.Trace?.filteredByFillRatio).length},null,2));
