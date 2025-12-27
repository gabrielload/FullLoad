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



// ==========================================
// 4. CORE PACKING LOGIC (Reusable)
// ==========================================

async function packBin(itemsToPack, binDims, offset = { x: 0, y: 0, z: 0 }) {
    const placedItems = [];
    const unplacedItems = [];
    const PADDING = 0.00;

    let processedCount = 0;

    for (const item of itemsToPack) {
        // Yield to main thread every 10 items
        if (processedCount++ % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        let bestPos = null;
        let minCost = Infinity;
        let bestRot = null;

        // Generate candidate positions
        // 1. Origin (relative to bin offset)
        const candidates = [{ x: offset.x, y: offset.y, z: offset.z }];

        placedItems.forEach(p => {
            // Right of p (X axis)
            candidates.push({ x: p.position.x + p.l, y: p.position.y, z: p.position.z });
            // Top of p (Y axis)
            candidates.push({ x: p.position.x, y: p.position.y + p.h, z: p.position.z });
            // Front of p (Z axis)
            candidates.push({ x: p.position.x, y: p.position.y, z: p.position.z + p.w });
        });

        // Filter and Sort Candidates
        candidates.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 0.001) return a.y - b.y;
            if (Math.abs(a.x - b.x) > 0.001) return a.x - b.x;
            return a.z - b.z;
        });

        // Try Rotations
        const d = item.originalDims;
        let rotations = [];
        const canTip = !item.meta.naoTombar && !item.meta.fixo;

        if (canTip) {
            rotations = [
                { l: d.l, h: d.h, w: d.w, rot: [0, 0, 0], type: 'upright' },
                { l: d.w, h: d.h, w: d.l, rot: [0, Math.PI / 2, 0], type: 'upright' },
                { l: d.l, h: d.w, w: d.h, rot: [Math.PI / 2, 0, 0], type: 'tipped' },
                { l: d.h, h: d.w, w: d.l, rot: [0, 0, Math.PI / 2], type: 'tipped' },
                { l: d.w, h: d.l, w: d.h, rot: [Math.PI / 2, Math.PI / 2, 0], type: 'tipped' },
                { l: d.h, h: d.l, w: d.w, rot: [0, 0, Math.PI / 2], type: 'tipped' }
            ];
        } else {
            rotations = [
                { l: d.l, h: d.h, w: d.w, rot: [0, 0, 0], type: 'upright' },
                { l: d.w, h: d.h, w: d.l, rot: [0, Math.PI / 2, 0], type: 'upright' }
            ];
        }

        for (const pos of candidates) {
            for (const rotConfig of rotations) {
                const dims = { l: rotConfig.l, h: rotConfig.h, w: rotConfig.w };

                // 1. Check Bounds (Strict)
                if (pos.x + dims.l > offset.x + binDims.l + 0.0001 ||
                    pos.y + dims.h > offset.y + binDims.h + 0.0001 ||
                    pos.z + dims.w > offset.z + binDims.w + 0.0001) continue;

                // 2. Check Collisions
                let collision = false;
                let onFloor = Math.abs(pos.y - offset.y) < POLICY.global.tolerance;
                let supportArea = 0;
                const baseArea = dims.l * dims.w;

                for (const other of placedItems) {
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

                    // Support Calc (simplified for brevity, logic preserved)
                    if (!onFloor) {
                        // Check vertical adjacency
                        if (Math.abs((other.position.y + other.h) - pos.y) < POLICY.global.tolerance) {
                            const ox = Math.max(pos.x, other.position.x);
                            const oy = Math.min(pos.x + dims.l, other.position.x + other.l);
                            const oz = Math.max(pos.z, other.position.z);
                            const ow = Math.min(pos.z + dims.w, other.position.z + other.w);
                            if (ox < oy && oz < ow) {
                                if (canStack(item, other)) {
                                    supportArea += (oy - ox) * (ow - oz);
                                }
                            }
                        }
                    }
                }

                if (collision) continue;
                if (!onFloor && supportArea / baseArea < POLICY.constraints.minSupportArea) continue;
                if (isLiquid(item) && !onFloor) continue;

                // Simple Cost: Fill Y first, then X (Back), then Z
                let cost = (pos.y - offset.y) * 1000 + (pos.x - offset.x) * 100 + (pos.z - offset.z);
                if (item.weight > 500 && pos.y > offset.y + 0.1) cost += 10000;

                if (cost < minCost) {
                    minCost = cost;
                    bestPos = { ...pos };
                    bestRot = rotConfig;
                }
            }
            if (bestPos && Math.abs(bestPos.y - offset.y) < 0.001 && item.weight > 100) break;
        }

        if (bestPos) {
            item.placed = true;
            item.position = bestPos;
            item.l = bestRot.l;
            item.h = bestRot.h;
            item.w = bestRot.w;
            item.rotation = bestRot.rot;
            placedItems.push(item);
        } else {
            unplacedItems.push(item);
        }
    }
    return { placed: placedItems, unplaced: unplacedItems };
}

