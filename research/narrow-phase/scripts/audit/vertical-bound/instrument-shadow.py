from pathlib import Path

root = Path(__file__).resolve().parent
p = root.parent/'root/variants/vertical-shadow/backend/src/core/narrow/narrow-phase.js'
s = p.read_text()
s = "import { assessVerticalRejection, recordVerticalDecision } from '"+str(root/'policy.mjs')+"';\n"+s
old = '    if (haveExactSameBrushSet(brushesA, brushesB)) {'
new = '''    const verticalAudit = assessVerticalRejection({
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
    verticalAudit.csgStartMs = timing?.csgEvaluateMs || 0;

'''+old
assert s.count(old) == 1
s = s.replace(old, new)
old = '  timing,\n}) {\n  const overlapBoxStartedAtMs'
assert s.count(old) == 1
s = s.replace(old, '  timing,\n  verticalAudit,\n}) {\n  const overlapBoxStartedAtMs')
old = '  return reportRow;\n}\n\nasync function computeClashForRow'
assert s.count(old) == 1
s = s.replace(old, "  if (verticalAudit) recordVerticalDecision(row, verticalAudit, reportRow, normalizedBoxSize, (timing?.csgEvaluateMs || 0) - verticalAudit.csgStartMs);\n"+old)
old = '        overlapObjects: brushesA,\n        options,\n        timing,'
assert s.count(old) == 1
s = s.replace(old, old+'\n        verticalAudit,')
old = '      overlapObjects: overlaps,\n      options,\n      timing,'
assert s.count(old) == 1
s = s.replace(old, old+'\n      verticalAudit,')
p.write_text(s)
print(str(p))
