from pathlib import Path
from collections import Counter
import json,csv,hashlib,statistics
root=Path(__file__).resolve().parent

def canonical(x):
 if isinstance(x,list):return [canonical(v) for v in x]
 if isinstance(x,dict):return {k:canonical(v) for k,v in x.items() if k not in ['uri','timing']}
 return x

def load_variant(p,v):
 rs=[]
 for file in sorted(p.glob(v+'-*.result.json')):
  j=json.load(open(file));stem=file.name.removesuffix('.result.json');t=j['narrowPhase']['timing']['workerTiming']['totals'];mem=json.load(open(p/(stem+'.resources.json'))) if (p/(stem+'.resources.json')).exists() else {}
  rs.append({'run':stem,'seconds':j['timing']['durationSeconds'],'phasesMs':j['timing']['phases'],'csgWorkerSeconds':t['csgEvaluateMs']/1000,'pairLoopWorkerSeconds':t['pairLoopMs']/1000,'otherWorkerSeconds':(t['durationMs']-t['csgEvaluateMs'])/1000,'csgOperations':t['csgOperationCount'],'candidates':j['broadPhase']['candidateCount'],'objects':j['broadPhase']['objectCount'],'rows':j['resultRowCount'],'clashes':j['detectedPairs']['count'],'errors':j['narrowPhase']['failed'],'coverageError':j['evaluatedCoverageError'],'peakTotalRssMiB':mem.get('peakTotalRssKiB',0)/1024,'csvSha256':j['benchmark']['csvSha256']})
 return rs
results=[]
for p in sorted(root.iterdir()):
 if not p.is_dir():continue
 a=load_variant(p,'baseline');b=load_variant(p,'adaptive-only')
 if not a or not b:continue
 ar=Counter(tuple(sorted(r.items())) for r in csv.DictReader(open(p/(a[0]['run']+'.csv'))))
 ac=json.load(open(p/(a[0]['run']+'.coverage.json')))
 checks=[]
 for r in a+b:
  c=json.load(open(p/(r['run']+'.coverage.json')))
  chunks_ok=all(hashlib.sha256(Path(chunk['uri']).read_bytes()).hexdigest()==chunk['digest'] for field in ['intentionalExclusions','evaluationFailures'] for chunk in c[field]['chunks'])
  rows=Counter(tuple(sorted(row.items())) for row in csv.DictReader(open(p/(r['run']+'.csv'))))
  checks.append({'run':r['run'],'csvBytesEqual':r['csvSha256']==a[0]['csvSha256'],'csvRowMultisetEqual':rows==ar,'coverageEqualIgnoringArtifactUris':canonical(ac)==canonical(c),'evidenceChunkDigestsVerified':chunks_ok,'candidateCountEqual':r['candidates']==a[0]['candidates'],'errorCountEqual':r['errors']==a[0]['errors'],'differingRows':sum((rows-ar).values())+sum((ar-rows).values())})
 meda=statistics.median(r['seconds'] for r in a);medb=statistics.median(r['seconds'] for r in b)
 results.append({'project':p.name,'baseline':a,'adaptive':b,'baselineMedianSeconds':meda,'adaptiveMedianSeconds':medb,'wallReductionPercent':100*(1-medb/meda),'csgReductionPercent':100*(1-statistics.median(r['csgWorkerSeconds'] for r in b)/statistics.median(r['csgWorkerSeconds'] for r in a)),'checks':checks})
(root/'comparison.json').write_text(json.dumps(results,indent=2))
for r in results:print(json.dumps({k:v for k,v in r.items() if k not in ['baseline','adaptive']}))
