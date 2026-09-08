from pathlib import Path
import hashlib, json, shutil, subprocess

root = Path(__file__).resolve().parent
workspace = root.parents[2]
variants = root.parent/'root/variants'
source = variants/'edge-bounds'
for name in ['vertical-control', 'vertical-shadow']:
 target = variants/name
 if target.exists(): raise RuntimeError(f'Refusing to overwrite {target}')
 shutil.copytree(source, target, symlinks=True, ignore=shutil.ignore_patterns('node_modules', '.git'))
 shutil.copytree(source/'backend/node_modules', target/'backend/node_modules', symlinks=True)
 (target/'backend/node_modules/three-bvh-csg').unlink()
 (target/'backend/node_modules/three-bvh-csg').symlink_to(target/'csg', target_is_directory=True)
 (target/'csg/node_modules').symlink_to(source/'csg/node_modules', target_is_directory=True)
 p = target/'csg/src/core/operations/operations.js'
 s = p.read_text()
 shortcut = '\t\tif ( triangles.length === 1 && ! hasCoplanarIntersections ) {\n\n\t\t\tcontinue;\n\n\t\t}'
 assert s.count(shortcut) == 1
 s = s.replace(shortcut, '// Isolated control: classify all intersection fragments, preserving cut boundaries.')
 old = '_normal.dot( _coplanarNormal ) > 0 ? COPLANAR_ALIGNED : COPLANAR_OPPOSITE'
 assert s.count(old) == 1
 s = s.replace(old, '_normal.dot( _coplanarNormal ) * ( _matrix.determinant() < 0 ? - 1 : 1 ) > 0 ? COPLANAR_ALIGNED : COPLANAR_OPPOSITE')
 p.write_text(s)
 p = target/'csg/src/core/Evaluator.js'
 s = p.read_text()
 old = '\t\t\tbrush.updateMatrix();\n\t\t\tbrush.matrixWorld.copy( a.matrixWorld );'
 assert s.count(old) == 1
 s = s.replace(old, '\t\t\tbrush.matrixAutoUpdate = false;\n\t\t\tbrush.matrix.copy( a.matrixWorld );\n\t\t\tbrush.matrixWorld.copy( a.matrixWorld );')
 p.write_text(s)

for name in ['three-bvh-csg', 'clash-detection']:
 checkout = workspace/name
 def git(*args): return subprocess.check_output(['git', '-c', 'core.fsmonitor=false', '-C', str(checkout), *args])
 state = {'head':git('rev-parse','HEAD').decode().strip(), 'status':git('status','--porcelain=v1','-uall').decode(), 'diffSha256':hashlib.sha256(git('diff','HEAD','--binary')).hexdigest()}
 (root/(name+'-initial-state.json')).write_text(json.dumps(state,indent=2))

plan = {'scope':'Read-only research with isolated numerical and known-defect control variants; not a complete correctness fix.', 'reference':'edge-bounds from prior audit', 'controls':['disable unsafe singleton shortcut', 'relative reflection orientation in coplanar classification', 'preserve affine result matrix across updates'], 'invariants':['world Z only', 'existing tolerance and Duplicate rules', 'union across all brush-pair overlap intervals', 'no per-model/type/triangle-count conditions'], 'stages':['independent affine interval oracle', 'analytical/adversarial CSG and policy validation', 'full-project shadow decisions before enabling skips']}
(root/'research-plan.json').write_text(json.dumps(plan,indent=2))
print(json.dumps({'created':['vertical-control','vertical-shadow'],'productRepositoriesEdited':False}))
