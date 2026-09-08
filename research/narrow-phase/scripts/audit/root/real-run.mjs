import fs from 'node:fs';
import {createNarrowPhaseRuntime} from './engine/backend/src/core/narrow/narrow-phase.js';
const project=JSON.parse(fs.readFileSync(new URL('./real-project.json',import.meta.url)));
const pairs=JSON.parse(fs.readFileSync(new URL('./real-pairs.json',import.meta.url)));
const runtime=await createNarrowPhaseRuntime({projectDescriptor:project,narrowPhaseGeometryBudgetBytes:512*1024*1024});
const output=[];
for(let i=0;i<pairs.length;i++){
 const r=await runtime.runPairs({pairs:[pairs[i]],includeTraceFields:true});
 output.push({pairIndex:i,...r});
 fs.writeFileSync(new URL('./real-baseline.json',import.meta.url),JSON.stringify(output,null,2));
 console.log(JSON.stringify({i,failed:r.failed,collision:r.results[0].Collision,ms:r.timing.durationMs,csgMs:r.timing.csgEvaluateMs,prepMs:r.timing.prepMs,error:r.results[0].Error}));
}
runtime.dispose();
