import fs from 'node:fs';
import {buildBroadPhaseDataset,runBroadPhaseCandidateBatches} from '../root/variants/baseline/backend/src/core/broad/broad-phase.js';
const name=process.argv[2]||'bvg-v1',dir=new URL(`./${name}/`,import.meta.url);
const project=JSON.parse(fs.readFileSync(new URL('project.json',dir))),matrix=JSON.parse(fs.readFileSync(new URL('matrix.json',dir)));
const result=JSON.parse(fs.readFileSync(new URL('adaptive-only-1.result.json',dir)));
const top=result.narrowPhase.timing.batchTimings.slice().sort((a,b)=>b.workerTiming.csgEvaluateMs-a.workerTiming.csgEvaluateMs).slice(0,10);
const wanted=new Set(top.map(b=>b.batchNumber)),batches=[];
const dataset=await buildBroadPhaseDataset(project);
const stats=await runBroadPhaseCandidateBatches(dataset,matrix,{batchSize:100,onBatch:async(pairs,info)=>{
 if(!wanted.has(info.batchNumber))return;
 const types={},objects=new Map();
 for(const pair of pairs){
  const k=`${pair.source.discipline}/${pair.source.entityType} - ${pair.target.discipline}/${pair.target.entityType}`;types[k]=(types[k]||0)+1;
  for(const index of [pair.sourceIndex,pair.targetIndex]){
   const o=dataset.objects[index];const key=`${o.modelId}/${o.globalId}`;objects.set(key,{modelId:o.modelId,globalId:o.globalId,name:o.name,entityType:o.entityType,geometryId:o.geometryId,count:(objects.get(key)?.count||0)+1});
  }
 }
 batches.push({batchNumber:info.batchNumber,adaptiveCsgMs:top.find(b=>b.batchNumber===info.batchNumber).workerTiming.csgEvaluateMs,types,frequentObjects:[...objects.values()].sort((a,b)=>b.count-a.count).slice(0,10),pairs});
}});
if(stats.candidateCount!==result.broadPhase.candidateCount)throw new Error(`candidate count mismatch: ${stats.candidateCount}`);
fs.writeFileSync(new URL('hot-batches.json',dir),JSON.stringify({candidateCount:stats.candidateCount,batches},null,2));
for(const b of batches)console.log(JSON.stringify({batchNumber:b.batchNumber,adaptiveCsgSeconds:b.adaptiveCsgMs/1000,types:b.types,topObjects:b.frequentObjects.slice(0,2)}));