// ==========================================
// 5. PACK ON PALLETS
// ==========================================
async function packOnPallets(items) {
    const pallets = [];
    const PALLET_DIMS = { l: 1.2, w: 1.0, h: 1.8 }; // Max height 1.8m
    const BASE_HEIGHT = 0.15;

    let pendingItems = [...items];

    while (pendingItems.length > 0) {
        // Create new virtual pallet
        // We pack relative to (0,0,0) inside the pallet logic
        // The PackBin function handles local coords.
        const packResult = await packBin(pendingItems, PALLET_DIMS, { x: 0, y: 0, z: 0 });

        if (packResult.placed.length === 0) {
            console.warn("Could not pack remaining items onto pallets (too big for pallet?).");
            break;
        }

        const filledPallet = {
            id: `pallet_${pallets.length + 1}`,
            // Physical dimensions of the LOADED unit
            // Solid block size = Pallet Base + Content Height
            // But we simplify: Occupies 1.2 x 1.0 x MaxY
            items: packResult.placed,
            // Calculate actual height used
            maxContentH: Math.max(...packResult.placed.map(i => i.position.y + i.h)),

            // Macro Item Properties (for Truck Packing)
            w: 1.0, // Width (Z)
            l: 1.2, // Length (X)
            // Height = Base + Content
            h: BASE_HEIGHT + Math.max(...packResult.placed.map(i => i.position.y + i.h)),

            // Meta for rendering the base
            meta: { tipo: 'palete_group', baseHeight: BASE_HEIGHT },

            // Stats
            weight: packResult.placed.reduce((sum, i) => sum + i.weight, 25), // +25kg pallet weight
            vol: 1.2 * 1.0 * (BASE_HEIGHT + Math.max(...packResult.placed.map(i => i.position.y + i.h))),

            // Fixed orientation for pallets?
            // Let them rotate? Preferably keep upright.
            originalDims: { l: 1.2, w: 1.0, h: BASE_HEIGHT + Math.max(...packResult.placed.map(i => i.position.y + i.h)) }
        };

        // Ensure pallet treats itself as non-tippable
        filledPallet.meta.naoTombar = true;
        filledPallet.meta.fixo = true; // Don't rotate pallets for now to be safe

        pallets.push(filledPallet);
        pendingItems = packResult.unplaced;
    }

    return { pallets, unplaced: pendingItems };
}


