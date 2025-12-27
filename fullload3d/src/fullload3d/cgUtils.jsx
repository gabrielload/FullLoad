/**
 * Calculate Center of Gravity (CG)
 * @param {Array} items - List of placed items with { mesh, data: { peso } }
 * @param {Object} truckDimensions - { L, H, W }
 * @returns {Object} { x, z, totalWeight, isBalanced }
 */
export function calculateCenterOfGravity(items, truckDimensions) {
    let totalWeight = 0;
    let momentX = 0; // Moment regarding Length (X axis)
    let momentZ = 0; // Moment regarding Width (Z axis)

    for (const item of items) {
        // 1. Get Weight
        // Parse weight safely from metadata or data
        const rawWeight = item.data?.peso || item.data?.meta?.peso || item.mesh?.userData?._meta?.peso || 0;
        const weight = Number(rawWeight);

        if (weight > 0) {
            // 2. Get Position (Center of item)
            // mesh.position is usually center
            const pos = item.mesh.position;

            totalWeight += weight;
            momentX += weight * pos.x;
            momentZ += weight * pos.z;
        }
    }

    if (totalWeight === 0) {
        return { x: truckDimensions.L / 2, z: truckDimensions.W / 2, totalWeight: 0, isBalanced: true };
    }

    const cgX = momentX / totalWeight;
    const cgZ = momentZ / totalWeight;

    // Balance Check (Green Zone)
    // Simple heuristic: CG should be within middle 40% of Length and middle 40% of Width?
    // Usually strict on X (Length) for axles.
    const idealX = truckDimensions.L / 2;
    const idealZ = truckDimensions.W / 2;

    // Tolerance (e.g., +/- 10% of length/width)
    const toleranceX = truckDimensions.L * 0.15;
    const toleranceZ = truckDimensions.W * 0.20;

    const isBalancedX = Math.abs(cgX - idealX) <= toleranceX;
    const isBalancedZ = Math.abs(cgZ - idealZ) <= toleranceZ;

    return {
        x: cgX,
        z: cgZ,
        totalWeight,
        isBalanced: isBalancedX && isBalancedZ,
        deviation: {
            x: ((cgX - idealX) / truckDimensions.L) * 100, // % deviation
            z: ((cgZ - idealZ) / truckDimensions.W) * 100
        }
    };
}
