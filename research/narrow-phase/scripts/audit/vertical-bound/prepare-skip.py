from pathlib import Path
import shutil, json, hashlib

root = Path(__file__).resolve().parent
variants = root.parent/'root/variants'
source = variants/'vertical-control'
target = variants/'vertical-skip'
if target.exists(): raise RuntimeError('Refusing to overwrite vertical-skip')
shutil.copytree(source, target, symlinks=True)
(target/'backend/node_modules/three-bvh-csg').unlink()
(target/'backend/node_modules/three-bvh-csg').symlink_to(target/'csg', target_is_directory=True)
p = target/'backend/src/core/narrow/narrow-phase.js'
s = p.read_text()
s = "import { assessVerticalRejection } from '"+str(root/'policy.mjs')+"';\n"+s
s = s.replace('    csgAabbRejectedCount: 0,','    csgAabbRejectedCount: 0,\n    verticalEarlyRejectedCount: 0,\n    verticalBoundsMs: 0,')
old = '    const evaluator = options.evaluator || createCsgEvaluator();'
assert s.count(old) == 1
new = '''    const verticalStartedAt = performance.now();
    const verticalDecision = assessVerticalRejection({
      brushesA, brushesB, verticalMm: row.toleranceMm.vertical,
      couldBeDuplicate: classifyClash({
        collision: true,
        volumeA: metricsA.volumeMm3, volumeB: metricsB.volumeMm3,
        intersectionVolume: Infinity,
        boxA: metricsA.box, boxB: metricsB.box,
        boxContainmentTolerance: BBOX_CONTAINMENT_TOLERANCE_MM / SOURCE_UNITS_TO_MM,
        duplicateVolumeDiffRatio: DUPLICATE_VOLUME_DIFF_RATIO,
        intersectionVolumeMatchRatio: INTERSECTION_VOLUME_MATCH_RATIO,
      }) === 'Duplicate',
    });
    addElapsedMs(timing, 'verticalBoundsMs', verticalStartedAt);
    if (verticalDecision.eligible) {
      if (timing) timing.verticalEarlyRejectedCount++;
      // Isolated experiment: the final negative is certified from input geometry.
      // CSG intersection volume and raw classification were not computed.
      const report = createNarrowPhaseReportRow(row, {
        collision: false, clashType: 'NA', volumeMm3: NaN,
        boxSizeMm: { x: NaN, y: NaN, z: NaN },
      });
      if (options.includeTraceFields) report.Trace = {
        rawCollision: null, filteredByTolerance: true, filteredByFillRatio: null,
        inputHeightUpperMm: verticalDecision.heightUpperMm,
      };
      return report;
    }

'''+old
s = s.replace(old,new)
p.write_text(s)
manifest = {}
for variant in ['vertical-control','vertical-shadow','vertical-skip']:
 for area in ['backend/src','csg/src']:
  for file in (variants/variant/area).rglob('*'):
   if file.is_file(): manifest[str(file.relative_to(root.parent))] = hashlib.sha256(file.read_bytes()).hexdigest()
for file in [root/'policy.mjs',root/'numerics/world-z-bounds.mjs']:
 manifest[str(file.relative_to(root.parent))] = hashlib.sha256(file.read_bytes()).hexdigest()
(root/'frozen-source-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'variant':'vertical-skip','frozenFiles':len(manifest),'onlyRuntimeDifference':'certified whole-pair vertical negative; uncomputed negative metrics marked NA'}))
