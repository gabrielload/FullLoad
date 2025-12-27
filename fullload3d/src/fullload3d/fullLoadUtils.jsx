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

// Material cache for reuse
const materialCache = new Map();

export function getMaterial(color) {
  const key = color.toString();
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0,
      flatShading: true // Faster rendering
    }));
  }
  return materialCache.get(key);
}

// Shared Geometries (Singletons for Performance)
const sharedBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const sharedBoxEdges = new THREE.EdgesGeometry(sharedBoxGeometry);

// Cylinder: Radius 0.5 (Diameter 1), Height 1. Scale(D, H, D)
const sharedCylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
const sharedCylinderEdges = new THREE.EdgesGeometry(sharedCylinderGeometry, 30);

// Tire: Same as Cylinder but rotated Z 90deg to lie on side.
// Warning: We must clone geometry if we rotate it, but we can do it once globally.
const sharedTireGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
sharedTireGeometry.rotateZ(Math.PI / 2);
const sharedTireEdges = new THREE.EdgesGeometry(sharedTireGeometry, 30);

export function createBoxMesh(size, color) {
  // Use shared geometry and scale it
  const material = getMaterial(color);
  const mesh = new THREE.Mesh(sharedBoxGeometry, material);

  // Apply size via scale
  mesh.scale.set(size[0], size[1], size[2]);

  mesh.castShadow = false;
  mesh.receiveShadow = false;

  // Clone shared lines (LineSegments logic: geometry is shared, material is new)
  const line = new THREE.LineSegments(sharedBoxEdges, new THREE.LineBasicMaterial({ color: 0x000000 }));
  // Line will inherit scale from parent mesh automagically!
  mesh.add(line);

  return mesh;
}

export function createCylinderMesh({ diameter, height, color }) {
  const material = getMaterial(color);
  const mesh = new THREE.Mesh(sharedCylinderGeometry, material);

  // Scale: X=Diameter, Y=Height, Z=Diameter
  mesh.scale.set(diameter, height, diameter);

  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const line = new THREE.LineSegments(sharedCylinderEdges, new THREE.LineBasicMaterial({ color: 0x000000 }));
  mesh.add(line);

  return mesh;
}

export function createTireMesh({ radius, width, color }) {
  const material = getMaterial(color || 0x333333);
  const mesh = new THREE.Mesh(sharedTireGeometry, material);

  // Shared geometry is lying on X axis (height=width). Y/Z are Diameter.
  // Scale X by Width. Scale Y/Z by Diameter (Radius * 2)
  const diameter = radius * 2;
  mesh.scale.set(width, diameter, diameter);

  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const line = new THREE.LineSegments(sharedTireEdges, new THREE.LineBasicMaterial({ color: 0x000000 }));
  mesh.add(line);

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

      // --- TIRE/CYLINDER NESTING ---
      // If both are cylinders/tires, we can nest them.
      // Nesting offset = radius * sqrt(3) for hexagonal packing (perfect nesting)
      // or simply radius.
      // Let's assume vertical cylinders (standing tires).
      // Distance between centers should be >= diameter (touching).
      // If we want to nest in the "grooves" of a previous row:
      // Row 1: X=0, X=D, X=2D...
      // Row 2: X=D/2, X=1.5D... (Shifted by radius)
      // Z offset = D * sin(60deg) ~ 0.866 * D

      // For this heuristic, we add candidates that are "nested" relative to the existing item.
      // If item is a cylinder/pneu:
      const itemType = item.data?.tipo || item.data?.meta?.tipo;
      // We don't have currentType passed to tightPack easily, but we can assume if we are calling it 
      // we might want to try nesting.
      // Let's just add the nested candidate points regardless, validity check will filter them.

      if (itemType === "cilindrico" || itemType === "pneu") {
        const r = ifx / 2; // Radius of existing
        const myR = fx / 2; // Radius of current (approx)

        // Hexagonal nesting candidates (6 neighbors)
        // We only care about those that might be valid (positive coordinates)
        // But tightPack just returns X/Z.
        // Let's add "interlaced" X candidates if Z is close to the "nesting row" distance.
        // This is complex for a simple heuristic.

        // Simpler approach: Add candidates at X +/- Radius.
        // If we are placing a tire next to another, the standard candidate (touching) is X + D.
        // The nested candidate is X + R (halfway) BUT Z must be different.
      }
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
      // PALLET RULE CHECK FOR OPTIMIZER / GENERIC SUPPORT
      const itemData = item.data || {};
      const meshMeta = item.mesh?.userData?._meta || {};
      const resolvedMeta = itemData.tipo ? itemData : (itemData.meta || meshMeta);

      if ((resolvedMeta.tipo || "").toLowerCase() === "palete") {
        // If we are strictly checking top, a pallet creates an "infinite" block or invalid surface
        // But supportTopAt just returns Y.
        // If we return a simplified "Infinity", it might break optimization logic.
        // For now, let's just let optimization stack? NO, user said "never".
        // But `supportTopAt` is specific to the "Auto Optimize" function which uses a different logic?
        // The user said "Eu consegui empilhar" (I managed to stack), implying MANUAL placement.

        // Let's stick to `computeStackY` for manual.
      }
      top = Math.max(top, b.max.y);
    }
  }
  return top;
}

