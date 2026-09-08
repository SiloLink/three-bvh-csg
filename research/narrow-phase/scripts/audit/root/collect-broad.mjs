import fs from 'node:fs';
import {buildBroadPhaseDataset,runBroadPhaseCandidateBatches} from './engine/backend/src/core/broad/broad-phase.js';
const project=JSON.parse(fs.readFileSync(new URL('./real-project.json',import.meta.url)));
project.models=project.models.filter(m=>['architecture','structure'].includes(m.discipline));
const dataset=await buildBroadPhaseDataset(project,{onDisciplineEnd:(d,s)=>console.log('loaded',d,s.objectCount)});
const groups=new Map();for(const o of dataset.objects)groups.set(`${o.modelId}|${o.entityType}`,{modelGuid:o.modelId,discipline:o.discipline,entityType:o.entityType});
const selected=[...groups.values()].filter(g=>['IfcWall','IfcSlab','IfcColumn','IfcBeam','IfcCurtainWall','IfcBuildingElementProxy'].includes(g.entityType));
const seen=new Set(),pairs=[];const stop=new Error('audit sample complete');
for(let i=0;i<selected.length;i++)for(let j=i;j<selected.length;j++){
 let ruleCount=0;
 try{await runBroadPhaseCandidateBatches(dataset,{enabledPairs:[{source:selected[i],target:selected[j],toleranceMm:{horizontal:0,vertical:0}}]},{batchSize:25,onBatch:async batch=>{for(const p of batch){if(!seen.has(p.pairId)){pairs.push(p);seen.add(p.pairId);}ruleCount++;}if(ruleCount>=25)throw stop;}});}catch(e){if(e!==stop)throw e;}
 if(pairs.length>=500)break;
}
fs.writeFileSync(new URL('./broad-sample-pairs.json',import.meta.url),JSON.stringify(pairs.slice(0,500),null,2));
console.log('pairs',Math.min(500,pairs.length),'objects',dataset.objects.length);
