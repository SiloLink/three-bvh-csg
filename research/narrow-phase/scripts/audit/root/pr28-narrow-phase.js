import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import * as THREE from 'three';
import { arrayNeedsUint32 } from 'three/src/utils.js';
import { asyncBufferFromFile, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { Brush, Evaluator, INTERSECTION, computeMeshVolume } from 'three-bvh-csg/src/index.js';
import { throwIfCanceled } from '../../cancellation.js';
import { createProjectDescriptor } from '../project-descriptor.js';
import { computeOrientedClashSize } from '../geometry/oriented-box.js';
import { hasDirectGeometryId } from '../model/geometry-eligibility.js';
import { normalizeNestedArray, readParquetObjects } from '../parquet.js';
import { classifyClash } from './collision-classification.js';
import {
  normalizeNarrowPhasePairs,
  createNarrowPhaseReportRow,
  createNarrowPhaseErrorRow,
} from './narrow-report-row.js';
import { createNarrowPhaseProgressEmitter } from './narrow-progress.js';
import { shouldFilterOverlappingByTolerance, shouldFilterByFillRatio } from './tolerance-filter.js';

const SOURCE_UNITS_TO_MM = 1000;
const SOURCE_VOLUME_TO_MM3 = SOURCE_UNITS_TO_MM ** 3;
const VOLUME_TOLERANCE_MM3 = 1;
const BBOX_CONTAINMENT_TOLERANCE_MM = 1;
const DUPLICATE_VOLUME_DIFF_RATIO = 0.10;
const INTERSECTION_VOLUME_MATCH_RATIO = 0.98;

function elapsedMs(startedAtMs) {
  return Number((performance.now() - startedAtMs).toFixed(3));
}

function addElapsedMs(target, key, startedAtMs) {
  if (!target) {
    return;
  }

  target[key] += performance.now() - startedAtMs;
}

function createNarrowPhaseTiming() {
  return {
    normalizePairsMs: 0,
    pairLoopMs: 0,
    rowTotalMs: 0,
    loadBrushesMs: 0,
    csgEvaluateMs: 0,
    intersectionVolumeMs: 0,
    metricsMs: 0,
    overlapBoxMs: 0,
    formatResultMs: 0,
    disposeMs: 0,
    prepMs: 0,
    pairCount: 0,
    csgOperationCount: 0,
    csgAabbRejectedCount: 0,
    duplicateFastPathCount: 0,
    errorCount: 0,
    fillRatioFilteredCount: 0,
  };
}

function roundTimingValue(value) {
  return typeof value === 'number' ? Number(value.toFixed(3)) : value;
}

function finalizeNarrowPhaseTiming(timing, startedAtMs, cacheStats) {
  const memoryUsage = process.memoryUsage();
  return {
    durationMs: elapsedMs(startedAtMs),
    ...Object.fromEntries(
      Object.entries(timing).map(([key, value]) => [key, roundTimingValue(value)]),
    ),
    cacheStats: cacheStats ? { ...cacheStats } : null,
    memMb: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1048576),
      external: Math.round(memoryUsage.external / 1048576),
      arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1048576),
      rss: Math.round(memoryUsage.rss / 1048576),
    },
  };
}

function createUniqueLookup(rows, columnName, sourceName) {
  const lookup = new Map();
  const duplicates = new Set();

  for (const row of rows) {
    const key = String(row[columnName]);
    if (lookup.has(key)) {
      duplicates.add(key);
    } else {
      lookup.set(key, row);
    }
  }

  return {
    get(value) {
      const key = String(value);
      if (duplicates.has(key)) {
        throw new Error(`Expected one row in ${sourceName} where ${columnName} = "${key}", found multiple.`);
      }
      const row = lookup.get(key);
      if (!row) {
        throw new Error(`No row found in ${sourceName} where ${columnName} = "${key}".`);
      }

      return row;
    },
  };
}

async function createFolderCache(projectDescriptor) {
  const project = createProjectDescriptor(projectDescriptor);
  const folderByDiscipline = new Map();
  const folderByName = new Map();
  const folderByModelId = new Map();
  for (const model of project.models) {
    const folderRecord = {
      model,
      modelId: model.modelId,
      folderName: model.folderName,
      folderPath: path.dirname(model.files.model),
    };
    folderByModelId.set(String(model.modelId).trim().toLowerCase(), folderRecord);
    folderByName.set(String(folderRecord.folderName).trim().toLowerCase(), folderRecord);
    if (!folderByDiscipline.has(String(model.discipline).trim().toLowerCase())) {
      folderByDiscipline.set(String(model.discipline).trim().toLowerCase(), folderRecord);
    }
  }
  const folderPromises = new Map();

  return {
    load(discipline, folderName = null) {
      const normalizedDiscipline = String(discipline || '').trim().toLowerCase();
      const normalizedFolderName = String(folderName || '').trim().toLowerCase();
      const mappedFolder = (
        (normalizedFolderName && (folderByName.get(normalizedFolderName) || folderByModelId.get(normalizedFolderName)))
        || folderByDiscipline.get(normalizedDiscipline)
      );
      if (!mappedFolder) {
        throw new Error(`ModelDescriptor was not found for discipline "${discipline}".`);
      }

      if (!folderPromises.has(mappedFolder.folderPath)) {
        folderPromises.set(mappedFolder.folderPath, loadFolderData(mappedFolder.model));
      }

      return folderPromises.get(mappedFolder.folderPath);
    },
  };
}

