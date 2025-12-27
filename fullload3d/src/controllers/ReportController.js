import { getPlacedItems, generateStepSnapshots, getBauState } from "../fullload3d/fullLoadEngine";
import { generateStepReportBlob } from "../utils/reportGenerator";

/**
 * Orchestrates the "Step-by-Step" report generation.
 * 1. Slices the load into steps (by Stop or by Depth/Quantity).
 * 2. Calls 3D Engine to capture snapshots.
 * 3. Calls Report Generator to build PDF.
 * @param {Object} reportInfo - { documento, tipoCarga }
 * @param {Array} stops - List of stops (optional)
 */
export async function createFullStepReport(reportInfo, stops = []) {
    const items = getPlacedItems();
    const bau = getBauState();
    if (items.length === 0) throw new Error("Não há itens para gerar relatório.");

    let steps = [];

    // STRATEGY 1: IF STOPS EXIST, USE STOPS
    if (stops.length > 0) {
        // Sort Stops by Order logic (Reverse LIFO?): 
        // Stop 1 (Last delivery) is DEEP inside. 
        // Loading Order: Stop N (Rio) -> Stop 1 (SP). 
        // If LIFO: Stop 1 is loaded FIRST (Deepest). Stop N is loaded LAST (Door).
        // Report should follow LOADING order: Stop 1 -> Stop N.

        // Group items by stopId
        const groups = {};
        stops.forEach(s => groups[s.id] = { stop: s, items: [] });
        const noStopItems = [];

        items.forEach(item => {
            const sId = item.data.stopId;
            if (sId && groups[sId]) {
                groups[sId].items.push(item);
            } else {
                noStopItems.push(item);
            }
        });

        // Sort Groups by Stop Order (1, 2, 3...)
        // Assuming Stop 1 is DEEP (First Loaded).
        const sortedStops = [...stops].sort((a, b) => a.order - b.order);

        // Step 1: Stop 1
        sortedStops.forEach((stop, idx) => {
            const groupItems = groups[stop.id].items;
            if (groupItems.length > 0) {
                steps.push({
                    title: `Passo ${idx + 1}: Destino ${stop.name}`,
                    items: groupItems, // Metadata
                    itemIds: groupItems.map(i => i.data.id) // For visualization
                });
            }
        });

        // Add items without stops at end? Or beginning? Usually end (near door).
        if (noStopItems.length > 0) {
            steps.push({
                title: `Passo Final: Itens sem Destino`,
                items: noStopItems,
                itemIds: noStopItems.map(i => i.data.id)
            });
        }


        // STRATEGY 2: SMART DEPTH SLICING (CLUSTERING)
        // Group items into logical "Walls" or "Layers" based on Depth (Z)

        // 1. Sort by Z (Deep -> Door)
        // Note: In Three.js, usually -Z is forward, +Z is backward (door).
        // Let's assume lower Z is deeper (front of truck) and higher Z is door.
        const sortedItems = [...items].sort((a, b) => a.mesh.position.z - b.mesh.position.z);

        // 2. Cluster Logic
        const CLUSTER_THRESHOLD = 0.5; // 50cm gap triggers new step? 
        // Or maybe just fixed chunks of distance (e.g. every 1 meter)?
        // Let's try dynamic gap detection + max depth.

        let currentStepItems = [];
        let lastZ = sortedItems[0]?.mesh.position.z || 0;
        let stepCount = 0;

        sortedItems.forEach((item, index) => {
            const z = item.mesh.position.z;

            // Heuristic: If gap > 40cm OR current block depth > 1.5m
            // We start a new step.
            const distance = Math.abs(z - lastZ);

            // Check depth span of current step
            const stepStartZ = currentStepItems.length > 0 ? currentStepItems[0].mesh.position.z : z;
            const stepSpan = Math.abs(z - stepStartZ);

            // New Step Trigger
            if (currentStepItems.length > 0 && (distance > 0.4 || stepSpan > 1.5)) {
                stepCount++;
                steps.push({
                    title: `Passo ${stepCount}: Parede/Camada ${stepCount}`,
                    items: [...currentStepItems],
                    itemIds: currentStepItems.map(i => i.data.id),
                    // Metadata for engine focus
                    center: calculateStepCenter(currentStepItems)
                });
                currentStepItems = [];
            }

            currentStepItems.push(item);
            lastZ = z;
        });

        // Add final step
        if (currentStepItems.length > 0) {
            stepCount++;
            steps.push({
                title: `Passo ${stepCount}: ${stepCount === 1 ? "Carregamento Completo" : "Finalização (Porta)"}`,
                items: currentStepItems,
                itemIds: currentStepItems.map(i => i.data.id),
                center: calculateStepCenter(currentStepItems)
            });
        }
    }

    // Helper: Center calculation for Focus
    function calculateStepCenter(stepItems) {
        if (!stepItems.length) return null;
        let sumX = 0, sumY = 0, sumZ = 0;
        stepItems.forEach(i => {
            sumX += i.mesh.position.x;
            sumY += i.mesh.position.y;
            sumZ += i.mesh.position.z;
        });
        return { x: sumX / stepItems.length, y: sumY / stepItems.length, z: sumZ / stepItems.length };
    }

    // 2. CAPTURE SNAPSHOTS
    // We need to pass Accumulative visibility?
    // generateStepSnapshots handles this. But wait, does it expect explicit list or accumulative?
    // My engine implementation was: "step.itemIds.forEach ... visible=true".
    // This implies NON-accumulative if I only pass that step's IDs.
    // BUT the report wants to show "What's in the truck NOW".
    // So Step 2 should show Step 1 + Step 2 items.

    // Transform steps for Engine (Accumulative IDs)
    const engineSteps = [];
    let accumulatedIds = [];

    steps.forEach(step => {
        accumulatedIds = [...accumulatedIds, ...step.itemIds];
        engineSteps.push({ itemIds: accumulatedIds });
    });

    // Call Engine
    const snapshots = await generateStepSnapshots(engineSteps);

    // 3. GENERATE PDF
    const summary = {
        totalItems: items.length,
        totalWeight: items.reduce((acc, i) => acc + Number(i.peso || i.meta?.peso || 0), 0).toFixed(1)
    };

    // Attach images to steps
    steps.forEach((step, idx) => {
        step.image = snapshots[idx];
        // Format items for Report Generator
        step.items = step.items.map(i => ({
            nome: i.nome || i.meta?.nome || "Item",
            dims: `${((i.comprimento || i.meta?.comprimento || 0) * 100).toFixed(0)}x${((i.largura || i.meta?.largura || 0) * 100).toFixed(0)}x${((i.altura || i.meta?.altura || 0) * 100).toFixed(0)}`,
            weight: i.peso || i.meta?.peso || 0,
            stop: i.stopData?.name || "-"
        }));
    });

    return generateStepReportBlob(reportInfo, steps, summary);
}
