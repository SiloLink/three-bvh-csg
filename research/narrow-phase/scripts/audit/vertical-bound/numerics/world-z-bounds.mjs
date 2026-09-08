// Isolated research helper. Certifies static input geometry only, not CSG output.
const bits = new DataView(new ArrayBuffer(8));
const MIN = Number.MIN_VALUE;

export function nextUp(value) {
  if (Number.isNaN(value) || value === Infinity) return value;
  if (value === 0) return MIN;
  bits.setFloat64(0, value, false);
  const word = bits.getBigUint64(0, false);
  bits.setBigUint64(0, value > 0 ? word + 1n : word - 1n, false);
  return bits.getFloat64(0, false);
}

export function nextDown(value) {
  return -nextUp(-value);
}

function fail(reason) {
  return { min: -Infinity, max: Infinity, certified: false, reason };
}

function product(value, coefficient) {
  // Multiplication by zero is exact, including subnormal operands.
  if (value === 0 || coefficient === 0) return [0, 0];
  const rounded = value * coefficient;
  return [nextDown(rounded), nextUp(rounded)];
}

function sum(a, b) {
  return [nextDown(a[0] + b[0]), nextUp(a[1] + b[1])];
}

export function boundPointWorldZ(x, y, z, elements) {
  let range = sum(product(x, elements[2]), product(y, elements[6]));
  range = sum(range, product(z, elements[10]));
  range = sum(range, [elements[14], elements[14]]);
  if (!range.every(Number.isFinite)) return fail('Non-finite arithmetic enclosure');
  return { min: range[0], max: range[1], certified: true };
}

function matrixFailure(matrixWorld) {
  const e = matrixWorld?.elements;
  if (!e || e.length !== 16 || !Array.from(e).every(Number.isFinite)) {
    return 'A finite Matrix4 is required';
  }
  if (e[3] !== 0 || e[7] !== 0 || e[11] !== 0 || e[15] !== 1) {
    return 'Only affine Matrix4 values are certified';
  }
  return null;
}

export function worldZBounds(geometry, matrixWorld) {
  const invalid = matrixFailure(matrixWorld);
  if (invalid) return fail(invalid);
  const e = matrixWorld.elements;
  const position = geometry?.getAttribute?.('position') ?? geometry?.attributes?.position;
  if (!position || !Number.isInteger(position.count) || position.count <= 0 ||
      position.itemSize < 3 || typeof position.getX !== 'function' ||
      typeof position.getY !== 'function' || typeof position.getZ !== 'function') {
    return fail('A nonempty static position attribute is required');
  }

  let min = Infinity;
  let max = -Infinity;
  // Reading every position is conservative for indexed/drawRange geometry,
  // including unused vertices. Morphing/skinning must already be materialized.
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (![x, y, z].every(Number.isFinite)) return fail('Non-finite position');
    const range = boundPointWorldZ(x, y, z, e);
    if (!range.certified) return range;
    min = Math.min(min, range.min);
    max = Math.max(max, range.max);
  }
  return { min, max, certified: true };
}

export function worldZBoundsFromBox(box, matrixWorld) {
  // Caller must establish that this finite local box contains every position
  // and that neither the geometry nor box changed since that was established.
  const invalid = matrixFailure(matrixWorld);
  if (invalid) return fail(invalid);
  const axes = ['x', 'y', 'z'];
  if (!box?.min || !box?.max || axes.some(axis =>
    !Number.isFinite(box.min[axis]) || !Number.isFinite(box.max[axis]) ||
    box.min[axis] > box.max[axis])) return fail('A finite nonempty local box is required');
  let min = Infinity;
  let max = -Infinity;
  for (let corner = 0; corner < 8; corner++) {
    const x = corner & 1 ? box.max.x : box.min.x;
    const y = corner & 2 ? box.max.y : box.min.y;
    const z = corner & 4 ? box.max.z : box.min.z;
    const range = boundPointWorldZ(x, y, z, matrixWorld.elements);
    if (!range.certified) return range;
    min = Math.min(min, range.min);
    max = Math.max(max, range.max);
  }
  return { min, max, certified: true };
}

export function intervalOverlapHeightMm(a, b) {
  if (!a?.certified || !b?.certified ||
      ![a.min, a.max, b.min, b.max].every(Number.isFinite) ||
      a.min > a.max || b.min > b.max) return null;
  const min = Math.max(a.min, b.min);
  const max = Math.min(a.max, b.max);
  if (max <= min) return 0;
  const metres = nextUp(max - min);
  const millimetres = nextUp(metres * 1000);
  return Number.isFinite(millimetres) ? millimetres : null;
}
