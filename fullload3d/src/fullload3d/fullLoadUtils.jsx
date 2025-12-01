import * as THREE from "three";

// ===========================
// CONVERSIONS
// ===========================
export function cmToM(cm) {
  return (cm || 0) / 100;
}

export function mToCm(m) {
  return (m || 0) * 100;
}

// ===========================
// GEOMETRY HELPERS
// ===========================

export function createBoxMesh(size, color) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.5,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Add edges (outline)
  const edges = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
  mesh.add(line);

  return mesh;
}

export function createCylinderMesh({ diameter, height, color }) {
  const geometry = new THREE.CylinderGeometry(diameter / 2, diameter / 2, height, 32);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.5,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Add edges (outline)
  // For cylinder, EdgesGeometry might be too busy with vertical lines. 
  // Let's try it, or use a threshold angle.
  const edges = new THREE.EdgesGeometry(geometry, 30); // Threshold angle to avoid too many lines
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
  mesh.add(line);

  // Rotate to stand up if needed? Three.js cylinder is Y-up by default, which matches our logic.
  return mesh;
}

export function createTireMesh({ radius, width, color }) {
  // Tire is a cylinder rotated 90deg on Z usually, or just a cylinder
  // Let's assume simple cylinder for now
  const geometry = new THREE.CylinderGeometry(radius, radius, width, 32);
  geometry.rotateZ(Math.PI / 2); // Rotate to lie on side
  const material = new THREE.MeshStandardMaterial({
    color: color || 0x333333,
    roughness: 0.9,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ===========================
// MATH / PACKING HELPERS
// ===========================

export function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function snap(val, step = 0.05) {
  return Math.round(val / step) * step;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function clampInsideBau(pos, size, bauBox, margin = 0) {
  // pos is center
  // size is {x, y, z}
  // bauBox is { min: {x,y,z}, max: {x,y,z} }

  const halfX = size.x / 2;
  const halfY = size.y / 2;
  const halfZ = size.z / 2;

  // Apply margin to ensure it's strictly inside
  const minX = bauBox.min.x + halfX + margin;
  const maxX = bauBox.max.x - halfX - margin;
  const minY = bauBox.min.y + halfY + margin;
  const maxY = bauBox.max.y - halfY - margin;
  const minZ = bauBox.min.z + halfZ + margin;
  const maxZ = bauBox.max.z - halfZ - margin;

  // Handle case where item is larger than box (clamp to center or min)
  const x = (minX > maxX) ? (bauBox.min.x + bauBox.max.x) / 2 : clamp(pos.x, minX, maxX);
  const y = (minY > maxY) ? (bauBox.min.y + bauBox.max.y) / 2 : clamp(pos.y, minY, maxY);
  const z = (minZ > maxZ) ? (bauBox.min.z + bauBox.max.z) / 2 : clamp(pos.z, minZ, maxZ);

  return { x, y, z };
}

// AABB Helpers
export function getAABB(mesh) {
  // Always use Box3 to ensure we get the correct world-space AABB, 
  // especially for rotated items.
  const box = new THREE.Box3().setFromObject(mesh);
  return { min: box.min, max: box.max };
}

export function makeAABBForSizeAt(size, pos) {
  return {
    min: { x: pos.x - size.x / 2, y: pos.y - size.y / 2, z: pos.z - size.z / 2 },
    max: { x: pos.x + size.x / 2, y: pos.y + size.y / 2, z: pos.z + size.z / 2 },
  };
}

export function aabbIntersect(a, b) {
  return (
    a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y &&
    a.min.z < b.max.z &&
    a.max.z > b.min.z
  );
}

export function aabbIsOnTop(topBox, bottomBox) {
  // Check if topBox is resting on bottomBox
  // 1. Vertical proximity
  const vert = Math.abs(topBox.min.y - bottomBox.max.y) < 0.01;
  if (!vert) return false;

  // 2. Horizontal overlap
  const overlapX = topBox.max.x > bottomBox.min.x && topBox.min.x < bottomBox.max.x;
  const overlapZ = topBox.max.z > bottomBox.min.z && topBox.min.z < bottomBox.max.z;

  return overlapX && overlapZ;
}

/**
 * Tight Pack Heuristic
 * Tries to snap 'x' and 'z' to existing edges to minimize gaps.
 */
export function tightPack(x, z, fx, fz, L, W, existingItems, excludeMesh = null) {
  // Candidates from walls
  const xCands = [fx / 2, L - fx / 2];
  const zCands = [fz / 2, W - fz / 2];

  for (const item of existingItems) {
    if (item.mesh === excludeMesh) continue;
    const b = item.aabb || getAABB(item.mesh);
    const icx = (b.min.x + b.max.x) / 2;
    const icz = (b.min.z + b.max.z) / 2;
    const ifx = b.max.x - b.min.x;
    const ifz = b.max.z - b.min.z;

    // If overlaps in Z, add X candidates
    if (Math.abs(z - icz) <= (fz / 2 + ifz / 2) + 0.001) {
      xCands.push(icx - (ifx / 2 + fx / 2));
      xCands.push(icx + (ifx / 2 + fx / 2));
    }
    // If overlaps in X, add Z candidates
    if (Math.abs(x - icx) <= (fx / 2 + ifx / 2) + 0.001) {
      zCands.push(icz - (ifz / 2 + fz / 2));
      zCands.push(icz + (ifz / 2 + fz / 2));
    }
  }

  // Find closest X
  let xs = xCands[0];
  let xd = Math.abs(x - xs);
  for (const v of xCands) {
    const d = Math.abs(x - v);
    if (d < xd) { xd = d; xs = v; }
  }

  // Find closest Z
  let zs = zCands[0];
  let zd = Math.abs(z - zs);
  for (const v of zCands) {
    const d = Math.abs(z - v);
    if (d < zd) { zd = d; zs = v; }
  }

  // Clamp to container
  xs = clamp(xs, fx / 2, L - fx / 2);
  zs = clamp(zs, fz / 2, W - fz / 2);

  return { x: xs, z: zs };
}

/**
 * Support Top Heuristic
 * Finds the highest Y below the given footprint (x, z, fx, fz).
 */
export function supportTopAt(cx, cz, fx, fz, existingItems, excludeMesh = null) {
  let top = 0;
  for (const item of existingItems) {
    if (item.mesh === excludeMesh) continue;
    const b = item.aabb || getAABB(item.mesh);

    // Check overlap in XZ plane
    // Item center
    const icx = (b.min.x + b.max.x) / 2;
    const icz = (b.min.z + b.max.z) / 2;
    // Item size
    const ifx = b.max.x - b.min.x;
    const ifz = b.max.z - b.min.z;

    const overlapX = Math.abs(icx - cx) <= (ifx / 2 + fx / 2) - 0.00001;
    const overlapZ = Math.abs(icz - cz) <= (ifz / 2 + fz / 2) - 0.00001;

    if (overlapX && overlapZ) {
      top = Math.max(top, b.max.y);
    }
  }
  return top;
}

export function computeStackY(existingItems, bauBox, x, z, fx, fy, fz, currentType = "caixa") {
  // 1. Floor check
  const floorY = fy / 2;
  let currentY = floorY;

  // 2. Find highest support
  // We only stack if we have significant overlap (e.g. > 20% of footprint)
  // Otherwise, if we overlap slightly, it's a collision (return null).

  const myArea = fx * fz;
  const minSupportArea = myArea * 0.20; // 20% threshold

  for (const item of existingItems) {
    const b = item.aabb || getAABB(item.mesh);

    // Check overlap
    const icx = (b.min.x + b.max.x) / 2;
    const icz = (b.min.z + b.max.z) / 2;
    const ifx = b.max.x - b.min.x;
    const ifz = b.max.z - b.min.z;

    // Overlap width/depth
    const overlapW = Math.max(0, Math.min(x + fx / 2, b.max.x) - Math.max(x - fx / 2, b.min.x));
    const overlapD = Math.max(0, Math.min(z + fz / 2, b.max.z) - Math.max(z - fz / 2, b.min.z));

    // Use a slightly larger epsilon for "significant" overlap to avoid noise
    const epsilon = 0.005;

    if (overlapW > epsilon && overlapD > epsilon) {
      const area = overlapW * overlapD;

      // Check for forbidden stacking: Box on Cylinder
      const itemBelowType = item.data?.tipo || item.data?.meta?.tipo || "caixa";
      if (currentType === "caixa" && itemBelowType === "cilindrico") {
        // Forbidden: Box cannot stack on Cylinder
        return null;
      }

      // Cylinder on Box is allowed.
      // Cylinder on Cylinder is allowed.

      if (area >= minSupportArea) {
        // Valid support
        if (b.max.y >= currentY - 0.01) {
          currentY = Math.max(currentY, b.max.y + fy / 2);
        }
      } else {
        // Insignificant overlap -> Collision!
        // We can't stack on it (unsafe), and we can't be inside it.
        return null;
      }
    }
  }

  // 3. Ceiling check
  if (currentY + fy / 2 > bauBox.max.y) return null;

  return currentY;
}
