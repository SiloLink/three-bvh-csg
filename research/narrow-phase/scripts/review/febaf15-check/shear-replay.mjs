import * as THREE from '../head/node_modules/three/build/three.module.js';
import { Brush, Evaluator, INTERSECTION, computeMeshVolume } from './source/src/index.js';
const shear = new THREE.Matrix4().set(1,1,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1);
function brush(size) {
 const geometry = new THREE.BoxGeometry(size,size,size);
 for (const key of ['position','normal']) {
  const attribute = geometry.attributes[key];
  geometry.setAttribute(key,new THREE.BufferAttribute(new Float64Array(attribute.array),attribute.itemSize));
 }
 const result = new Brush(geometry);
 result.matrixAutoUpdate = false;
 result.matrix.copy(shear);
 result.updateMatrixWorld(true);
 return result;
}
const evaluator = new Evaluator();
evaluator.attributes = ['position','normal'];
evaluator.useCDTClipping = true;
evaluator.useGroups = false;
const result = evaluator.evaluate(brush(2),brush(1),INTERSECTION);
const before = computeMeshVolume(result);
result.updateMatrixWorld(true);
console.log(JSON.stringify({expected:1,beforeUpdateMatrixWorld:before,afterUpdateMatrixWorld:computeMeshVolume(result),matrixAutoUpdate:result.matrixAutoUpdate},null,2));
