from pathlib import Path
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parent
workspace = root.parents[2]


def digest(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


manifest = json.loads((root / 'frozen-source-manifest.json').read_text())
source_changes = [name for name, expected in manifest.items()
                  if digest(root.parent / name) != expected]
inputs = []
configuration_changes = []
for listing in sorted(root.glob('*/inputs.json')):
    for item in json.loads(listing.read_text()):
        file = Path(item['path'])
        inputs.append({'path': str(file), 'matches': file.stat().st_size == item['sizeBytes']
                       and digest(file) == item['sha256']})
    for name in ['project.json', 'matrix.json', 'inputs.json', 'ui-matrix.json']:
        prior = root.parent / 'general-optimizations' / listing.parent.name / name
        if digest(listing.parent / name) != digest(prior):
            configuration_changes.append(str(listing.parent / name))

product_states = []
for name in ['three-bvh-csg', 'clash-detection']:
    def git(*args):
        return subprocess.check_output(['git', '-c', 'core.fsmonitor=false', '-C', str(workspace / name), *args])
    actual = {'head': git('rev-parse', 'HEAD').decode().strip(),
              'status': git('status', '--porcelain=v1', '-uall').decode(),
              'diffSha256': hashlib.sha256(git('diff', 'HEAD', '--binary')).hexdigest()}
    initial = json.loads((root / (name + '-initial-state.json')).read_text())
    product_states.append({'repository': name, 'unchanged': actual == initial, **actual})

variants = root.parent / 'root/variants'
control = variants / 'vertical-control'
skip = variants / 'vertical-skip'
runtime_differences = []
for area in ['backend/src', 'csg/src']:
    for file in (control / area).rglob('*'):
        if file.is_file() and digest(file) != digest(skip / file.relative_to(control)):
            runtime_differences.append(str(file.relative_to(control)))

result = {
    'frozenSourceFiles': len(manifest), 'changedFrozenSourceFiles': source_changes,
    'inputFiles': len(inputs), 'allInputSizesAndHashesMatch': all(item['matches'] for item in inputs),
    'changedProjectConfigurationFiles': configuration_changes,
    'controlSkipRuntimeDifferences': runtime_differences,
    'productStates': product_states,
}
(root / 'integrity-check.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
assert not source_changes and not configuration_changes
assert result['allInputSizesAndHashesMatch'] and all(state['unchanged'] for state in product_states)
assert runtime_differences == ['backend/src/core/narrow/narrow-phase.js']
