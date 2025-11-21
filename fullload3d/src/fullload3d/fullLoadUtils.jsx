// src/fullLoad3d/fullLoadUtils.js
import * as THREE from "three";

/**
 * Conversions & small helpers
 */
export const cmToM = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return n / 100;
};

export const round2 = (v) => {
  const n = Number(v) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export const snap = (v, step = 0.05) => {
  const n = Number(v) || 0;
  return Math.round(n / step) * step;
};

/**
 * Clamp a proposed position so the box (size) stays inside bauBox
 * bauBox = { min: {x,y,z}, max: {x,y,z} }
 * size = { x,y,z } (dimensions in meters)
 */
export function clampInsideBau(pos, size, bauBox) {
  if (!bauBox) return pos;
  const halfX = (size.x || 0) / 2;
  const halfY = (size.y || 0) / 2;
  const halfZ = (size.z || 0) / 2;

  const x = Math.min(Math.max(pos.x, bauBox.min.x + halfX), bauBox.max.x - halfX);
  const y = Math.min(Math.max(pos.y, bauBox.min.y + halfY), bauBox.max.y - halfY);
  const z = Math.min(Math.max(pos.z, bauBox.min.z + halfZ), bauBox.max.z - halfZ);

  return { x, y, z };
}

/**
 * Create a Box mesh sized in meters: scale = [sx, sy, sz]
 */
export function createBoxMesh(scale = [1, 1, 1], color = "#ff7a18") {
  const [sx, sy, sz] = scale.map((v) => Number(v) || 0.001);
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.04,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // userData placeholders
  mesh.userData = mesh.userData || {};
  mesh.userData._size = { x: sx, y: sy, z: sz };
  return mesh;
}

/**
 * Create a "tire" visual using TorusGeometry.
 * outerDiameter, tube are in meters.
 * outerDiameter = total outside diameter (m)
 * tube = thickness of the ring (m)
 */
export function createTireMesh({ outerDiameter = 1.0, tube = 0.2, color = "#333" } = {}) {
  // torus radius parameters: radius = outerDiameter/2, tube = tube
  const radius = Math.max(outerDiameter / 2, 0.001);
  const tubeRadius = Math.max(tube / 2, 0.001);

  // torus geometry: (radius, tubeRadius, radialSegments, tubularSegments)
  const geo = new THREE.TorusGeometry(radius, tubeRadius, 16, 48);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.02,
  });

  const mesh = new THREE.Mesh(geo, mat);
  // orient torus so its hole axis is along X (so it stands like a tire)
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.userData = mesh.userData || {};
  // approximate AABB size for collision/stacking (diameter × height)
  mesh.userData._size = { x: outerDiameter, y: tube, z: outerDiameter };
  return mesh;
}

/**
 * Make an AABB Box3 for a given size (meters) centered at position (THREE.Vector3 or plain {x,y,z})
 */
export function makeAABBForSizeAt(size = { x: 0.1, y: 0.1, z: 0.1 }, pos = { x: 0, y: 0, z: 0 }) {
  const half = { x: (size.x || 0) / 2, y: (size.y || 0) / 2, z: (size.z || 0) / 2 };
  const min = new THREE.Vector3(pos.x - half.x, pos.y - half.y, pos.z - half.z);
  const max = new THREE.Vector3(pos.x + half.x, pos.y + half.y, pos.z + half.z);
  return new THREE.Box3(min, max);
}

/**
 * AABB intersection helper
 * Accepts two THREE.Box3
 */
export function aabbIntersect(a, b) {
  if (!a || !b) return false;
  // THREE.Box3 exposes intersectsBox
  try {
    return a.intersectsBox(b);
  } catch (e) {
    // fallback to manual test
    return !(
      a.max.x <= b.min.x ||
      a.min.x >= b.max.x ||
      a.max.y <= b.min.y ||
      a.min.y >= b.max.y ||
      a.max.z <= b.min.z ||
      a.min.z >= b.max.z
    );
  }
}

/**
 * Check if box A is resting on top of box B.
 * Criteria:
 * 1. A.min.y is approximately B.max.y
 * 2. They overlap in the X-Z plane.
 */
export function aabbIsOnTop(a, b) {
  if (!a || !b) return false;

  // Vertical proximity check (epsilon 0.01m)
  const vertDiff = Math.abs(a.min.y - b.max.y);
  if (vertDiff > 0.02) return false;

  // Horizontal overlap check
  const overlapX = Math.max(0, Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x));
  const overlapZ = Math.max(0, Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z));

  return (overlapX > 0.01 && overlapZ > 0.01);
}

/**
 * Create a simple Cylinder mesh (e.g. for drums, stacked tires, etc.)
 * diameter, height in meters
 */
export function createCylinderMesh({ diameter = 1, height = 1, color = "#333" } = {}) {
  const radius = Math.max(diameter / 2, 0.001);
  const h = Math.max(height, 0.001);
  const geo = new THREE.CylinderGeometry(radius, radius, h, 32);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Cylinder is created centered at (0,0,0) with height along Y.
  // We usually want pivot at bottom? Or center is fine if we position it at y = height/2.
  // The engine positions items at center.y = sy/2. So center pivot is correct.

  mesh.userData = mesh.userData || {};
  mesh.userData._size = { x: diameter, y: height, z: diameter };
  return mesh;
}
