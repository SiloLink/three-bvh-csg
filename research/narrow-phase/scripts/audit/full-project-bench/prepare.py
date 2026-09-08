from pathlib import Path
import json,hashlib,platform,subprocess
lab=Path('__CSG_RESEARCH_ROOT__');out=lab/'audits/csg-narrow-20260907/full-project-bench';cache=lab/'artifacts/clash-detection-sweep-parquet-cache'
plan=json.load(open(lab/'artifacts/clash-detection-sweep-dev-sweep-plan-20260706-final/sweep-plan.json'))
complete=[]
for c in plan['selected']:
 mods=[]
 for m in c['models']:
  matches=list(cache.glob(m['modelGuid']+'-*'))
  if len(matches)!=1 or not all((matches[0]/f).is_file() for f in ['model.parquet','geometry_library.parquet','relationships.parquet']):break
  p=matches[0];meta=json.load(open(p/'meta.json')) if (p/'meta.json').exists() else {}
  mods.append({'modelId':m['modelGuid'],'folderName':m['modelGuid'],'discipline':m['discipline'],'files':{'model':str(p/'model.parquet'),'geometry':str(p/'geometry_library.parquet'),'relationships':str(p/'relationships.parquet')},'metadataObjectCount':meta.get('metadata',{}).get('object_count',0)})
 else:complete.append({'caseId':c['caseId'],'models':mods})
(out/'inventory.json').write_text(json.dumps(complete,indent=2))
selected={'wbdg-office':'ifc-bench/wbdg-office/base','byh-donauworth':'alex/byh-donauworth-dd1/base'}
projects={name:{'projectId':name,'models':[{k:v for k,v in m.items() if k!='metadataObjectCount'} for m in next(c for c in complete if c['caseId']==cid)['models']]} for name,cid in selected.items()}
for name in ['dmsw-v28','bvg-v1']:
 p=lab/'artifacts/parser-prod-docker-current'/name
 projects[name]={'projectId':name,'models':[{'modelId':name+'-'+discipline,'folderName':name+'-'+discipline,'discipline':discipline,'files':{'model':str(p/discipline/'model.parquet'),'geometry':str(p/discipline/'geometry_library.parquet'),'relationships':str(p/discipline/'relationships.parquet')}} for discipline in ['architecture','electrical','mechanical','plumbing','structure']]}
for name,p in projects.items():
 directory=out/name;directory.mkdir(exist_ok=True)
 (directory/'project.json').write_text(json.dumps(p,indent=2))
 inputs=[]
 for m in p['models']:
  for kind,file in m['files'].items():
   data=Path(file).read_bytes();inputs.append({'modelId':m['modelId'],'kind':kind,'path':file,'sizeBytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 (directory/'inputs.json').write_text(json.dumps(inputs,indent=2))
 print(name,len(p['models']),round(sum(x['sizeBytes'] for x in inputs)/1e6,1),'MB all parquets')
(out/'machine.json').write_text(json.dumps({'platform':platform.platform(),'hardware':subprocess.check_output(['sysctl','hw.model','hw.memsize','hw.ncpu'],text=True),'node':subprocess.check_output(['node','--version'],text=True).strip(),'workerCount':3,'batchSize':100,'geometryBudgetMbTotal':1536,'cacheFrequencyThreshold':5,'consumerSha':'f890805','baselineCsgSha':'52f18b2647c283bbd62f4f2caf50cda98a3e3e02','three':'0.179.1','meshBvh':'0.9.11','candidate':'adaptive robust incircle 3.0.3 plus projected vector pool reset'},indent=2))
