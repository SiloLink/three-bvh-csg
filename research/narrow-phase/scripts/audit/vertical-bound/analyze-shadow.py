from pathlib import Path
from collections import Counter
import json

root = Path(__file__).resolve().parent
summaries = []
for directory in sorted(root.iterdir()):
 if not directory.is_dir(): continue
 for result_file in sorted(directory.glob('vertical-shadow-*.result.json')):
  stem = result_file.name.removesuffix('.result.json')
  result = json.loads(result_file.read_text())
  records = []
  for file in sorted((directory/(stem+'.shadow')).glob('*.jsonl')):
   records.extend(json.loads(line) for line in file.read_text().splitlines() if line)
  candidates = [r for r in records if r['decision']['eligible']]
  disagreements = [r for r in candidates if r['collision']]
  csg_total = sum(r['csgMs'] for r in records)
  csg_candidate = sum(r['csgMs'] for r in candidates)
  summary = {'project':directory.name,'run':stem,'candidates':result['broadPhase']['candidateCount'],'auditedPairs':len(records),'reportRows':result['resultRowCount'],'eligiblePairs':len(candidates),'eligibleReportedPositives':len(disagreements),'eligibleReportedDuplicates':sum(r['clashType']=='Duplicate' for r in candidates),'eligibleCsgSeconds':csg_candidate/1000,'allCsgSeconds':csg_total/1000,'eligibleCsgWorkPercent':100*csg_candidate/csg_total if csg_total else 0,'reasons':dict(Counter(r['decision']['reason'] for r in records)),'errors':result['narrowPhase']['failed'],'coverageError':result['evaluatedCoverageError']}
  (directory/(stem+'.disagreements.json')).write_text(json.dumps(disagreements,indent=2))
  summaries.append(summary)
  print(json.dumps(summary))
(root/'shadow-summary.json').write_text(json.dumps(summaries,indent=2))
