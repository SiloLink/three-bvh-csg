from pathlib import Path
import shutil,os
root=Path('__CSG_RESEARCH_ROOT__/audits/csg-narrow-20260907/root')
head=Path('__CSG_RESEARCH_ROOT__/review-artifacts/csg-pr2/head')
for name in ['baseline','pool','position','coplanar','combined']:
 dest=root/'variants'/name; dest.mkdir(parents=True,exist_ok=True)
 csg=dest/'csg';csg.mkdir(exist_ok=True)
 shutil.copytree(head/'src',csg/'src',dirs_exist_ok=True)
 shutil.copy(head/'package.json',csg/'package.json')
 (csg/'node_modules').symlink_to(head/'node_modules',target_is_directory=True)
 shutil.copytree(root/'engine/backend',dest/'backend',symlinks=True,dirs_exist_ok=True)
 link=dest/'backend/node_modules/three-bvh-csg';link.unlink();link.symlink_to(csg,target_is_directory=True)
 if name!='baseline':
  p=csg/'src/core/CDTTriangleSplitter.js';s=p.read_text();s=s.replace('\t_paramPool.clear();','\t_paramPool.clear();\n\t_vectorPool.clear();',1);p.write_text(s)
 if name in ['coplanar','combined']:
  p=csg/'src/core/operations/operationsUtils.js';s=p.read_text().replace('const count = getCoplanarIntersectionEdges( triangleA, triangleB, _coplanarEdges );','const count = coplanarCount;');p.write_text(s)
 if name in ['position','combined']:
  p=dest/'backend/src/core/narrow/narrow-phase.js';s=p.read_text().replace("evaluator.attributes = ['position', 'normal'];","evaluator.attributes = ['position'];")
  start=s.index('  // computeVertexNormals reuses an existing normal attribute.')
  end=s.index('  geometry.computeBoundingBox();',start)
  s=s[:start]+s[end:];p.write_text(s)