// Geometry is held as flat typed arrays shared by geometry_id (one entry per
// unique geometry instead of nested JS arrays per row). Access-time error
// behavior mirrors createUniqueLookup exactly: duplicate and missing ids, and
// row conversion failures, all throw only when a row asks for that id, with
// the same messages. Duplicated ids are never served — the duplicate error
// takes precedence over any conversion outcome of the duplicate rows.
// Rows are converted as they are added so the builder can consume the parquet
// file chunk by chunk without ever materializing the whole nested-array
// representation (the conversion transient is bounded by the chunk size).
// Some exporters (e.g. Navistools) bake source-world survey coordinates directly
// into geometry vertices with identity placements, landing them hundreds of km
// from the origin. At that scale, float32 only resolves about 0.1 m, collapsing
// thin elements into degenerate triangles and making narrow-phase intersection
// both wrong and pathologically slow. We detect such geometry per folder and
// subtract a shared grid origin from its vertices, then move that offset into the
// brush's float64 matrixWorld (see brushFromRecord) so world position is
// preserved exactly while the stored geometry stays small. The grid floor matches
// the parser's canonical-origin scheme so independently loaded folders in the
// same coordinate system land on the same local frame.
const GEOMETRY_REBASE_LARGE_COORDINATE_METERS = 1000;
const GEOMETRY_REBASE_GRID_METERS = 10000;
const GEOMETRY_REBASE_SAMPLE_LIMIT = 512;
const GEOMETRY_REBASE_MATCH_DISTANCE_METERS = 100000;

