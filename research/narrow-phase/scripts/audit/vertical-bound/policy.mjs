import fs from 'node:fs';
import path from 'node:path';
import { worldZBoundsFromBox, nextUp } from './numerics/world-z-bounds.mjs';

// The audited runtime creates immutable placements and position buffers.
// This cache is scoped to those Brush instances, never to model IDs or names.
const boundsCache = new WeakMap();
function boundsOf(brush) {
 if (boundsCache.has(brush)) return boundsCache.get(brush);
 if (!brush.geometry.boundingBox) brush.geometry.computeBoundingBox();
 const bounds = worldZBoundsFromBox(brush.geometry.boundingBox, brush.matrixWorld);
 boundsCache.set(brush, bounds);
 return bounds;
}

export function assessVerticalRejection({ brushesA, brushesB, verticalMm, couldBeDuplicate }) {
 if (!(Number.isFinite(verticalMm) && verticalMm > 0)) return { eligible: false, reason: 'disabled' };
 if (couldBeDuplicate) return { eligible: false, reason: 'possible-duplicate' };
 const a = brushesA.map(boundsOf), b = brushesB.map(boundsOf);
 if (!a.length || !b.length || [...a, ...b].some(x => !x.certified)) return { eligible: false, reason: 'uncertified-input' };
 let min = Infinity, max = -Infinity, overlappingIntervals = 0;
 for (const x of a) for (const y of b) {
  const lo = Math.max(x.min, y.min), hi = Math.min(x.max, y.max);
  if (hi < lo) continue;
  min = Math.min(min, lo); max = Math.max(max, hi); overlappingIntervals++;
 }
 const heightUpperMm = overlappingIntervals ? nextUp(nextUp(max - min) * 1000) : 0;
 if (!Number.isFinite(heightUpperMm)) return { eligible: false, reason: 'uncertified-height' };
 // Same existing tolerance margin and floating addition as the consumer.
 const limitMm = verticalMm + 0.1;
 return { eligible: heightUpperMm <= limitMm, reason: heightUpperMm <= limitMm ? 'input-height' : 'height-too-large', heightUpperMm, limitMm, overlappingIntervals, min: overlappingIntervals ? min : null, max: overlappingIntervals ? max : null };
}

// Shadow diagnostics: all CSG operations still execute, no report fields change.
export function recordVerticalDecision(row, decision, report, boxSizeMm, csgMs) {
 const directory = process.env.CSG_VERTICAL_AUDIT_DIR;
 if (!directory) return;
 const output = { pairId: row['Clash GUID'], decision, collision: report.Collision === 'TRUE', clashType: report['Clash Type'], rawVolumeMm3: report['Volume (mm3)'], heightMm: boxSizeMm.z, csgMs };
 fs.appendFileSync(path.join(directory, `${process.pid}.jsonl`), JSON.stringify(output) + '\n');
}
