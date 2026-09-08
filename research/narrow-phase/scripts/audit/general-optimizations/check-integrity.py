from pathlib import Path
import json, hashlib, subprocess

root = Path(__file__).resolve().parent
workspace = root.parents[2]
variants = root.parent/'root/variants'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
plan = json.loads((root/'validation-plan.json').read_text())
source_errors = [p for p, digest in plan['sourceSha256'].items() if sha(variants/p) != digest]
inputs = {}
for manifest in root.glob('*/inputs.json'):
 for entry in json.loads(manifest.read_text()): inputs[entry['path']] = entry
input_errors = [p for p, entry in inputs.items() if sha(Path(p)) != entry['sha256'] or Path(p).stat().st_size != entry['sizeBytes']]
repos = {}
for name in ['three-bvh-csg', 'clash-detection']:
 checkout = workspace/name
 git = lambda *args: subprocess.check_output(['git','-C',str(checkout),*args])
 current = {'head':git('rev-parse','HEAD').decode().strip(), 'status':git('status','--porcelain=v1','-uall').decode(), 'diffSha256':hashlib.sha256(git('diff','HEAD','--binary')).hexdigest()}
 expected = json.loads((root/(name+'-initial-state.json')).read_text())
 repos[name] = {'unchanged':current == expected, 'current':current}
def manifest(directory): return {str(p.relative_to(directory)):sha(p) for p in directory.rglob('*') if p.is_file()}
backend_equal = manifest(variants/'adaptive-only/backend/src') == manifest(variants/'edge-bounds/backend/src')
a, b = manifest(variants/'adaptive-only/csg/src'), manifest(variants/'edge-bounds/csg/src')
csg_changed = sorted(p for p in a.keys() | b.keys() if a.get(p) != b.get(p))
result = {'frozenSourceFiles':len(plan['sourceSha256']), 'sourceErrors':source_errors, 'inputFiles':len(inputs), 'inputErrors':input_errors, 'repositories':repos, 'backendSourcesIdentical':backend_equal, 'candidateChangedCsgFiles':csg_changed}
(root/'integrity-check.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
if source_errors or input_errors or not backend_equal or not all(r['unchanged'] for r in repos.values()): raise SystemExit(1)
