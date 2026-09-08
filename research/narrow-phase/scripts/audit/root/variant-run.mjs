import fs from 'node:fs';
import inspector from 'node:inspector';
import {promisify} from 'node:util';
const variant=process.argv[2]||'baseline';
const profile=process.argv.includes('--profile');
const {createNarrowPhaseRuntime}=await import(`./variants/${variant}/backend/src/core/narrow/narrow-phase.js`);
const {Evaluator}=await import(`./variants/${variant}/csg/src/index.js`);
const project=JSON.parse(fs.readFileSync(new URL('./real-project.json',import.meta.url)));
const pairs=JSON.parse(fs.readFileSync(new URL('./real-pairs.json',import.meta.url)));
const runtime=await createNarrowPhaseRuntime({projectDescriptor:project,narrowPhaseGeometryBudgetBytes:512*1024*1024});
const hashes=[];let capture=false;
const orig=Evaluator.prototype.evaluate;
Evaluator.prototype.evaluate=function(...args){const r=orig.apply(this,args);if(capture){const g=r.geometry;hashes.push([Array.from(g.index.array),Array.from(g.attributes.position.array)]);}return r;};
const warm=await runtime.runPairs({pairs});
if(global.gc)global.gc();
const samples=[];let profiler,post;
if(profile){profiler=new inspector.Session();profiler.connect();post=promisify(profiler.post).bind(profiler);await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:500});await post('Profiler.start');}
for(let i=0;i<(profile?20:7);i++){
 const r=await runtime.runPairs({pairs}); samples.push(r.timing);
 if(JSON.stringify(r.results)!==JSON.stringify(warm.results))throw new Error('Repeated output changed');
}
if(profile){const data=await post('Profiler.stop');fs.writeFileSync(new URL(`./${variant}.cpuprofile`,import.meta.url),JSON.stringify(data.profile));profiler.disconnect();}
capture=true;const captured=await runtime.runPairs({pairs});capture=false;
if(global.gc)global.gc();
const memory=process.memoryUsage();
fs.writeFileSync(new URL(`./${variant}-geometry.json`,import.meta.url),JSON.stringify(hashes));
fs.writeFileSync(new URL(`./${variant}-results.json`,import.meta.url),JSON.stringify({variant,warmTiming:warm.timing,samples,memory,results:captured.results},null,2));
console.log(JSON.stringify({variant,failed:captured.failed,samples:samples.map(s=>s.csgEvaluateMs),rss:memory.rss}));
runtime.dispose();
