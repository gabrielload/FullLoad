import { cmToM, mToCm } from "./fullLoadUtils";

/*
  fullLoadOptimizer.js
  --------------------
  Implementation of "Regra de Ouro" (Golden Rule) for 3D Load Optimization.
  Strict adherence to optimization_rules_v2.json (Policy v1.0.0).
*/

// ==========================================
// 1. POLICY & RULES (v1.0.0)
// ==========================================

const POLICY = {
    global: {
        unit: "meters",
        tolerance: 0.001,
        gravity: 9.81
    },
    constraints: {
        maxStackHeight: 2.5,
        minSupportArea: 0.60, // 60%
        maxCoMOffset: 0.20,
        maxGap: 0.05
    },
    behavior: {
        rotations: [0, 90], // Simplified for now, can expand to 180, 270
        snapTolerance: 0.002
    },
    restrictions: {
        fragile: { maxStack: 0, topOnly: true }, // Simplified: no stack on fragile
        hazardous: { isolate: true, distance: 0.2 },
        perishable: { upright: true },
        liquid: { upright: true, floor: true }
    }
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

function isFragile(item) {
    const f = item.meta?.fragilidade || "none";
    return f === "medium" || f === "high" || f === "alta" || f === "media";
}

function isHazardous(item) {
    return !!item.meta?.perigoso;
}

function isLiquid(item) {
    return item.meta?.tipo === "liquido" || item.meta?.tipo === "tambor"; // Assumption
}

function canStack(itemAbove, itemBelow) {
    // Rule: Hazardous items cannot be stacked (above or below)
    if (isHazardous(itemAbove) || isHazardous(itemBelow)) return false;

    // Rule: Cannot stack ON TOP of fragile items
    if (isFragile(itemBelow)) return false;

    // Rule: Item above must be stackable
    if (itemAbove.meta?.empilhavel === false) return false;

    // Rule: Item below must support stacking
    if (itemBelow.meta?.empilhavel === false) return false;

    // Rule: Perishable no stack over (if strict)
    if (itemBelow.meta?.perecivel) return false;

    return true;
}

// ==========================================
// 3. CORE OPTIMIZER
// ==========================================

export async function optimize(currentItems, truckDims) {
    console.log("🚀 Starting Policy v1.0.0 Optimization...");

    // 1. Prepare Data & Normalize
    const truck = {
        w: truckDims.W, // Width (Z)
        h: truckDims.H, // Height (Y)
        l: truckDims.L, // Length (X)
        volume: truckDims.W * truckDims.H * truckDims.L
    };

    let itemsToPack = currentItems.map(item => {
        const meta = item.meta || item;
        // Dimensions in meters (prefer explicit sizeX/Y/Z from engine)
        const l = item.sizeX ? cmToM(item.sizeX) : (item.scale ? item.scale[0] : cmToM(meta.comprimento || meta.L || 50));
        const h = item.sizeY ? cmToM(item.sizeY) : (item.scale ? item.scale[1] : cmToM(meta.altura || meta.H || 50));
        const w = item.sizeZ ? cmToM(item.sizeZ) : (item.scale ? item.scale[2] : cmToM(meta.largura || meta.W || 50));

        return {
            id: item.id || item.colocId,
            w, h, l,
            originalDims: { l, h, w }, // Store original for mesh creation
            vol: w * h * l,
            weight: Number(meta.peso || 10), // Default 10kg
            meta: meta,
            original: item,
            placed: false,
            position: null,
            rotation: [0, 0, 0]
        };
    });

    // 1.1 Pre-validate items (Must fit in truck)
    const unplacedItems = [];
    itemsToPack = itemsToPack.filter(item => {
        if (item.l > truck.l || item.h > truck.h || item.w > truck.w) {
            console.warn(`Item ${item.id} too big for truck. Skipped.`);
            unplacedItems.push(item);
            return false;
        }
        return true;
    });

    // 2. Sort Items (Policy: Heaviest First, then Volume)
    itemsToPack.sort((a, b) => {
        // 1. Hazardous (Floor priority)
        if (isHazardous(a) && !isHazardous(b)) return -1;
        if (!isHazardous(a) && isHazardous(b)) return 1;

        // 2. Weight Descending
        if (b.weight !== a.weight) return b.weight - a.weight;

        // 3. Volume Descending
        return b.vol - a.vol;
    });

    // 3. Packing Algorithm (Bottom-Left-Back with Support Check)
    const placedItems = [];
    const PADDING = 0.00; // 0cm padding to ensure strict inside. User said "limit on walls".
    // If we use 0, we rely on strict inequality.

    for (const item of itemsToPack) {
        let bestPos = null;
        let minCost = Infinity;
        let bestRot = null;

        // Generate candidate positions
        // 1. Origin
        // 2. Top-Right-Front of every placed item
        const candidates = [{ x: 0, y: 0, z: 0 }];

        placedItems.forEach(p => {
            // Right of p (X axis)
            candidates.push({ x: p.position.x + p.l, y: p.position.y, z: p.position.z });
            // Top of p (Y axis)
            candidates.push({ x: p.position.x, y: p.position.y + p.h, z: p.position.z });
            // Front of p (Z axis)
            candidates.push({ x: p.position.x, y: p.position.y, z: p.position.z + p.w });
        });

        // Filter and Sort Candidates
        // Sort by Y (Floor first), then X (Back first), then Z (Left first)
        candidates.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 0.001) return a.y - b.y;
            if (Math.abs(a.x - b.x) > 0.001) return a.x - b.x;
            return a.z - b.z;
        });

        // Try Rotations
        // Use originalDims for rotation logic base
        const rotations = [
            { l: item.originalDims.l, h: item.originalDims.h, w: item.originalDims.w, rot: [0, 0, 0] },
            { l: item.originalDims.w, h: item.originalDims.h, w: item.originalDims.l, rot: [0, Math.PI / 2, 0] } // 90 deg Y
        ];
        // TODO: Add more rotations if allowed by item.meta.posicao

        for (const pos of candidates) {
            for (const rotConfig of rotations) {
                const dims = { l: rotConfig.l, h: rotConfig.h, w: rotConfig.w };

                // 1. Check Bounds (Strict - No Tolerance for going out)
                if (pos.x + dims.l > truck.l + 0.0001 ||
                    pos.y + dims.h > truck.h + 0.0001 ||
                    pos.z + dims.w > truck.w + 0.0001) continue;

                // 2. Check Collisions
                let collision = false;
                let supported = false;
                let onFloor = Math.abs(pos.y) < POLICY.global.tolerance;
                let supportArea = 0;
                const baseArea = dims.l * dims.w;

                for (const other of placedItems) {
                    // AABB Collision
                    if (
                        pos.x < other.position.x + other.l - POLICY.global.tolerance &&
                        pos.x + dims.l > other.position.x + POLICY.global.tolerance &&
                        pos.y < other.position.y + other.h - POLICY.global.tolerance &&
                        pos.y + dims.h > other.position.y + POLICY.global.tolerance &&
                        pos.z < other.position.z + other.w - POLICY.global.tolerance &&
                        pos.z + dims.w > other.position.z + POLICY.global.tolerance
                    ) {
                        collision = true;
                        break;
                    }

                    // Support Calculation
                    if (!onFloor) {
                        // Check if 'other' is directly below 'item' (within tolerance)
                        if (Math.abs((other.position.y + other.h) - pos.y) < POLICY.global.tolerance) {
                            // Check horizontal intersection
                            const ox = Math.max(pos.x, other.position.x);
                            const oy = Math.min(pos.x + dims.l, other.position.x + other.l);
                            const oz = Math.max(pos.z, other.position.z);
                            const ow = Math.min(pos.z + dims.w, other.position.z + other.w);

                            if (ox < oy && oz < ow) {
                                // Overlap exists
                                if (canStack(item, other)) {
                                    supportArea += (oy - ox) * (ow - oz);
                                }
                            }
                        }
                    }
                }

                if (collision) continue;

                // 3. Validate Support (Gravity)
                if (!onFloor) {
                    if (supportArea / baseArea < POLICY.constraints.minSupportArea) continue;
                }

                // 4. Advanced Restrictions
                // Liquid/Heavy on floor preference
                if (isLiquid(item) && !onFloor) continue; // Strict liquid rule

                // 5. Calculate Cost
                // Minimize: Y (low), X (back), Z (left)
                // Penalty for high CoM if heavy
                let cost = pos.y * 1000 + pos.x * 100 + pos.z;

                if (item.weight > 500 && pos.y > 0.1) cost += 10000; // Heavy items stay low
                if (isFragile(item) && pos.y < 1.0) cost += 500; // Fragile prefers top (heuristic)

                if (cost < minCost) {
                    minCost = cost;
                    bestPos = { ...pos };
                    bestRot = rotConfig;
                }
            }

            // Optimization: First valid fit on floor is usually good enough for heavy items
            if (bestPos && Math.abs(bestPos.y) < 0.001 && item.weight > 100) break;
        }

        if (bestPos) {
            item.placed = true;
            item.position = bestPos;
            // Update dimensions based on rotation (for packing logic)
            item.l = bestRot.l;
            item.h = bestRot.h;
            item.w = bestRot.w;
            item.rotation = bestRot.rot;

            placedItems.push(item);
        } else {
            unplacedItems.push(item);
        }
    }

    // 4. Return Result
    const result = {
        placed: placedItems.map(p => ({
            id: p.id,
            // Center position for Three.js
            // Note: p.l, p.h, p.w are the ROTATED dimensions (bounding box)
            // p.position is the corner
            position: [p.position.x + p.l / 2, p.position.y + p.h / 2, p.position.z + p.w / 2],
            rotation: p.rotation,
            // CRITICAL: Return ORIGINAL dimensions for mesh creation.
            // The rotation will handle the orientation.
            scale: [p.originalDims.l, p.originalDims.h, p.originalDims.w],
            meta: p.meta
        })),
        unplaced: unplacedItems,
        stats: {
            totalItems: itemsToPack.length + unplacedItems.length, // Correct count logic
            placedCount: placedItems.length,
            volumeUtilization: (placedItems.reduce((acc, i) => acc + i.vol, 0) / truck.volume) * 100
        }
    };

    console.log("✅ Policy v1.0.0 Optimization Complete", result.stats);
    return result;
}
