# Three real WBDG output discrepancies

`forensic-real-pairs.mjs` reconstructs three pairs from the previous
`general-optimizations/wbdg-office/edge-bounds-1.csv`, preserving its Object 1/2
order, and loads the frozen `vertical-bound/wbdg-office/project.json` through
`createNarrowPhaseRuntime`. The Evaluator hook imports through the backend's own
`node_modules/three-bvh-csg/src/index.js` with `--preserve-symlinks`; the hook count
is asserted equal to runtime CSG operation count.

Each pair has exactly one CSG operation in a fresh pass and another cached pass.
Both variants produce a positive Overlapping row on both passes. This excludes
multi-brush interval-union error for these cases.

| Pair (MEP global IDs) | Certified input overlap Z | Shadow output Z | Live / total output vertices | Prior edge-bounds |
| --- | ---: | ---: | ---: | --- |
| `0CUmiWg09FtOCUc9mzEWk9` / `118_nJXWP57wV06wkAMEHx` | 0.30500000000266436 mm | 904 mm | 178 / 178 | Exact output position/index hashes and volume match |
| `34qHOFO8b09Qbb9_jv4b3N` / `0SYeKgQSv0O8muID0LBzdJ` | 0.2800000000027226 mm | 20.72 mm | 80 / 80 | Exact output position/index hashes and volume match |
| `1iiCu$Tb52BACmhnZ2PXGc` / `2YN40Fh3H0lBxeZkd2pnaF` | 1.1102230246251569e-13 mm | 26 mm | 550 / 550 | Positive at 26 mm, but geometry and volume differ |

For all six actual input meshes (1,880 source position entries), the script:

- scans every position and independently computes world-space XYZ extrema;
- confirms stored local bounding boxes equal the scanned local extrema;
- uses exact BigInt dyadic arithmetic on every world-Z affine expression and
  verifies enclosure in the directed-rounding box certificate;
- verifies finite coordinates and zero box/enclosure violations;
- captures matrix, position/index hashes, box, and geometry identity before and
  after evaluation, and confirms they are unchanged.

The output check evaluates both all position entries, as the consumer currently
does, and only vertices referenced by live index/drawRange. Their extents are
identical. There are no unused output positions in these cases. For the 904 mm
case, 26 live output vertices and 22 complete indexed triangles lie outside the
certified input-overlap Z interval. These are emitted geometry, not stale buffer
tails. The two inputs occupy world-Z [7.363121,8.267121] and
[8.266816,8.491816] metres respectively; output extends down to 7.363121 metres.

The output therefore violates the necessary intersection enclosure independently
of the early-rejection policy and is already present in the prior optimized
baseline. The difference is far too large to explain as ordinary final rounding
of a few micrometres. It does not establish a general correction of the CSG
implementation, nor that every other shadow discrepancy has the same cause.

Input topology is a material limitation: several source meshes contain repeated
faces or nonmanifold edge incidence. In the largest case, geometry `3924` has 92
unique faces and ordinary two-face edge incidence; counterpart geometry `5066`
has 396 unique oriented faces, each repeated exactly three times, producing
1,188 triangles and six-face edge incidence. The other sampled fittings also
contain repeated faces; the contact sample includes degenerate index triangles.
These facts warrant further input/CSG-contract investigation, but this bounded
check does not attribute root cause or propose automatic mesh repair.

The broad singleton-disable control changes the third sample's volume from
7,976,963.712173723 to 7,829,021.444137936 mm3 while keeping it positive. It must
not be called a fully corrected baseline.

Reproduce without product or control edits:

```sh
node --preserve-symlinks audits/csg-narrow-20260907/vertical-bound/numerics/forensic-real-pairs.mjs vertical-shadow
node --preserve-symlinks audits/csg-narrow-20260907/vertical-bound/numerics/forensic-real-pairs.mjs edge-bounds
```

Fixtures: `real-pairs.json`. Complete small evidence:
`real-forensic-vertical-shadow.json` and `real-forensic-edge-bounds.json`.