function flatVertexBboxCenter(flatVertices) {
  if (flatVertices.length < 3) {
    return null;
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i + 2 < flatVertices.length; i += 3) {
    const x = flatVertices[i], y = flatVertices[i + 1], z = flatVertices[i + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return null;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
}

function isLargeRebaseXY(point) {
  return Math.abs(point[0]) > GEOMETRY_REBASE_LARGE_COORDINATE_METERS
    || Math.abs(point[1]) > GEOMETRY_REBASE_LARGE_COORDINATE_METERS;
}

function isNearRebaseOriginXY(point, rebaseOrigin) {
  const dx = point[0] - rebaseOrigin[0];
  const dy = point[1] - rebaseOrigin[1];
  return Math.hypot(dx, dy) <= GEOMETRY_REBASE_MATCH_DISTANCE_METERS;
}

function medianOfValues(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Floors source-world XY to a coarse grid cell. Z stays 0 to match the parser:
// building elevations are small and flooring them can introduce a large shift.
function floorToRebaseGrid(point) {
  return [
    Math.floor(point[0] / GEOMETRY_REBASE_GRID_METERS) * GEOMETRY_REBASE_GRID_METERS,
    Math.floor(point[1] / GEOMETRY_REBASE_GRID_METERS) * GEOMETRY_REBASE_GRID_METERS,
    0,
  ];
}

export function createTypedGeometryStoreBuilder(geometryLibraryPath, rebaseOrigin = null) {
  const entries = new Map();

  function convertRow(row) {
    try {
      // Same normalization (JSON-string and BigInt handling) and the same
      // depth-1 flatten the brush path applied before; no added validation.
      const flat = normalizeNestedArray(row.vertices, 'vertices').flat();
      let rebaseOffset = null;
      if (rebaseOrigin) {
        const center = flatVertexBboxCenter(flat);
        if (center && isLargeRebaseXY(center) && isNearRebaseOriginXY(center, rebaseOrigin)) {
          rebaseOffset = rebaseOrigin;
          // Subtract before storage so large source-world coordinates stay near
          // the origin. This improves BVH robustness without reducing the
          // float64 vertex precision retained from Parquet.
          for (let i = 0; i + 2 < flat.length; i += 3) {
            flat[i] -= rebaseOrigin[0];
            flat[i + 1] -= rebaseOrigin[1];
            flat[i + 2] -= rebaseOrigin[2];
          }
        }
      }
      const positions = new Float64Array(flat);
      const flatFaces = normalizeNestedArray(row.faces, 'faces').flat();
      const index = arrayNeedsUint32(flatFaces) ? new Uint32Array(flatFaces) : new Uint16Array(flatFaces);
      return { positions, index, rebaseOffset };
    } catch (error) {
      return { error };
    }
  }

  return {
    addRows(rows) {
      for (const row of rows) {
        const key = String(row.geometry_id);
        if (entries.has(key)) {
          // Duplicate precedence: the duplicate-id error replaces whatever the
          // first row converted to and is what every access sees.
          entries.set(key, {
            error: new Error(`Expected one row in ${geometryLibraryPath} where geometry_id = "${key}", found multiple.`),
          });
        } else {
          entries.set(key, convertRow(row));
        }
      }
    },
    finish() {
      return {
        get(value) {
          const key = String(value);
          const entry = entries.get(key);
          if (!entry) {
            throw new Error(`No row found in ${geometryLibraryPath} where geometry_id = "${key}".`);
          }
          if (entry.error) {
            throw entry.error;
          }

          return entry;
        },
      };
    },
  };
}

export function createTypedGeometryStore(geometryRows, geometryLibraryPath, rebaseOrigin = null) {
  const builder = createTypedGeometryStoreBuilder(geometryLibraryPath, rebaseOrigin);
  builder.addRows(geometryRows);
  return builder.finish();
}

// Samples geometry bounding-box centers (vertices column only, capped) to detect
// source-world coordinates baked into vertices. Returns the shared grid origin to
// subtract, or null when the folder is already near the origin.
async function resolveGeometryRebaseOrigin(file, numRows) {
  const largeCentersX = [];
  const largeCentersY = [];
  for (
    let rowStart = 0;
    rowStart < numRows && largeCentersX.length < GEOMETRY_REBASE_SAMPLE_LIMIT;
    rowStart += GEOMETRY_LOAD_CHUNK_ROWS
  ) {
    const rows = await parquetReadObjects({
      file,
      columns: ['vertices'],
      rowStart,
      rowEnd: Math.min(rowStart + GEOMETRY_LOAD_CHUNK_ROWS, numRows),
    });
    for (const row of rows) {
      let center = null;
      try {
        center = flatVertexBboxCenter(normalizeNestedArray(row.vertices, 'vertices').flat());
      } catch {
        center = null;
      }
      if (center && isLargeRebaseXY(center)) {
        largeCentersX.push(center[0]);
        largeCentersY.push(center[1]);
        if (largeCentersX.length >= GEOMETRY_REBASE_SAMPLE_LIMIT) {
          break;
        }
      }
    }
  }
  if (largeCentersX.length === 0) {
    return null;
  }
  return floorToRebaseGrid([medianOfValues(largeCentersX), medianOfValues(largeCentersY), 0]);
}

const GEOMETRY_LOAD_CHUNK_ROWS = 2000;

// Reads geometry_library.parquet in row chunks, converting each chunk to
// typed arrays before the next is parsed. Peak transient memory is one chunk
// of nested arrays instead of the whole library (the whole-library transient
// is what pushed a DMSW worker past the default heap even after the steady
// state was fixed).
async function readGeometryLibraryTyped(geometryLibraryPath) {
  await fs.access(geometryLibraryPath);
  const file = await asyncBufferFromFile(geometryLibraryPath);
  const metadata = await parquetMetadataAsync(file);
  const numRows = Number(metadata.num_rows);
  const rebaseOrigin = await resolveGeometryRebaseOrigin(file, numRows);
  const builder = createTypedGeometryStoreBuilder(geometryLibraryPath, rebaseOrigin);
  for (let rowStart = 0; rowStart < numRows; rowStart += GEOMETRY_LOAD_CHUNK_ROWS) {
    const rows = await parquetReadObjects({
      file,
      columns: ['geometry_id', 'vertices', 'faces'],
      rowStart,
      rowEnd: Math.min(rowStart + GEOMETRY_LOAD_CHUNK_ROWS, numRows),
    });
    builder.addRows(rows);
  }
  return builder.finish();
}

async function loadFolderData(model) {
  const folderPath = path.dirname(model.files.model);
  const modelPath = model.files.model;
  const geometryLibraryPath = model.files.geometry;
  const [modelRows, geometries] = await Promise.all([
    readParquetObjects(modelPath, ['GlobalId', 'geometry_id', 'transform']),
    readGeometryLibraryTyped(geometryLibraryPath),
  ]);

  return {
    folderPath,
    modelPath,
    geometryLibraryPath,
    models: createUniqueLookup(modelRows, 'GlobalId', modelPath),
    geometries,
  };
}

function loadObjectRecordsFromFolder(folder, globalId) {
  const modelRow = folder.models.get(globalId);
  const geometryId = modelRow.geometry_id;
  if (!hasDirectGeometryId(geometryId)) {
    throw new Error(`Object "${globalId}" has no direct geometry_id.`);
  }

  const typedGeometry = folder.geometries.get(geometryId);
  return [{
    globalId,
    folderPath: folder.folderPath,
    geometryId,
    transform: normalizeNestedArray(modelRow.transform, 'transform'),
    positions: typedGeometry.positions,
    index: typedGeometry.index,
    rebaseOffset: typedGeometry.rebaseOffset || null,
  }];
}

async function loadObjectRecords(folderCache, discipline, globalId, options = {}) {
  const folder = await folderCache.load(discipline, options.folderName);
  return loadObjectRecordsFromFolder(folder, globalId);
}

// Character-for-character reproduction of Brush.prepareGeometry's dedup hash
// (three-bvh-csg Brush.js:53-56). Drift-tested in shared-geometry tests: if a
// library upgrade changes the recipe, the test fails loudly.
export function computeBrushGeometryHash(brush) {
  const geometry = brush.geometry;
  const index = geometry.index;
  const posAttr = geometry.attributes.position;
  const indexHash = index ? `${index.uuid}_${index.count}_${index.version}` : '-1_-1_-1';
  const posHash = `${posAttr.uuid}_${posAttr.count}_${posAttr.version}`;
  return `${geometry.uuid}_${indexHash}_${posHash}`;
}

// S2: brushes over a shared geometry adopt the already-built
// boundsTree/halfEdges/groupIndices instead of rebuilding them per Brush.
// Adoption requires BOTH the marker hash to match (the library's own
// invalidation rule: attribute uuid/count/version) AND the structures to be
// physically present (they may have been cleared by store eviction).
export class SharedGeometryBrush extends Brush {
  prepareGeometry() {
    const geometry = this.geometry;
    const marker = geometry.userData.preparedHash;
    const structuresPresent = Boolean(
      geometry.boundsTree && geometry.halfEdges && geometry.groupIndices,
    );
    if (marker && structuresPresent && this._hash === null) {
      const hash = computeBrushGeometryHash(this);
      if (hash === marker) {
        this._hash = hash;
        return;
      }
    }
    super.prepareGeometry();
    geometry.userData.preparedHash = computeBrushGeometryHash(this);
  }
}

// S3: one shared store for all brush geometries (hot-cached and, when
// enabled, uncached too), with an optional byte budget enforced by LRU
// eviction of unpinned entries. refCount = number of live brushes holding
// the geometry: acquire() on brush creation, release() on brush
// destruction (per-row for uncached brushes, objectCache.dispose for
// cached ones). Eviction can therefore never free a geometry referenced by
// any live brush.
export function createSharedGeometryStore({ budgetBytes = 0 } = {}) {
  const entries = new Map();
  const stats = { acquireHits: 0, acquireMisses: 0, evictions: 0, peakBytes: 0 };
  let totalBytes = 0;
  let useCounter = 0;

  function evictIfOverBudget() {
    if (!budgetBytes) {
      return;
    }
    while (totalBytes > budgetBytes) {
      let lruKey = null;
      let lruUse = Infinity;
      for (const [key, entry] of entries) {
        if (entry.refCount === 0 && entry.lastUse < lruUse) {
          lruUse = entry.lastUse;
          lruKey = key;
        }
      }
      if (lruKey === null) {
        return; // everything pinned: budget is a target, correctness wins
      }
      const entry = entries.get(lruKey);
      entries.delete(lruKey);
      totalBytes -= entry.bytes;
      stats.evictions += 1;
      const geometry = entry.geometry;
      geometry.boundsTree = null;
      geometry.halfEdges = null;
      geometry.groupIndices = null;
      delete geometry.userData.preparedHash;
      delete geometry.userData.sharedKey;
      geometry.dispose();
    }
  }

  return {
    stats,
    // Returns the geometry with refCount already incremented — the caller
    // owns one reference and must release() it. Pre-incrementing closes the
    // gap where a later acquisition in the same record set could otherwise
    // evict a geometry created moments earlier with refCount 0.
    acquire(key, createGeometry) {
      let entry = entries.get(key);
      if (entry) {
        stats.acquireHits += 1;
      } else {
        stats.acquireMisses += 1;
        const geometry = createGeometry();
        geometry.userData.sharedByGeometryId = true;
        geometry.userData.sharedKey = key;
        const bytes = (geometry.attributes.position.array.byteLength
          + (geometry.index ? geometry.index.array.byteLength : 0)) * 3.5;
        entry = { geometry, bytes, refCount: 0, lastUse: 0 };
        entries.set(key, entry);
        totalBytes += entry.bytes;
        stats.peakBytes = Math.max(stats.peakBytes, totalBytes);
      }
      entry.refCount += 1;
      entry.lastUse = ++useCounter;
      evictIfOverBudget();
      return entry.geometry;
    },
    release(geometry) {
      const key = geometry?.userData?.sharedKey;
      const entry = key === undefined ? undefined : entries.get(key);
      if (entry) {
        entry.refCount -= 1;
      }
    },
    dispose() {
      const leaked = [...entries.values()].filter(entry => entry.refCount !== 0);
      if (leaked.length > 0) {
        throw new Error(`Shared geometry store disposed with ${leaked.length} entries still referenced.`);
      }
      for (const entry of entries.values()) {
        entry.geometry.dispose();
      }
      entries.clear();
      totalBytes = 0;
    },
  };
}

export function geometryFromTypedArrays(positions, index) {
  const geometry = new THREE.BufferGeometry();
  // Each BufferGeometry owns a float64 copy because Brush.prepareGeometry may
  // replace attribute arrays with SharedArrayBuffers. Keep the folder cache's
  // master arrays unaliased and preserve Parquet's double precision.
  const positionArray = positions instanceof Float64Array
    ? positions.slice()
    : new Float64Array(positions);
  geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
  geometry.setIndex(index instanceof Uint32Array
    ? new THREE.Uint32BufferAttribute(index, 1)
    : new THREE.Uint16BufferAttribute(index, 1));
  // computeVertexNormals reuses an existing normal attribute. Preallocate it as
  // float64; otherwise three.js creates a Float32BufferAttribute by default.
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float64Array(positionArray.length), 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function matrixFromRowMajorArray(values) {
  if (!Array.isArray(values) || values.length < 12) {
    throw new Error('Transform matrix must contain at least 12 numeric values.');
  }

  const matrix = new THREE.Matrix4();
  matrix.set(
    values[0], values[1], values[2], values[3],
    values[4], values[5], values[6], values[7],
    values[8], values[9], values[10], values[11],
    0, 0, 0, 1,
  );
  return matrix;
}

function brushFromRecord(record, material, sharing = null) {
  // Shared path: one BufferGeometry per unique geometry_id; the brush holds
  // one store reference (acquired here, released when the brush is
  // destroyed). The transform stays on the Brush
  // (a direct Matrix4), never in the geometry, so sharing does not
  // change CSG input. Without a store the brush owns a private geometry
  // with the original build-and-dispose lifecycle.
  let geometry;
  let BrushType = Brush;
  if (sharing?.store) {
    const geometryKey = `${record.folderPath}::${record.geometryId}`;
    geometry = sharing.store.acquire(
      geometryKey,
      () => geometryFromTypedArrays(record.positions, record.index),
    );
    if (sharing.sharedPrep) {
      BrushType = SharedGeometryBrush;
    }
  } else {
    geometry = geometryFromTypedArrays(record.positions, record.index);
  }
  const brush = new BrushType(geometry, material);
  brush.userData.geometrySourceKey = `${record.folderPath}::${record.geometryId}`;
  const matrix = matrixFromRowMajorArray(record.transform);
  if (record.rebaseOffset) {
    // The geometry vertices were shifted by -rebaseOffset when stored. Compensate
    // the (float64) matrix with M' = M * T(rebaseOffset) so the brush's world
    // position is preserved exactly: M' * (L - r) = M * L for every vertex L.
    // three-bvh-csg derives the inter-brush transform from these float64 matrices,
    // so the offset cancels exactly and the small float64 geometry stays precise.
    matrix.multiply(
      new THREE.Matrix4().makeTranslation(
        record.rebaseOffset[0],
        record.rebaseOffset[1],
        record.rebaseOffset[2],
      ),
    );
  }
  // Avoid matrix decomposition and recomposition so every serialized float64
  // value, including shear if present, reaches the CSG transform unchanged.
  brush.matrixAutoUpdate = false;
  brush.matrix.copy(matrix);
  brush.updateMatrixWorld(true);
  brush.name = record.globalId;
  return brush;
}

function matrixElementsEqual(left, right) {
  const leftElements = left.elements;
  const rightElements = right.elements;
  for (let index = 0; index < 16; index += 1) {
    if (Math.abs(leftElements[index] - rightElements[index]) > 1e-15) {
      return false;
    }
  }
  return true;
}

function getBrushGeometryIdentityKey(brush) {
  return brush.userData.geometrySourceKey || brush.geometry?.userData?.sharedKey || brush.geometry?.uuid || '';
}

function haveSameBrushIdentity(left, right) {
  return getBrushGeometryIdentityKey(left) === getBrushGeometryIdentityKey(right)
    && matrixElementsEqual(left.matrixWorld, right.matrixWorld);
}

function haveExactSameBrushSet(brushesA, brushesB) {
  if (brushesA.length === 0 || brushesA.length !== brushesB.length) {
    return false;
  }

  const matchedB = new Set();
  for (const brushA of brushesA) {
    let matchedIndex = -1;
    for (let index = 0; index < brushesB.length; index += 1) {
      if (!matchedB.has(index) && haveSameBrushIdentity(brushA, brushesB[index])) {
        matchedIndex = index;
        break;
      }
    }
    if (matchedIndex === -1) {
      return false;
    }
    matchedB.add(matchedIndex);
  }
  return true;
}

// Destroys brushes: shared geometries get their store reference released
// (the store decides their lifetime), privately-owned geometries are
// disposed as before.
function releaseBrushes(brushes = [], store = null) {
  for (const brush of brushes) {
    if (store && brush?.geometry?.userData?.sharedKey !== undefined) {
      store.release(brush.geometry);
    } else if (!brush?.geometry?.userData?.sharedByGeometryId) {
      brush?.geometry?.dispose?.();
    }
  }
}

function getObjectBox(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return null;
  }

  return box;
}

function unionBoxes(boxes) {
  const validBoxes = boxes.filter(Boolean);
  if (validBoxes.length === 0) {
    return null;
  }

  const union = validBoxes[0].clone();
  for (let index = 1; index < validBoxes.length; index += 1) {
    union.union(validBoxes[index]);
  }
  return union;
}

function getObjectWorldVertices(object) {
  const position = object?.geometry?.attributes?.position;
  if (!position) {
    return [];
  }

  const vertex = new THREE.Vector3();
  const points = [];
  object.updateMatrixWorld(true);
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld);
    points.push([vertex.x, vertex.y, vertex.z]);
  }
  return points;
}

function getOrientedClashBoxSizeMm(objects) {
  const points = objects.flatMap(object => getObjectWorldVertices(object));
  const size = computeOrientedClashSize(points);
  return {
    x: size.x * SOURCE_UNITS_TO_MM,
    y: size.y * SOURCE_UNITS_TO_MM,
    z: size.z * SOURCE_UNITS_TO_MM,
  };
}

function getBrushSetVolumeMm3(brushes) {
  return brushes.reduce((sum, brush) => sum + getPositiveVolumeMm3(brush), 0);
}

export function createObjectCacheKey(globalId, folderName = null) {
  const modelKey = String(folderName || '').trim().toLowerCase();
  if (!modelKey) {
    throw new Error('folderName is required for narrow-phase object cache keys.');
  }
  return `${modelKey}::${String(globalId || '').trim()}`;
}

function normalizeCacheObjectKeys(cacheObjectKeys) {
  if (cacheObjectKeys === null || cacheObjectKeys === undefined) {
    return null;
  }

  if (cacheObjectKeys instanceof Set) {
    return cacheObjectKeys;
  }

  if (Array.isArray(cacheObjectKeys)) {
    return new Set(cacheObjectKeys.map(key => String(key)));
  }

  throw new Error('cacheObjectKeys must be an array, Set, null, or undefined.');
}

function createNarrowPhaseObjectCache(folderCache, materials, options = {}) {
  const eligibleObjectKeys = normalizeCacheObjectKeys(options.cacheObjectKeys);
  const sharing = options.sharing || null;
  const records = new Map();
  const brushSets = new Map();
  const metrics = new Map();
  const stats = {
    recordHits: 0,
    recordMisses: 0,
    brushHits: 0,
    brushMisses: 0,
    metricHits: 0,
    metricMisses: 0,
    skippedObjects: 0,
  };

  function canCache(discipline, globalId, options = {}) {
    if (!eligibleObjectKeys) {
      return true;
    }

    const key = createObjectCacheKey(globalId, options.folderName);
    const eligible = eligibleObjectKeys.has(key);
    if (!eligible) {
      stats.skippedObjects += 1;
    }
    return eligible;
  }

  async function getRecords(discipline, globalId, options = {}) {
    const key = createObjectCacheKey(globalId, options.folderName);
    if (records.has(key)) {
      stats.recordHits += 1;
      return records.get(key);
    }

    stats.recordMisses += 1;
    const recordsPromise = loadObjectRecords(folderCache, discipline, globalId, options);
    records.set(key, recordsPromise);
    let value;
    try {
      value = await recordsPromise;
    } catch (error) {
      // A rejected promise must not stay cached: with deterministic inputs a
      // retry fails identically, but the cache should not pin the rejection.
      records.delete(key);
      throw error;
    }
    records.set(key, value);
    return value;
  }

  async function getBrushes(discipline, globalId, options = {}) {
    const key = createObjectCacheKey(globalId, options.folderName);
    if (brushSets.has(key)) {
      stats.brushHits += 1;
      return brushSets.get(key);
    }

    stats.brushMisses += 1;
    const brushesPromise = getRecords(discipline, globalId, options).then(objectRecords => {
      // Cached brushes keep their store references for the cache entry's
      // lifetime (released in dispose). If a build fails midway, roll back
      // the references already acquired so failed objects don't stay pinned.
      const built = [];
      try {
        for (const record of objectRecords) {
          built.push(brushFromRecord(record, materials.a, sharing));
        }
        return built;
      } catch (error) {
        releaseBrushes(built, sharing?.store);
        throw error;
      }
    });
    brushSets.set(key, brushesPromise);
    let value;
    try {
      value = await brushesPromise;
    } catch (error) {
      brushSets.delete(key);
      throw error;
    }
    brushSets.set(key, value);
    // The records entry has no consumer after the brushes exist; keeping it
    // would pin a second reference set for the rest of the run.
    records.delete(key);
    return value;
  }

  function getMetrics(discipline, globalId, brushes, options = {}) {
    const key = createObjectCacheKey(globalId, options.folderName);
    if (metrics.has(key)) {
      stats.metricHits += 1;
      return metrics.get(key);
    }

    stats.metricMisses += 1;
    const value = {
      volumeMm3: getBrushSetVolumeMm3(brushes),
      box: unionBoxes(brushes.map(brush => getObjectBox(brush))),
    };
    metrics.set(key, value);
    return value;
  }

  return {
    canCache,
    getBrushes,
    getMetrics,
    stats,
    dispose() {
      for (const cachedBrushes of brushSets.values()) {
        if (Array.isArray(cachedBrushes)) {
          releaseBrushes(cachedBrushes, sharing?.store);
        }
      }
      records.clear();
      brushSets.clear();
      metrics.clear();
    },
  };
}

function getPositiveVolumeMm3(mesh) {
  const volume = Math.abs(computeMeshVolume(mesh)) * SOURCE_VOLUME_TO_MM3;
  return Number.isFinite(volume) ? volume : 0;
}

export function createCsgEvaluator() {
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;
  evaluator.useCDTClipping = true;
  return evaluator;
}

function createBrushWorldBox(brush) {
  const box = new THREE.Box3();
  if (!brush.geometry.boundingBox) {
    brush.geometry.computeBoundingBox();
  }
  return box.copy(brush.geometry.boundingBox).applyMatrix4(brush.matrixWorld);
}

function disposeObject(object) {
  // Geometries shared by geometry_id are owned by the runtime's shared map
  // and disposed only there — per-brush disposal must not free them while
  // other brushes still reference them.
  if (object?.geometry?.userData?.sharedByGeometryId) {
    return;
  }
  object?.geometry?.dispose?.();
}

function disposeObjects(objects = []) {
  for (const object of objects) {
    disposeObject(object);
  }
}

async function loadBrushesForEndpoint(row, endpointIndex, folderCache, materials, options = {}) {
  const discipline = row[`Object ${endpointIndex} Discipline`];
  const globalId = row[`Object ${endpointIndex} GlobalID`];
  const folderName = row[`Object ${endpointIndex} Folder`] || null;
  const objectCache = options.objectCache || null;
  const endpointOptions = {
    ...options,
    folderName,
  };

  if (objectCache?.canCache(discipline, globalId, endpointOptions)) {
    return {
      brushes: await objectCache.getBrushes(discipline, globalId, endpointOptions),
      cached: true,
    };
  }

  const records = await loadObjectRecords(folderCache, discipline, globalId, endpointOptions);
  const material = endpointIndex === 1 ? materials.a : materials.b;
  // Uncached brushes participate in geometry sharing when enabled; their
  // store references are released in computeClashForRow's finally. Partial
  // build failures roll back references already acquired.
  const uncachedSharing = options.sharing?.shareUncached ? options.sharing : null;
  const built = [];
  try {
    for (const record of records) {
      built.push(brushFromRecord(record, material, uncachedSharing));
    }
  } catch (error) {
    releaseBrushes(built, uncachedSharing?.store);
    throw error;
  }
  return {
    brushes: built,
    cached: false,
  };
}

function getBrushMetrics(discipline, globalId, brushes, cached, objectCache, options = {}) {
  if (cached && objectCache) {
    return objectCache.getMetrics(discipline, globalId, brushes, options);
  }

  return {
    volumeMm3: getBrushSetVolumeMm3(brushes),
    box: unionBoxes(brushes.map(brush => getObjectBox(brush))),
  };
}

export function createCollisionReport(row, {
  collision,
  clashType,
  volumeMm3,
  overlapObjects,
  options,
  timing,
}) {
  const overlapBoxStartedAtMs = performance.now();
  const normalizedBoxSize = getOrientedClashBoxSizeMm(overlapObjects);
  addElapsedMs(timing, 'overlapBoxMs', overlapBoxStartedAtMs);
  const filteredByTolerance = collision && shouldFilterOverlappingByTolerance(
    clashType,
    normalizedBoxSize,
    row.toleranceMm,
  );
  const filteredByFillRatio = collision && shouldFilterByFillRatio(
    clashType,
    volumeMm3,
    normalizedBoxSize,
  );
  if (filteredByFillRatio && timing) {
    timing.fillRatioFilteredCount += 1;
  }
  const finalCollision = collision && !filteredByTolerance && !filteredByFillRatio;

  const reportRow = createNarrowPhaseReportRow(row, {
    collision: finalCollision,
    clashType,
    volumeMm3,
    boxSizeMm: normalizedBoxSize,
  });
  // Trace metadata for the evaluation tracer: exposes the pre-filter CSG outcome
  // and which final filter suppressed the row. Never written to CSV (rowsToCsv
  // only reads REPORT_COLUMNS).
  if (options?.includeTraceFields) {
    reportRow.Trace = {
      rawCollision: collision === true,
      filteredByTolerance: filteredByTolerance === true,
      filteredByFillRatio: filteredByFillRatio === true,
    };
  }
  return reportRow;
}

async function computeClashForRow(row, folderCache, materials, options = {}) {
  const rowStartedAtMs = performance.now();
  const timing = options.timing || null;
  let brushesA = [];
  let brushesB = [];
  let overlaps = [];
  const objectCache = options.objectCache || null;
  let cachedA = false;
  let cachedB = false;

  try {
    const loadBrushesStartedAtMs = performance.now();
    const [endpointA, endpointB] = await Promise.all([
      loadBrushesForEndpoint(row, 1, folderCache, materials, options),
      loadBrushesForEndpoint(row, 2, folderCache, materials, options),
    ]);
    addElapsedMs(timing, 'loadBrushesMs', loadBrushesStartedAtMs);
    brushesA = endpointA.brushes;
    brushesB = endpointB.brushes;
    cachedA = endpointA.cached;
    cachedB = endpointB.cached;

    const metricsStartedAtMs = performance.now();
    const metricsA = getBrushMetrics(
      row['Object 1 Discipline'],
      row['Object 1 GlobalID'],
      brushesA,
      cachedA,
      objectCache,
      { ...options, folderName: row['Object 1 Folder'] || null },
    );
    const metricsB = getBrushMetrics(
      row['Object 2 Discipline'],
      row['Object 2 GlobalID'],
      brushesB,
      cachedB,
      objectCache,
      { ...options, folderName: row['Object 2 Folder'] || null },
    );
    addElapsedMs(timing, 'metricsMs', metricsStartedAtMs);

    if (haveExactSameBrushSet(brushesA, brushesB)) {
      if (timing) {
        timing.duplicateFastPathCount += 1;
      }
      const formatStartedAtMs = performance.now();
      const volumeMm3 = Math.min(metricsA.volumeMm3, metricsB.volumeMm3);
      const collision = volumeMm3 > VOLUME_TOLERANCE_MM3;
      const reportRow = createCollisionReport(row, {
        collision,
        clashType: collision ? 'Duplicate' : 'NA',
        volumeMm3,
        overlapObjects: brushesA,
        options,
        timing,
      });
      addElapsedMs(timing, 'formatResultMs', formatStartedAtMs);
      return reportRow;
    }

    const evaluator = options.evaluator || createCsgEvaluator();

    let volumeMm3 = 0;
    const boxesA = brushesA.map(createBrushWorldBox);
    const boxesB = brushesB.map(createBrushWorldBox);
    for (const [indexA, brushA] of brushesA.entries()) {
      for (const [indexB, brushB] of brushesB.entries()) {
        if (!boxesA[indexA].intersectsBox(boxesB[indexB])) {
          if (timing) {
            timing.csgAabbRejectedCount += 1;
          }
          continue;
        }

        // Explicit prep so its cost is visible as prepMs; evaluate() calls
        // the same method and early-returns on the matching brush hash.
        const prepStartedAtMs = performance.now();
        brushA.prepareGeometry();
        brushB.prepareGeometry();
        addElapsedMs(timing, 'prepMs', prepStartedAtMs);
        const evaluateStartedAtMs = performance.now();
        const overlap = evaluator.evaluate(brushA, brushB, INTERSECTION);
        addElapsedMs(timing, 'csgEvaluateMs', evaluateStartedAtMs);
        if (timing) {
          timing.csgOperationCount += 1;
        }

        overlap.updateMatrixWorld(true);
        const volumeStartedAtMs = performance.now();
        const overlapVolumeMm3 = getPositiveVolumeMm3(overlap);
        addElapsedMs(timing, 'intersectionVolumeMs', volumeStartedAtMs);
        if (overlapVolumeMm3 > VOLUME_TOLERANCE_MM3) {
          overlaps.push(overlap);
          volumeMm3 += overlapVolumeMm3;
        } else {
          disposeObject(overlap);
        }
      }
    }

    const formatStartedAtMs = performance.now();
    const collision = volumeMm3 > VOLUME_TOLERANCE_MM3;
    const clashType = classifyClash({
      collision,
      volumeA: metricsA.volumeMm3,
      volumeB: metricsB.volumeMm3,
      intersectionVolume: volumeMm3,
      boxA: metricsA.box,
      boxB: metricsB.box,
      boxContainmentTolerance: BBOX_CONTAINMENT_TOLERANCE_MM / SOURCE_UNITS_TO_MM,
      duplicateVolumeDiffRatio: DUPLICATE_VOLUME_DIFF_RATIO,
      intersectionVolumeMatchRatio: INTERSECTION_VOLUME_MATCH_RATIO,
    });
    const reportRow = createCollisionReport(row, {
      collision,
      clashType,
      volumeMm3,
      overlapObjects: overlaps,
      options,
      timing,
    });
    addElapsedMs(timing, 'formatResultMs', formatStartedAtMs);
    return reportRow;
  } finally {
    const disposeStartedAtMs = performance.now();
    const store = options.sharing?.store || null;
    if (!cachedA) {
      releaseBrushes(brushesA, store);
    }
    if (!cachedB) {
      releaseBrushes(brushesB, store);
    }
    disposeObjects(overlaps);
    addElapsedMs(timing, 'disposeMs', disposeStartedAtMs);
    if (timing) {
      timing.pairCount += 1;
      timing.rowTotalMs += performance.now() - rowStartedAtMs;
    }
  }
}

export async function createNarrowPhaseRuntime({
  projectDescriptor,
  cacheObjects = true,
  cacheObjectKeys = null,
  narrowPhaseSharedPrep = true,
  narrowPhaseShareUncached = true,
  narrowPhaseGeometryBudgetBytes = 0,
}) {
  const project = createProjectDescriptor(projectDescriptor);
  const folderCache = await createFolderCache(project);
  const materials = {
    a: new THREE.MeshBasicMaterial(),
    b: new THREE.MeshBasicMaterial(),
  };
  const evaluator = createCsgEvaluator();
  const sharing = {
    store: createSharedGeometryStore({ budgetBytes: narrowPhaseGeometryBudgetBytes }),
    sharedPrep: narrowPhaseSharedPrep !== false,
    shareUncached: narrowPhaseShareUncached !== false,
  };
  const objectCache = cacheObjects
    ? createNarrowPhaseObjectCache(folderCache, materials, { cacheObjectKeys, sharing })
    : null;

  return {
    async runPairs({
      pairs,
      onProgress = () => {},
      shouldCancel = () => false,
      cacheObjects: batchCacheObjects = cacheObjects,
      includeTraceFields = false,
    }) {
      const runStartedAtMs = performance.now();
      const timing = createNarrowPhaseTiming();
      const effectiveObjectCache = batchCacheObjects ? objectCache : null;
      const normalizePairsStartedAtMs = performance.now();
      const rows = normalizeNarrowPhasePairs(pairs);
      addElapsedMs(timing, 'normalizePairsMs', normalizePairsStartedAtMs);
      const progressEmitter = createNarrowPhaseProgressEmitter({ onProgress });
      const results = [];
      let succeeded = 0;
      let failed = 0;

      await throwIfCanceled(shouldCancel, 'narrow-phase setup');
      await progressEmitter.emit({
        total: rows.length,
        processed: 0,
        succeeded,
        failed,
        currentClashGuid: '',
      }, { force: true });

      const pairLoopStartedAtMs = performance.now();
      for (const [index, row] of rows.entries()) {
        await throwIfCanceled(shouldCancel, 'narrow-phase row');
        await progressEmitter.emit({
          currentClashGuid: row['Clash GUID'],
          processed: index,
          succeeded,
          failed,
        }, { force: index === 0 });

        try {
          results.push(await computeClashForRow(row, folderCache, materials, {
            objectCache: effectiveObjectCache,
            evaluator,
            sharing,
            timing,
            includeTraceFields,
          }));
          succeeded += 1;
        } catch (error) {
          results.push(createNarrowPhaseErrorRow(row, error));
          failed += 1;
          timing.errorCount += 1;
        }

        await progressEmitter.emit({
          currentClashGuid: row['Clash GUID'],
          processed: index + 1,
          succeeded,
          failed,
        }, { force: index === rows.length - 1 });
        await throwIfCanceled(shouldCancel, 'narrow-phase row');
      }
      addElapsedMs(timing, 'pairLoopMs', pairLoopStartedAtMs);

      return {
        total: rows.length,
        processed: rows.length,
        succeeded,
        failed,
        results,
        timing: finalizeNarrowPhaseTiming(timing, runStartedAtMs, objectCache?.stats
          ? { ...objectCache.stats, sharedGeometryStore: { ...sharing.store.stats } }
          : { sharedGeometryStore: { ...sharing.store.stats } }),
      };
    },

    getCacheStats() {
      return objectCache?.stats || null;
    },

    dispose() {
      // Order matters: the object cache releases its brushes' store
      // references first, then the store asserts all refcounts are zero
      // (a leak fails loudly) and disposes the geometries.
      objectCache?.dispose();
      sharing.store.dispose();
      materials.a.dispose();
      materials.b.dispose();
    },
  };
}

export async function runNarrowPhaseForPairs({
  projectDescriptor,
  pairs,
  onProgress = () => {},
  shouldCancel = () => false,
  cacheObjects = true,
  cacheObjectKeys = null,
  narrowPhaseSharedPrep = true,
  narrowPhaseShareUncached = true,
  narrowPhaseGeometryBudgetBytes = 0,
}) {
  const runtime = await createNarrowPhaseRuntime({
    projectDescriptor,
    cacheObjects,
    cacheObjectKeys,
    narrowPhaseSharedPrep,
    narrowPhaseShareUncached,
    narrowPhaseGeometryBudgetBytes,
  });

  try {
    return await runtime.runPairs({
      pairs,
      onProgress,
      shouldCancel,
      cacheObjects,
    });
  } finally {
    runtime.dispose();
  }
}
