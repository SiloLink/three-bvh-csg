import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const [projectName,variant,repeat='1']=process.argv.slice(2);
if(!['vertical-control','vertical-shadow','vertical-skip'].includes(variant))throw new Error('unknown variant');
const root=fileURLToPath(new URL('./',import.meta.url)),dir=path.join(root,projectName),runName=`${variant}-${repeat}`;
if(variant==='vertical-shadow'){process.env.CSG_VERTICAL_AUDIT_DIR=path.join(dir,runName+'.shadow');fs.mkdirSync(process.env.CSG_VERTICAL_AUDIT_DIR,{recursive:true});}
const {runBroadNarrowReport}=await import(`../root/variants/${variant}/backend/src/runtime/clash-detection-runner.js`);
const {createLocalReportWriter}=await import(`../root/variants/${variant}/backend/src/io/reportWriters.js`);
const project=JSON.parse(fs.readFileSync(path.join(dir,'project.json'))),matrix=JSON.parse(fs.readFileSync(path.join(dir,'matrix.json')));
const writer=createLocalReportWriter({basePath:dir,outputPath:path.join(dir,runName+'.csv')});
const started=performance.now();let last=0,lastStage='';
const progressFile=path.join(dir,runName+'.progress.json');
let cancelled=false;process.on('SIGTERM',()=>{cancelled=true;});
function progress(p){
 const now=performance.now();if(now-last<15000&&lastStage===p.stage)return;
 const entry={project:projectName,variant,repeat,elapsedSeconds:+((now-started)/1000).toFixed(1),stage:p.stage,message:p.message,broad:p.broadPhase?{objectCount:p.broadPhase.objectCount,candidateCount:p.broadPhase.candidateCount,batchCount:p.broadPhase.batchCount}:undefined,processed:p.narrowPhase?.processed,total:p.narrowPhase?.total,progress:p.progress,currentBatch:p.narrowPhase?.currentBatch,activeBatches:p.narrowPhase?.progress?.activeBatches};
 last=now;lastStage=p.stage;fs.writeFileSync(progressFile,JSON.stringify(entry));console.log(JSON.stringify(entry));
}
try{
 const result=await runBroadNarrowReport({projectDescriptor:project,projectGuid:project.projectId,jobId:`full-benchmark-${projectName}`,detectionIdentity:crypto.createHash('sha256').update(JSON.stringify({project,matrix})).digest('hex'),matrix,writer,batchSize:100,usePersistentWorker:true,narrowPhaseWorkerCount:3,cacheNarrowPhaseObjects:true,cacheFrequencyThreshold:5,narrowPhaseGeometryBudgetMbTotal:1536,narrowPhaseSharedPrep:true,narrowPhaseShareUncached:true},{onProgress:progress,shouldCancel:()=>cancelled});
 const bytes=fs.readFileSync(path.join(dir,runName+'.csv'));
 result.benchmark={project:projectName,variant,repeat,processElapsedMs:performance.now()-started,csvSha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 fs.writeFileSync(path.join(dir,runName+'.result.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({complete:true,project:projectName,variant,repeat,durationSeconds:result.timing.durationSeconds,candidates:result.broadPhase.candidateCount,processed:result.narrowPhase.processed,succeeded:result.narrowPhase.succeeded,failed:result.narrowPhase.failed,rows:result.rowCount,coverageError:result.evaluatedCoverageError,csvSha256:result.benchmark.csvSha256}));
}catch(error){fs.writeFileSync(path.join(dir,runName+'.error.json'),JSON.stringify({name:error.name,message:error.message,stack:error.stack,elapsedMs:performance.now()-started},null,2));console.error(error);process.exitCode=1;}
