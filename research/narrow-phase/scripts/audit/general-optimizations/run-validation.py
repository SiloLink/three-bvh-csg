from pathlib import Path
import json, subprocess, time

root = Path(__file__).resolve().parent
workspace = root.parents[2]
variant = root.parent / 'root/variants/edge-bounds/csg'
jobs = [
 ('bounds-boundaries', ['node', str(root/'bounds-boundaries.mjs')], root),
 ('library-tests', ['node', str(workspace/'review-artifacts/csg-pr2/head/node_modules/vitest/vitest.mjs'), 'run', '--root', str(variant), '--maxWorkers', '1'], variant),
 ('csg-parity', ['node', str(root/'csg-parity.mjs')], root),
 ('probe-broad-adaptive-only', ['node', '--preserve-symlinks', str(root/'probe.mjs'), 'adaptive-only', 'broad', '3'], root),
 ('probe-broad-edge-bounds', ['node', '--preserve-symlinks', str(root/'probe.mjs'), 'edge-bounds', 'broad', '3'], root),
 ('integrity-check', ['python3', str(root/'check-integrity.py')], root),
 ('tolerance-bound-opportunity', ['node', '--preserve-symlinks', str(root/'tolerance-bound-opportunity.mjs')], root),
]
results = []
for name, cmd, cwd in jobs:
 print(json.dumps({'start':name}), flush=True)
 start = time.monotonic()
 with (root/(name+'.log')).open('w') as log:
  result = subprocess.run(cmd, cwd=cwd, stdout=log, stderr=subprocess.STDOUT, timeout=600)
 record = {'name':name,'exitCode':result.returncode,'seconds':time.monotonic()-start}
 results.append(record)
 (root/'validation-runs.json').write_text(json.dumps(results, indent=2))
 print(json.dumps(record), flush=True)
 print((root/(name+'.log')).read_text()[-2000:], flush=True)
 if result.returncode: break
if results[-1]['exitCode']: raise SystemExit(results[-1]['exitCode'])
