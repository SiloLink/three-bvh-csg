import * as THREE from '__CSG_RESEARCH_ROOT__/clash-detection/backend/node_modules/three/build/three.module.js';
import { Brush, INTERSECTION, computeMeshVolume } from '__CSG_RESEARCH_ROOT__/clash-detection/backend/node_modules/three-bvh-csg/src/index.js';
import { createCsgEvaluator, geometryFromTypedArrays } from '__CSG_RESEARCH_ROOT__/clash-detection/backend/src/core/narrow/narrow-phase.js';
const shear = new THREE.Matrix4().set(1,1,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
function brush(size) {
  const source = new THREE.BoxGeometry(size,size,size);
  const geometry = geometryFromTypedArrays(new Float64Array(source.attributes.position.array),source.index.array);
  const result = new Brush(geometry);
  result.matrixAutoUpdate = false;
  result.matrix.copy(shear);
  result.updateMatrixWorld(true);
  return result;
}
const a = brush(2), b = brush(1);
const result = createCsgEvaluator().evaluate(a,b,INTERSECTION);
const before = { volume: computeMeshVolume(result), determinant: result.matrixWorld.determinant(), matrixWorld: [...result.matrixWorld.elements] };
result.updateMatrixWorld(true);
const after = { volume: computeMeshVolume(result), determinant: result.matrixWorld.determinant(), matrixWorld: [...result.matrixWorld.elements] };
console.log(JSON.stringify({ expectedVolume: 1, before, after }, null, 2));
