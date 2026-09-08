from pathlib import Path
import shutil,hashlib,json,subprocess
lab=Path('__CSG_RESEARCH_ROOT__');out=lab/'audits/csg-narrow-20260907/general-optimizations';root=out.parent/'root/variants'
for name in ['ray-side','edge-bounds','generic-combined']:
 target=root/name
 if target.exists():raise RuntimeError('variant already exists '+name)
 shutil.copytree(root/'adaptive-only',target,symlinks=True,ignore=shutil.ignore_patterns('test','coverage','.vitest'))
 link=target/'backend/node_modules/three-bvh-csg';link.unlink();link.symlink_to(target/'csg',target_is_directory=True)
for repo in ['clash-detection','three-bvh-csg']:
 state={'head':subprocess.check_output(['git','-C',str(lab/repo),'rev-parse','HEAD'],text=True).strip(),'status':subprocess.check_output(['git','-C',str(lab/repo),'status','--porcelain=v1','-uall'],text=True),'diffSha256':hashlib.sha256(subprocess.check_output(['git','-C',str(lab/repo),'diff','HEAD','--binary'])).hexdigest()}
 (out/(repo+'-initial-state.json')).write_text(json.dumps(state,indent=2))
print('Created three isolated experiment variants; product repos unchanged')