// Cache-busting comment: Update 2024-12-16 - Fixed itemBelowMeta reference
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

      // --- ADVANCED STACKING RULES ---
      // Robustly resolve metadata and type
      // --- ADVANCED STACKING RULES ---
      // AGGRESSIVE METADATA SCAN
      const metaSources = [
        item.data,                     // Standard data (from placed.values())
        item.data?.meta,               // Nested meta
        item.mesh?.userData?.meta,     // Mesh meta (placed)
        item.mesh?.userData?._meta     // Ghost meta (legacy/preview)
      ];

      let foundType = "caixa";
      let resolvedMeta = {};

      for (const source of metaSources) {
        if (source) {
          if (source.tipo) foundType = source.tipo;
          // Merge props into resolvedMeta (priority to first found, but accumulate non-nulls)
          resolvedMeta = { ...source, ...resolvedMeta };
        }
      }

      const itemBelowType = foundType.trim().toLowerCase();

      // DEBUG LOG (Uncomment if needed)
      // console.log(`Overlap check: Below=${itemBelowType}, Current=${currentType}, Area=${area}`);

      // 1. Fragility Check: Cannot stack ON TOP of fragile items
      if (resolvedMeta.fragilidade === "alta" || resolvedMeta.fragilidade === "media") {
        return null; // Forbidden
      }

      // 2. Stackable Check
      if (resolvedMeta.empilhavel === false) {
        return null; // Forbidden
      }

      // 3. Hazardous Check
      if (resolvedMeta.perigoso === true) {
        return null; // Forbidden
      }

      // 4. Type Compatibility
      if (currentType === "caixa" && itemBelowType === "cilindrico") return null;
      if (currentType === "caixa" && itemBelowType === "pneu") return null;

      // 5. Pallet Rule: Nothing can be stacked ON TOP of a pallet.
      if (itemBelowType === "palete") {
        return null; // Forbidden
      }

      // 6. Tire Nesting... (continue logic)
      if (area >= minSupportArea) {
        // Valid support
        if (b.max.y >= currentY - 0.01) {
          currentY = Math.max(currentY, b.max.y + fy / 2);
        }
      } else {
        // Insignificant overlap -> Collision!
        return null;
      }
    }
  }

  // 3. Ceiling check
  if (currentY + fy / 2 > bauBox.max.y) return null;

  return currentY;
}

export function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent bg
  ctx.fillRect(0, 0, 256, 128);
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = 'black'; // Black text for visibility on light floor/bg
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1, 0.5, 1);
  return sprite;
}

// ===========================
// CULLING / OPTIMIZATION HELPERS
// ===========================

export function filterHiddenItems(items, bauDims) {
  // If few items, don't bother culling (overhead > gain)
  if (items.length < 50) return items;

  // 1. Build Spatial Grid (Optimized for performance)
  // We map block centers to existence.
  // Key: "x,y,z" (rounded)
  const grid = new Map();

  // Helper to key
  const getKey = (x, y, z) => `${Math.round(x * 10)},${Math.round(y * 10)},${Math.round(z * 10)}`;

  // Populate grid with ALL items
  items.forEach((item, idx) => {
    // Center point
    const cx = item.position[0];
    const cy = item.position[1];
    const cz = item.position[2];
    grid.set(getKey(cx, cy, cz), { item, idx });
  });

  const visibleItems = [];

  // 2. Check each item visibility
  for (const item of items) {
    const cx = item.position[0];
    const cy = item.position[1];
    const cz = item.position[2];

    const sx = item.scale[0] || item.userData?._size?.x || 1;
    const sy = item.scale[1] || item.userData?._size?.y || 1;
    const sz = item.scale[2] || item.userData?._size?.z || 1;

    // Check 6 Neighbors (using approximate grid lookups)
    // We check points slightly offset by the dimension.
    // NOTE: This assumes uniform packing.
    const right = grid.has(getKey(cx + sx, cy, cz));
    const left = grid.has(getKey(cx - sx, cy, cz));
    const up = grid.has(getKey(cx, cy + sy, cz));
    const down = grid.has(getKey(cx, cy - sy, cz)) || (cy - sy / 2 <= 0.05);
    const front = grid.has(getKey(cx, cy, cz + sz));
    const back = grid.has(getKey(cx, cy, cz - sz));

    // If completely surrounded (hidden on all 6 sides), don't render
    if (right && left && up && down && front && back) {
      continue;
    }
    visibleItems.push(item);
  }

  return visibleItems;
}

// ===========================
// SPATIAL HASHING (Fast Collision)
// ===========================

export class SpatialHash {
  constructor(cellSize = 0.5) { // 50cm cells
    this.cellSize = cellSize;
    this.map = new Map();
  }

  _getKey(x, y, z) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  insert(aabb, item) {
    const startX = Math.floor(aabb.min.x / this.cellSize);
    const endX = Math.floor(aabb.max.x / this.cellSize);
    const startY = Math.floor(aabb.min.y / this.cellSize);
    const endY = Math.floor(aabb.max.y / this.cellSize);
    const startZ = Math.floor(aabb.min.z / this.cellSize);
    const endZ = Math.floor(aabb.max.z / this.cellSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        for (let z = startZ; z <= endZ; z++) {
          const key = `${x},${y},${z}`;
          if (!this.map.has(key)) {
            this.map.set(key, new Set());
          }
          this.map.get(key).add(item);
        }
      }
    }
  }

  query(aabb) {
    const startX = Math.floor(aabb.min.x / this.cellSize);
    const endX = Math.floor(aabb.max.x / this.cellSize);
    const startY = Math.floor(aabb.min.y / this.cellSize);
    const endY = Math.floor(aabb.max.y / this.cellSize);
    const startZ = Math.floor(aabb.min.z / this.cellSize);
    const endZ = Math.floor(aabb.max.z / this.cellSize);

    const candidates = new Set();

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        for (let z = startZ; z <= endZ; z++) {
          const key = `${x},${y},${z}`;
          if (this.map.has(key)) {
            const items = this.map.get(key);
            for (const item of items) {
              candidates.add(item);
            }
          }
        }
      }
    }
    return candidates;
  }

  clear() {
    this.map.clear();
  }
}