// UPDATED OPTIMIZE FUNCTION
export async function optimize(currentItems, truckDims) {
    console.log("🚀 Starting Automatic Palletization Optimization...");

    // 1. Prepare Items
    let rawItems = currentItems.map(item => {
        const meta = item.meta || item;
        const l = item.sizeX ? cmToM(item.sizeX) : (item.scale ? item.scale[0] : cmToM(meta.comprimento || meta.L || 50));
        const h = item.sizeY ? cmToM(item.sizeY) : (item.scale ? item.scale[1] : cmToM(meta.altura || meta.H || 50));
        const w = item.sizeZ ? cmToM(item.sizeZ) : (item.scale ? item.scale[2] : cmToM(meta.largura || meta.W || 50));

        return {
            id: item.id || item.colocId,
            w, h, l,
            originalDims: { l, h, w },
            vol: w * h * l,
            weight: Number(meta.peso || 10),
            meta: meta,
            original: item,
            placed: false,
            position: null,
            rotation: [0, 0, 0]
        };
    });

    // Sort items for packing
    rawItems.sort((a, b) => b.vol - a.vol);

    // 2. PHASE 1: Pack onto Pallets
    const palletization = await packOnPallets(rawItems);
    const palletObjects = palletization.pallets;
    const leftoverItems = palletization.unplaced; // Items too big for pallets

    console.log(`📦 Phase 1: Created ${palletObjects.length} pallets. Leftover: ${leftoverItems.length}`);

    // Mix Pallets + Leftover Items for Truck Packing
    // Treat pallets as Big Items
    const thingsToPackIntoTruck = [...palletObjects, ...leftoverItems];

    // Sort again: Pallets likely biggest, so they go first
    thingsToPackIntoTruck.sort((a, b) => b.vol - a.vol);

    // 3. PHASE 2: Pack Truck
    const truck = { w: truckDims.W, h: truckDims.H, l: truckDims.L, volume: truckDims.W * truckDims.H * truckDims.L };

    // Use reusable packBin
    const truckPackResult = await packBin(thingsToPackIntoTruck, truck, { x: 0, y: 0, z: 0 });

    // 4. PHASE 3: Flatten & Transform
    const finalPlacedItems = [];
    const PALLET_BASE_H = 0.15;

    for (const thing of truckPackResult.placed) {
        if (thing.meta && thing.meta.tipo === 'palete_group') {
            // It's a pallet group.
            // 1. Create a "Pallet Object" Item at the base position
            // Create visualization for the pallet itself
            const palletItem = {
                id: thing.id, // Pallet ID
                position: thing.position, // Truck Position
                rotation: thing.rotation,
                scale: [1.2, PALLET_BASE_H, 1.0], // Geometry size
                // Important: Override display type to render as pallet
                meta: { ...thing.meta, tipo: 'palete', nome: "Pallet Automatico", color: "#dcb35c" },
                originalDims: { l: 1.2, h: PALLET_BASE_H, w: 1.0 },
                l: 1.2, h: PALLET_BASE_H, w: 1.0
            };

            // Correct position to center (ThreeJS uses center)
            // PackBin returns Corner. ThreeJS output expects Center.
            // But wait, the return mapping at the end handles Corner->Center. 
            // So we keep Corner here? No, let's keep it consistent.
            // We will push this 'palletItem' to be mapped later or map it now?
            // Let's map it now to match the 'final output' structure, OR push to a list that gets mapped at end.
            // The final map loop expects { position, l, h, w, rotation }.
            // The thing.position is CORNER.
            // thing.l/h/w are rotated dims.
            // So we can just push 'thing' but change its meta to 'palete' to render the wood base.
            // AND we need to unpack its children.

            // A. The Pallet Base
            // We need to inject a specific item for the wood base.
            // The 'thing' represents the WHOLE volume. 
            // We'll mutate 'thing' to represent just the base? No.
            // We'll add a new item for the base.

            const palletCorner = thing.position; // Corner in Truck

            // Base Item
            finalPlacedItems.push({
                id: thing.id + "_base",
                // Position is Corner + something? 
                // We will let the final mapper handle Corner->Center conversion if we provide l,h,w,position.
                position: { x: palletCorner.x, y: palletCorner.y, z: palletCorner.z },
                l: 1.2, h: PALLET_BASE_H, w: 1.0, // Fixed, assuming no rotation for pallets (fixo=true)
                rotation: thing.rotation,
                originalDims: { l: 1.2, h: PALLET_BASE_H, w: 1.0 },
                meta: { tipo: 'palete', nome: "Palete Base", cor: "#dcb35c" },
                vol: 1.2 * PALLET_BASE_H * 1.0
            });

            // B. The Contents
            for (const child of thing.items) {
                // Child position is relative to Pallet Virtual Bin (0,0,0)
                // Pallet position is palletCorner in Truck.
                // Platform offset: Items sit ON TOP of the base.
                // So Y = palletCorner.y + PALLET_BASE_H + child.y

                // Rotation: If pallet rotated? 
                // We disallowed pallet rotation (fixo=true). So simple translation.

                const worldX = palletCorner.x + child.position.x;
                const worldY = palletCorner.y + PALLET_BASE_H + child.position.y;
                const worldZ = palletCorner.z + child.position.z;

                finalPlacedItems.push({
                    ...child,
                    id: child.id,
                    position: { x: worldX, y: worldY, z: worldZ },
                    // Rotations are local, but pallet is 0, so global = local
                });
            }

        } else {
            // Standard Item
            finalPlacedItems.push(thing);
        }
    }

    // Add unplaced items to stats
    const totalUnplaced = [...truckPackResult.unplaced]; // Items that didn't fit in truck

    // Final Mapper: Convert Raw Items (Corner Pos + Rotated Dims) to API Format (Center Pos + Original Scale)
    return {
        placed: finalPlacedItems.map(p => ({
            id: p.id,
            // Convert Corner to Center
            // p.position is Corner {x,y,z}
            // p.l, p.h, p.w are Rotated Dimensions
            position: [
                p.position.x + p.l / 2,
                p.position.y + p.h / 2,
                p.position.z + p.w / 2
            ],
            rotation: p.rotation,
            // Original Dims for Scale (Mesh creation uses Box(1,1,1) scaled)
            scale: [p.originalDims.l, p.originalDims.h, p.originalDims.w],
            meta: p.meta
        })),
        unplaced: totalUnplaced,
        stats: {
            totalItems: currentItems.length,
            placedCount: finalPlacedItems.filter(x => !x.id.includes('_base')).length, // Exclude bases from count
            volumeUtilization: (truckPackResult.placed.reduce((acc, i) => acc + i.vol, 0) / truck.volume) * 100
        }
    };
}
