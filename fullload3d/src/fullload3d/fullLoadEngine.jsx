import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  cmToM,
  mToCm,
  createBoxMesh,
  createCylinderMesh,
  createTireMesh,
  makeAABBForSizeAt,
  aabbIntersect,
  aabbIsOnTop,
  clampInsideBau,
  snap,
  round2,
  tightPack,
  supportTopAt,
  computeStackY,
  createTextSprite,
  filterHiddenItems,
  SpatialHash
} from "./fullLoadUtils";
import { optimize } from "./fullLoadOptimizer";
import { InstancedRenderer } from "./instancedRenderer.jsx";

/*
  fullLoadEngine.js
  -----------------
  Core 3D logic for the truck loading visualization.
  Now includes "Tight Pack" and "Support Top" logic for professional packing.
*/

let scene, camera, renderer, controls;
let bauGroup = null;
let bauInnerBox = null; // { min, max } in meters
let ghost = null;
let raycaster = null;
let mouse = null;
let placed = new Map(); // id -> { mesh, data, aabb }
let rafId = null;
let running = false;
const INSTANCE_THRESHOLD = 200; // Automatic switch to InstancedMesh
let _engineAPI = null; // module-level pointer
let instancedRenderer = null; // High-Performance Renderer
let currentOperationId = 0; // Epoch for async tasks (abort validation)

// Undo/Redo Stacks
const historyStack = [];
const redoStack = [];
const MAX_HISTORY = 50;

function saveState() {
  const currentState = Array.from(placed.values()).map(p => ({
    id: p.data.id,
    position: { ...p.mesh.position },
    rotation: { ...p.mesh.rotation },
    scale: { ...p.mesh.scale },
    meta: { ...p.data.item }, // Clone item data
    colocId: p.data.id
  }));

  historyStack.push(currentState);
  if (historyStack.length > MAX_HISTORY) historyStack.shift();

  // Clear redo stack on new action
  redoStack.length = 0;

  // Notify UI
  dispatchHistoryEvent();
}

function restoreState(state) {
  // Clear current scene items
  Array.from(placed.values()).forEach(p => {
    scene.remove(p.mesh);
    if (p.mesh.geometry) p.mesh.geometry.dispose();
  });
  placed.clear();

  // Re-create items from state
  state.forEach(itemData => {
    // Re-use place logic but bypass saveState
    placeItemInternal(itemData.position, itemData.rotation, itemData.meta, itemData.colocId);
  });

  dispatchHistoryEvent();
}

function internalUndo() {
  if (historyStack.length === 0) return;

  // Save current state to redo
  const currentState = Array.from(placed.values()).map(p => ({
    id: p.data.id,
    position: { ...p.mesh.position },
    rotation: { ...p.mesh.rotation },
    scale: { ...p.mesh.scale },
    meta: { ...p.data.item },
    colocId: p.data.id
  }));
  redoStack.push(currentState);

  const prevState = historyStack.pop();
  restoreState(prevState);
}

function internalRedo() {
  if (redoStack.length === 0) return;

  // Save current state to history
  const currentState = Array.from(placed.values()).map(p => ({
    id: p.data.id,
    position: { ...p.mesh.position },
    rotation: { ...p.mesh.rotation },
    scale: { ...p.mesh.scale },
    meta: { ...p.data.item },
    colocId: p.data.id
  }));
  historyStack.push(currentState);

  const nextState = redoStack.pop();
  restoreState(nextState);
}

function dispatchHistoryEvent() {
  window.dispatchEvent(new CustomEvent("fullLoad_history", {
    detail: {
      canUndo: historyStack.length > 0,
      canRedo: redoStack.length > 0
    }
  }));
}

const ROTATION_STATES = [
  [0, 0, 0],
  [0, Math.PI / 2, 0],
  [Math.PI / 2, 0, 0],
  [Math.PI / 2, Math.PI / 2, 0],
  [0, 0, Math.PI / 2],
  [0, Math.PI / 2, Math.PI / 2]
];

export function initFullLoadEngine(container, initialBau = null) {
  // cleanup if re-init
  if (_engineAPI) {
    _engineAPI.destroy();
  }

  // 1. Scene & Camera
  scene = new THREE.Scene();
  // scene.background = new THREE.Color(0xffffff); // Removed to allow CSS gradient
  scene.background = null;

  // Initialize Instanced Renderer
  instancedRenderer = new InstancedRenderer(scene);
  instancedRenderer.init();

  // Isometric-ish camera setup
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(-3, 4, 5); // Default position, will be focused later

  // 2. Renderer - optimized for performance
  const rendererParams = {
    antialias: false, // Disabled for performance
    alpha: true,
    powerPreference: "high-performance" // Use high-performance GPU
  };
  const isCanvas = container.tagName === "CANVAS";
  if (isCanvas) {
    rendererParams.canvas = container;
  }

  renderer = new THREE.WebGLRenderer(rendererParams);
  renderer.setSize(container.clientWidth, container.clientHeight);
  // Limit pixel ratio for performance (max 2)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // Shadows disabled for massive performance improvement with many objects
  renderer.shadowMap.enabled = false;

  if (!isCanvas) {
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
  }

  // 3. Lights & Environment
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  // Ambient light for better visibility (replaces expensive shadows)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 10);
  // Shadows disabled for performance
  dirLight.castShadow = false;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 100;
  dirLight.shadow.bias = -0.0005;
  // Expand shadow camera
  const d = 20;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  // Fill light
  const fillLight = new THREE.DirectionalLight(0xffeedd, 0.8);
  fillLight.position.set(-10, 10, -10);
  scene.add(fillLight);

  // Ground Plane (Studio White)
  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02; // Slightly below truck floor
  ground.receiveShadow = true;
  scene.add(ground);

  // 4. Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // 5. Ghost object (for manual placement)
  ghost = new THREE.Group();
  scene.add(ghost);

  // 6. Raycaster
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // 7. Loop
  running = true;
  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    controls.update();

    // Ghost Pulsing Animation
    if (ghost && ghost.visible && ghost.userData.isValid && ghost.children[0]) {
      const mesh = ghost.children[0];
      // Pulse between 0.3 and 0.7
      const time = Date.now() * 0.005;
      mesh.material.opacity = 0.5 + Math.sin(time) * 0.2;
    }

    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  function onResize() {
    if (!renderer || !camera) return;
    const w = container.clientWidth || window.innerWidth; // fallback
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // Context loss handling
  function onContextLost(e) {
    e.preventDefault();
    console.warn("WebGL Context Lost");
    cancelAnimationFrame(rafId);
  }
  function onContextRestored() {
    console.log("WebGL Context Restored");
    initFullLoadEngine(container, initialBau); // Re-init?
  }
  renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);
  renderer.domElement.addEventListener("webglcontextrestored", onContextRestored, false);

  // ===============================
  // CORE FUNCTIONS
  // ===============================

  function getOthersAABBs() {
    return Array.from(placed.values()).map((p) => p.aabb);
  }

  // selection highlight utilities
  let selectedId = null;
  let hoveredId = null;

  function highlightSelect(mesh) {
    clearHighlight();
    if (!mesh || !mesh.material) return;
    selectedId = mesh.userData?.colocId || null;

    // Fix for Shared Materials: Clone material for highlight
    if (!mesh.userData._originalMat) {
      mesh.userData._originalMat = mesh.material;
      const newMat = mesh.material.clone();
      newMat.emissive.setHex(0x4444ff);
      mesh.material = newMat;
    }
  }

  function clearHighlight() {
    if (!selectedId) return;
    const entry = placed.get(selectedId);
    if (entry && entry.mesh) {
      const mesh = entry.mesh;
      if (mesh.userData._originalMat) {
        // Restore original shared material
        mesh.material.dispose(); // Dispose the clone
        mesh.material = mesh.userData._originalMat;
        delete mesh.userData._originalMat;
      }
    }
    selectedId = null;
  }

  // Grid Helper
  const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xdddddd);
  gridHelper.position.y = 0.002; // Just above floor
  gridHelper.visible = false; // Start hidden
  scene.add(gridHelper);

  // pointer interactions
  function onPointerMove(e) {
    try {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Ctrl Key = Select Mode
      const isSelectMode = e.ctrlKey;

      if (isSelectMode) {
        ghost.visible = false;
        // Proceed to hover detection
      } else {
        // Restore ghost if it has content
        if (ghost.children.length > 0) {
          ghost.visible = true;
        }
      }

      if (bauGroup && ghost.visible) {
        raycaster.setFromCamera(mouse, camera);
        const plane = bauGroup.getObjectByName("bau_ground_plane");

        if (plane) {
          const ints = raycaster.intersectObject(plane);
          if (ints.length) {
            const p = ints[0].point;
            const step = 0.01; // 1cm precision

            let gx = snap(p.x, step);
            let gz = snap(p.z, step);

            const ghostMesh = ghost.children[0];
            if (ghostMesh) {
              const rawSize = ghostMesh.userData._size;
              // ... existing ghost logic ...
              // Calculate effective size based on rotation using Box3
              const box = new THREE.Box3().setFromObject(ghostMesh);
              const sizeVec = new THREE.Vector3();
              box.getSize(sizeVec);
              const size = { x: sizeVec.x, y: sizeVec.y, z: sizeVec.z };

              // 0. Size Check (Must fit in truck)
              let result = null;
              if (size.x > bauInnerBox.max.x || size.y > bauInnerBox.max.y || size.z > bauInnerBox.max.z) {
                ghostMesh.material.color.setHex(0xff0000);
                ghostMesh.material.opacity = 0.8;
                ghost.userData.isValid = false;
                ghost.userData.error = "Item maior que o baú!";
                // Center it just to show it
                ghost.position.set(bauInnerBox.max.x / 2, size.y / 2, bauInnerBox.max.z / 2);
              } else {
                ghost.userData.error = null;

                const existingItems = Array.from(placed.values());

                // Helper to evaluate a position
                const evaluatePosition = (tx, tz) => {
                  // 2. Strict Clamp
                  const clamped = clampInsideBau({ x: tx, y: size.y / 2, z: tz }, size, bauInnerBox, 0.001);
                  const cx = clamped.x;
                  const cz = clamped.z;

                  // 3. Determine Y
                  const currentType = ghostMesh.userData._meta?.tipo || "caixa";
                  const validY = computeStackY(existingItems, bauInnerBox, cx, cz, size.x, size.y, size.z, currentType);

                  // 4. Overlap Check
                  const isOverlapping = checkOverlap({ x: cx, y: validY !== null ? validY : size.y / 2, z: cz }, size, existingItems);

                  return { x: cx, y: validY, z: cz, isOverlapping, validY };
                };

                // --- PRIMARY ATTEMPT ---
                // 1. Tight Pack (Magnetic Snap)
                const packed = tightPack(gx, gz, size.x, size.z, bauInnerBox.max.x, bauInnerBox.max.z, existingItems);
                // Evaluate Primary
                result = evaluatePosition(packed.x, packed.z);

                // --- JUMP MECHANISM ENHANCED ---
                if (result.isOverlapping) {
                  const jumpMargin = 0.05; // 5cm clearance
                  const directions = [
                    { x: 1, z: 0 },   // Right
                    { x: -1, z: 0 },  // Left
                    { x: 0, z: 1 },   // Back
                    { x: 0, z: -1 }   // Front
                  ];

                  let foundJump = null;

                  outerLoop:
                  for (let mult = 1; mult <= 3; mult++) {
                    for (const dir of directions) {
                      const jx = result.x + (dir.x * (size.x + jumpMargin) * mult);
                      const jz = result.z + (dir.z * (size.z + jumpMargin) * mult);

                      const jumpResult = evaluatePosition(jx, jz);

                      if (!jumpResult.isOverlapping && jumpResult.validY !== null) {
                        const distTarget = Math.sqrt(Math.pow(jumpResult.x - jx, 2) + Math.pow(jumpResult.z - jz, 2));
                        if (distTarget < 0.1) {
                          foundJump = jumpResult;
                          break outerLoop;
                        }
                      }
                    }
                  }

                  if (foundJump) {
                    result = foundJump;
                  }
                }

                let gy;
                const edges = ghostMesh.userData._edges;

                if (result.validY !== null && !result.isOverlapping) {
                  gy = result.validY;
                  const colorHex = ghostMesh.userData._meta?.cor ? ghostMesh.userData._meta.cor : (ghostMesh.userData._meta?.color || "#0000aa");
                  ghostMesh.material.color.set(colorHex);

                  if (edges) {
                    edges.material.color.setHex(0xf97316); // Brand Orange for valid identity
                    edges.material.opacity = 1.0;
                  }

                  ghost.userData.isValid = true;
                } else {
                  gy = result.validY !== null ? result.validY : size.y / 2;
                  ghostMesh.material.color.setHex(0xff0000);
                  ghostMesh.material.opacity = 0.8; // Solid red for error

                  if (edges) {
                    edges.material.color.setHex(0xff0000); // Red edges for invalid
                    edges.material.opacity = 1.0;
                  }

                  ghost.userData.isValid = false;
                  ghost.userData.error = "Posição inválida (Colisão ou fora do baú)";
                }

                // Final position update
                if (result)
                  ghost.position.set(result.x, gy, result.z);
              }
            }
          }
        }
      }

      // --- HOVER DETECTION ---
      // IMPORTANT: Run this even if ghost is hidden (Select Mode)
      raycaster.setFromCamera(mouse, camera); // Ensure raycaster is updated for hover check
      const placedMeshes = Array.from(placed.values()).map(p => p.mesh);
      const intersects = raycaster.intersectObjects(placedMeshes, false);

      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const id = mesh.userData.colocId;
        if (id !== hoveredId) {
          hoveredId = id;

          // Visual Feedback for Hover in Select Mode
          if (isSelectMode) {
            highlightSelect(mesh); // Reuse highlight logic for preview
            // Note: highlightSelect sets selectedId, which might be overkill, 
            // but it gives visual feedback. 
            // Ideally we should have a temporary 'hover' highlight.
            // For now, let's just highlight it.
          }
        }
      } else {
        hoveredId = null;
        if (isSelectMode && !selectedId) {
          clearHighlight();
        }
      }

    } catch (err) {
      console.error("onPointerMove error:", err);
    }
  }
  renderer.domElement.addEventListener("pointermove", onPointerMove);

  function placeItemAt(position, rotation, meta) {
    saveState(); // Save before placing
    placeItemInternal(position, rotation, meta);
  }

  function createPalletMesh({ width, height, depth, color }) {
    // Pallet Group
    const group = new THREE.Group();

    const WOOD_COLOR = 0xdcb35c;
    const material = new THREE.MeshStandardMaterial({
      color: WOOD_COLOR,
      roughness: 0.9,
      metalness: 0.1
    });

    // 1. Top Deck (Solid for physics simplicity, but visually distinct)
    const deckH = height * 0.3; // 30% thickness
    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(width, deckH, depth), material);
    topDeck.position.y = (height / 2) - (deckH / 2);
    topDeck.castShadow = true;
    topDeck.receiveShadow = true;
    group.add(topDeck);

    // 2. Middle Blocks (3 blocks)
    const blockW = width * 0.15;
    const blockH = height * 0.4;
    const blockD = depth; // Full depth runners
    const blockGeo = new THREE.BoxGeometry(blockW, blockH, blockD);

    // Left
    const leftBlock = new THREE.Mesh(blockGeo, material);
    leftBlock.position.set(-(width / 2) + (blockW / 2), 0, 0);
    group.add(leftBlock);

    // Center
    const centerBlock = new THREE.Mesh(blockGeo, material);
    centerBlock.position.set(0, 0, 0);
    group.add(centerBlock);

    // Right
    const rightBlock = new THREE.Mesh(blockGeo, material);
    rightBlock.position.set((width / 2) - (blockW / 2), 0, 0);
    group.add(rightBlock);

    // 3. Bottom Deck (3 planks matching blocks)
    const botH = height * 0.3;
    const plankGeo = new THREE.BoxGeometry(blockW, botH, depth);

    const leftPlank = new THREE.Mesh(plankGeo, material);
    leftPlank.position.set(-(width / 2) + (blockW / 2), -(height / 2) + (botH / 2), 0);
    group.add(leftPlank);

    const centerPlank = new THREE.Mesh(plankGeo, material);
    centerPlank.position.set(0, -(height / 2) + (botH / 2), 0);
    group.add(centerPlank);

    const rightPlank = new THREE.Mesh(plankGeo, material);
    rightPlank.position.set((width / 2) - (blockW / 2), -(height / 2) + (botH / 2), 0);
    group.add(rightPlank);

    // Add invisible fill box for simplified raycasting/physics if needed? 
    // No, Box3FromObject handles the group fine.

    return group;
  }

  function placeItemInternal(position, rotation, meta, existingId = null, overrideSize = null) {
    const colocId = existingId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random()}`);
    const currentType = meta.tipo || "caixa";
    // Use overrideSize if provided, otherwise fallback to ghost (legacy behavior)
    const size = overrideSize || (ghost && ghost.children[0] ? ghost.children[0].userData._size : { x: 1, y: 1, z: 1 });

    if (!size) {
      console.error("placeItemInternal: Size not defined!");
      return null;
    }

    // Determine Color (Priority: Stop Color > Item Color > Default)
    const color = meta.stopData?.color || meta.cor || (currentType === "pneu" ? "#111" : "#ff7a18");

    let mesh;
    if (currentType === "cilindrico") {
      mesh = createCylinderMesh({ diameter: size.x, height: size.y, color: color });
    } else if (currentType === "pneu") {
      const radius = size.y / 2;
      const width = size.x;
      mesh = createTireMesh({ radius, width, color: color });
    } else if (currentType === "palete") {
      mesh = createPalletMesh({ width: size.x, height: size.y, depth: size.z, color: color });
    } else {
      mesh = createBoxMesh([size.x, size.y, size.z], color);
    }

    mesh.userData._size = size;
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    mesh.userData.colocId = colocId;
    mesh.userData.meta = meta;

    // HARD BLOCK: Strict Boundary Check
    // Calculate AABB *before* adding to scene
    const box = new THREE.Box3().setFromObject(mesh);

    if (bauInnerBox) {
      // Tolerance of 0.001 (1mm) to avoid floating point issues, but strictly enforce "inside"
      const tolerance = 0.001;
      if (box.min.x < bauInnerBox.min.x - tolerance ||
        box.min.y < bauInnerBox.min.y - tolerance ||
        box.min.z < bauInnerBox.min.z - tolerance ||
        box.max.x > bauInnerBox.max.x + tolerance ||
        box.max.y > bauInnerBox.max.y + tolerance ||
        box.max.z > bauInnerBox.max.z + tolerance) {

        console.error("HARD BLOCK: Item rejected by engine (outside bounds)", {
          item: meta.nome,
          box: { min: box.min, max: box.max },
          truck: bauInnerBox
        });

        // Dispose and return null
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
        return null;
      }
    }

    scene.add(mesh);

    const aabb = { min: box.min, max: box.max };
    const entry = { mesh, data: meta, aabb };
    placed.set(colocId, entry);

    window.dispatchEvent(new CustomEvent("fullLoad_updated")); // Notify update
    return entry;
  }

  function removeItem(colocId) {
    if (!placed.has(colocId)) return;
    saveState(); // Save before removing
    const entry = placed.get(colocId);
    scene.remove(entry.mesh);
    if (entry.mesh.geometry) entry.mesh.geometry.dispose();
    placed.delete(colocId);
    window.dispatchEvent(new CustomEvent("fullLoad_updated"));
    window.dispatchEvent(new CustomEvent("fullLoad_itemDeselected"));
  }

  function clearScene(clearHistory = true) {
    // 1. Invalidate any running async operations
    currentOperationId++;
    const opId = currentOperationId;

    if (clearHistory) {
      saveState(); // Save BEFORE clearing only if requested
    }

    // 2. Clear visual meshes
    Array.from(placed.values()).forEach((p) => {
      if (p.mesh && p.mesh.parent === scene) {
        scene.remove(p.mesh);
      }
      if (p.mesh && p.mesh.geometry) p.mesh.geometry.dispose();
    });

    // 3. Clear Instanced Renderer
    if (instancedRenderer) {
      instancedRenderer.update([]); // Empty the buffer
    }

    // 4. Reset Data
    placed.clear();

    // 5. Force UI Update immediately
    // Use setTimeout to ensure React processes this event separately from the click
    setTimeout(() => {
      // Double check opId to ensure no race condition reverted this
      if (currentOperationId === opId) {
        window.dispatchEvent(new CustomEvent("fullLoad_updated"));
        window.dispatchEvent(new CustomEvent("fullLoad_itemDeselected"));
      }
    }, 0);
  }

  function onClick(e) {
    if (e.ctrlKey) return; // Prevent placement if selecting
    if (!ghost.visible) return;

    if (!ghost.userData.isValid) {
      if (ghost.userData.error) {
        // Dispatch error to UI
        window.dispatchEvent(new CustomEvent("fullLoad_error", { detail: { message: ghost.userData.error } }));
      }
      return;
    }

    const ghostMesh = ghost.children[0];
    if (!ghostMesh) return;
    const meta = ghostMesh.userData._meta;
    const size = ghostMesh.userData._size;

    // Shift + Click: Horizontal Fill (Side-by-side) - WAS VERTICAL
    if (e.shiftKey) {
      let currentZ = ghost.position.z;

      // Place first item
      placeItemAt(ghost.position, ghostMesh.rotation, meta);

      // Stack sideways (Z axis)
      while (true) {
        currentZ += size.z;
        if (currentZ + size.z / 2 > bauInnerBox.max.z) break;

        const newPos = new THREE.Vector3(ghost.position.x, ghost.position.y, currentZ);
        const existingItems = Array.from(placed.values());
        if (checkOverlap(newPos, size, existingItems)) break;

        placeItemAt(newPos, ghostMesh.rotation, meta);
      }
      console.log("Horizontal fill complete");
    }
    // Alt + Click: Vertical Fill (Stacking) - WAS HORIZONTAL
    else if (e.altKey) {
      let currentY = ghost.position.y;

      // Place first item
      placeItemAt(ghost.position, ghostMesh.rotation, meta);

      // Stack upwards until ceiling
      while (true) {
        currentY += size.y;
        if (currentY + size.y / 2 > bauInnerBox.max.y) break;

        const newPos = new THREE.Vector3(ghost.position.x, currentY, ghost.position.z);
        // Check overlap
        const existingItems = Array.from(placed.values());
        if (checkOverlap(newPos, size, existingItems)) break;

        placeItemAt(newPos, ghostMesh.rotation, meta);
      }
      console.log("Vertical fill complete");
    }
    // Single Click: Place Item (Moved from Double Click)
    else {
      placeItemAt(ghost.position, ghostMesh.rotation, meta);

      const lastId = Array.from(placed.keys()).pop();
      const entry = placed.get(lastId);
      if (entry) {
        highlightSelect(entry.mesh);
        window.dispatchEvent(new CustomEvent("fullLoad_itemSelected", {
          detail: { item: meta, id: lastId }
        }));
      }
    }
  }
  renderer.domElement.addEventListener("click", onClick);

  // Removed onDblClick as it is no longer needed for placement
  // function onDblClick(e) { ... }
  // renderer.domElement.addEventListener("dblclick", onDblClick);

  function onPointerDown(e) {
    // Only handle left click
    if (e.button !== 0) return;

    // Calculate mouse position
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Get all placed meshes
    const placedMeshes = Array.from(placed.values()).map(p => p.mesh);
    const intersects = raycaster.intersectObjects(placedMeshes, false);

    if (intersects.length > 0) {
      // Clicked on an item
      const mesh = intersects[0].object;
      highlightSelect(mesh);

      const entry = placed.get(mesh.userData.colocId);
      if (entry) {
        window.dispatchEvent(new CustomEvent("fullLoad_itemSelected", {
          detail: {
            item: entry.data,
            id: entry.mesh.userData.colocId
          }
        }));
      }
    } else {
      // Clicked on empty space (or floor)
      clearHighlight();
      window.dispatchEvent(new CustomEvent("fullLoad_itemDeselected"));
    }
  }
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  // Helper: Check if item overlaps with others
  function checkOverlap(pos, size, existingItems) {
    const myAABB = makeAABBForSizeAt(size, pos);
    // Shrink slightly to avoid touching-is-overlapping
    const epsilon = 0.005;
    myAABB.min.x += epsilon; myAABB.min.y += epsilon; myAABB.min.z += epsilon;
    myAABB.max.x -= epsilon; myAABB.max.y -= epsilon; myAABB.max.z -= epsilon;

    for (const item of existingItems) {
      // Use aabbIntersect helper instead of intersectsBox
      if (aabbIntersect(myAABB, item.aabb)) {
        return true;
      }
    }
    return false;
  }

  // keyboard shortcuts
  function onKeyDown(e) {
    // ESC: Cancel Ghost (Exit placement mode)
    if (e.key === "Escape") {
      if (ghost.visible) {
        setGhostMeta(null); // Hide ghost
        console.log("👻 Modo de colocação cancelado");
      }
      return;
    }

    // G: Grid
    if (e.key === "g" || e.key === "G") {
      gridHelper.visible = !gridHelper.visible;
    }

    // Space: Change View
    if (e.key === " ") {
      e.preventDefault();
      // Cycle views: Iso -> Top -> Side -> Back -> Iso
      let v = camera.userData.viewIndex || 0;
      v = (v + 1) % 4;
      camera.userData.viewIndex = v;
      const views = ["iso", "top", "side", "back"];
      setView(views[v]);
    }

    // R: Rotate Ghost OR Selected
    if (e.key === "r" || e.key === "R") {
      if (ghost.visible && ghost.children[0]) {
        const mesh = ghost.children[0];
        const meta = mesh.userData._meta || {};

        // Check mandatory orientation
        if (meta.posicao && meta.posicao !== "livre") {
          console.warn("Rotação bloqueada pela posição obrigatória:", meta.posicao);
          return; // Prevent rotation
        }

        const currentIdx = mesh.userData._rotIndex || 0;
        const nextIdx = (currentIdx + 1) % ROTATION_STATES.length;
        const r = ROTATION_STATES[nextIdx];
        mesh.rotation.set(r[0], r[1], r[2]);
        mesh.userData._rotIndex = nextIdx;
      } else if (selectedId) {
        // Rotate Selected Item
        const entry = placed.get(selectedId);
        if (entry) {
          const mesh = entry.mesh;
          const meta = entry.data.meta || entry.data;
          if (meta.posicao && meta.posicao !== "livre") {
            console.warn("Rotação bloqueada pela posição obrigatória:", meta.posicao);
            return;
          }

          mesh.rotation.y += Math.PI / 2;

          // Update AABB and Size
          const box = new THREE.Box3().setFromObject(mesh);
          const sizeVec = new THREE.Vector3();
          box.getSize(sizeVec);
          mesh.userData._size = { x: sizeVec.x, y: sizeVec.y, z: sizeVec.z };

          // Check collision
          const newAABB = makeAABBForSizeAt(mesh.userData._size, mesh.position);
          const others = Array.from(placed.values()).filter(p => p !== entry);
          if (wouldCollide(newAABB, others) || !isInsideBau(newAABB)) {
            // Revert
            mesh.rotation.y -= Math.PI / 2;
            const box2 = new THREE.Box3().setFromObject(mesh);
            const sizeVec2 = new THREE.Vector3();
            box2.getSize(sizeVec2);
            mesh.userData._size = { x: sizeVec2.x, y: sizeVec2.y, z: sizeVec2.z };
            console.warn("🚫 Rotação bloqueada: Colisão ou fora do baú.");
          } else {
            entry.aabb = newAABB;
            entry.data.rotation = [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z];
          }
        }
      }
    }

    // V: Stack Vertical (Duplicate selected on top)
    if (e.key === "v" || e.key === "V") {
      if (selectedId) {
        const entry = placed.get(selectedId);
        if (entry) {
          const meta = entry.data.meta || entry.data;
          setGhostMeta(meta);
          // Position on top
          const topY = entry.aabb.max.y + entry.mesh.userData._size.y / 2;
          ghost.position.set(entry.mesh.position.x, topY, entry.mesh.position.z);
          // Copy rotation
          ghost.children[0].rotation.copy(entry.mesh.rotation);
        }
      }
    }

    // H: Stack Horizontal (Duplicate selected on side)
    if (e.key === "h" || e.key === "H") {
      if (selectedId) {
        const entry = placed.get(selectedId);
        if (entry) {
          const meta = entry.data.meta || entry.data;
          setGhostMeta(meta);
          // Position on side (try X first)
          const sideX = entry.aabb.max.x + entry.mesh.userData._size.x / 2;
          ghost.position.set(sideX, entry.mesh.position.y, entry.mesh.position.z);
          // Copy rotation
          ghost.children[0].rotation.copy(entry.mesh.rotation);
        }
      }
    }

    // Delete
    if (e.key === "Delete" || e.key === "Backspace") {
      if (hoveredId) {
        window.dispatchEvent(new CustomEvent("fullLoad_remove", { detail: { colocId: hoveredId } }));
        hoveredId = null; // Clear hover after delete
      } else if (selectedId) {
        window.dispatchEvent(new CustomEvent("fullLoad_remove", { detail: { colocId: selectedId } }));
      }
    }

    // Arrow Keys: Move Selected
    if (selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const entry = placed.get(selectedId);
      if (entry) {
        const step = 0.01; // 1cm
        const oldPos = entry.mesh.position.clone();

        if (e.key === "ArrowUp") entry.mesh.position.z -= step;
        if (e.key === "ArrowDown") entry.mesh.position.z += step;
        if (e.key === "ArrowLeft") entry.mesh.position.x -= step;
        if (e.key === "ArrowRight") entry.mesh.position.x += step;

        // Update AABB
        const newAABB = makeAABBForSizeAt(entry.mesh.userData._size, entry.mesh.position);

        // Check overlap
        const others = Array.from(placed.values()).filter(p => p !== entry);
        const isOverlapping = checkOverlap(entry.mesh.position, entry.mesh.userData._size, others);

        if (isOverlapping) {
          // Revert
          entry.mesh.position.copy(oldPos);
        } else {
          entry.aabb = newAABB;
        }
      }
    }

    // PageUp/Down: Ghost Height
    if (ghost.visible && (e.key === "PageUp" || e.key === "PageDown")) {
      e.preventDefault();
      const ghostMesh = ghost.children[0];
      if (!ghostMesh) return;

      const h = ghostMesh.userData._size.y;
      let step = 0.01;
      if (e.shiftKey) step = h;

      if (e.key === "PageUp") ghost.position.y += step;
      if (e.key === "PageDown") ghost.position.y -= step;

      if (ghost.position.y < h / 2) ghost.position.y = h / 2;
    }
  }
  window.addEventListener("keydown", onKeyDown);

  function setView(view) {
    if (!bauInnerBox || !camera || !controls) return;

    // bauInnerBox.max contains {x: L, y: H, z: W}
    const L = bauInnerBox.max.x;
    const H = bauInnerBox.max.y;
    const W = bauInnerBox.max.z;

    const center = new THREE.Vector3(L / 2, H / 2, W / 2);

    if (view === "iso") {
      focusCamera(); // Use smart focus for ISO
    } else {
      // Standard views
      controls.target.copy(center);
      const maxDim = Math.max(L, H, W);
      const dist = maxDim * 1.5;

      if (view === "top") camera.position.set(center.x, center.y + dist, center.z); // Top-down
      else if (view === "side") camera.position.set(center.x, center.y, center.z + dist); // Side (Z+)
      else if (view === "back") camera.position.set(center.x + dist, center.y, center.z); // Back? Actually X+ is usually back or front depending on axis.
      // Truck: X=0 is Peito (Front), X=L is Fundo (Back).
      // So Back view should be looking at Fundo? Or looking FROM back?
      // Usually "Back View" means looking AT the back of the truck.
      // If Fundo is at X=L, we should be at X = L + dist.

      camera.lookAt(controls.target);
      controls.update();
    }
  }

  // window events: placeManual
  function onPlaceManual(e) {
    const d = e.detail || {};
    if (d.mercadoria) {
      setGhostMeta(d.mercadoria);
      // try { alert("Mova o fantasma com o mouse e clique para colocar."); } catch { }
    }
  }
  window.addEventListener("fullLoad_placeManual", onPlaceManual);

  // also respond to "fullLoad_remove"
  window.addEventListener("fullLoad_remove", (e) => {
    const { colocId } = e.detail || {};
    if (!colocId) return;
    const entry = placed.get(colocId);
    if (entry) {
      try { scene.remove(entry.mesh); } catch { }
      placed.delete(colocId);
    }
    if (selectedId === colocId) selectedId = null;
    window.dispatchEvent(new CustomEvent("fullLoad_updated"));
  });

  // ---------------------------
  // HELPERS: normalize tamanhoBau and force largest->L, mid->W, small->H
  // ---------------------------
  function normalizeAndOrderBau(tbRaw = {}) {
    // Accept both shapes:
    // - { L, W, H }  (as cm)
    // - { comprimento, largura, altura } (as cm)
    // If some fields missing, fallback to zeros.
    const a = Number(tbRaw.L ?? tbRaw.comprimento ?? tbRaw.length ?? 0);
    const b = Number(tbRaw.W ?? tbRaw.largura ?? tbRaw.width ?? 0);
    const c = Number(tbRaw.H ?? tbRaw.altura ?? tbRaw.height ?? 0);

    // make array and sort descending -> ensure largest becomes comprimento (L)
    const sorted = [a || 0, b || 0, c || 0].map(Number).sort((x, y) => y - x);

    // If all zeros fallback to a default small bau (100cm x 100cm x 100cm)
    if (sorted.every((v) => !v || isNaN(v))) {
      return { L: 100, W: 100, H: 100 };
    }

    // map: largest -> L, middle -> W, smallest -> H
    return {
      L: sorted[0] || 0,
      W: sorted[1] || 0,
      H: sorted[2] || 0,
    };
  }

  // API: setBau(truck)
  function setBau(truck) {
    // remove old bau
    const existingGroup = scene.getObjectByName("bau_group");
    if (existingGroup) {
      try { scene.remove(existingGroup); } catch { }
    }
    if (bauGroup) {
      try { scene.remove(bauGroup); } catch { }
      bauGroup = null;
      bauInnerBox = null;
    }
    if (!truck) return;

    // truck.tamanhoBau may be an object with cm values either as { L,W,H } or { comprimento, largura, altura }
    const tbRaw = truck.tamanhoBau || truck;
    const orderedCm = normalizeAndOrderBau(tbRaw);
    console.log("🚚 setBau: Raw", tbRaw, "Normalized (cm)", orderedCm);

    // convert to meters
    const L = cmToM(orderedCm.L);
    const W = cmToM(orderedCm.W);
    const H = cmToM(orderedCm.H);
    console.log("🚚 setBau: Derived (m)", { L, W, H });

    // build group
    bauGroup = new THREE.Group();
    bauGroup.name = "bau_group";

    // -- Visuals: Floor & Walls --

    // 1. Floor (Solid)
    const floorGeo = new THREE.BoxGeometry(L, 0.05, W);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.8,
      metalness: 0.2
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(L / 2, -0.025, W / 2); // Just below y=0
    floorMesh.receiveShadow = true;
    bauGroup.add(floorMesh);

    // 2. Walls (Glassmorphism)
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.2, // Glass-like transmission
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    // Front Wall (at x=0) - The "Cab" end (Peito)
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(0.05, H, W), wallMat);
    frontWall.position.set(-0.025, H / 2, W / 2); // At x=0
    bauGroup.add(frontWall);

    // Side Walls (at z=0 and z=W)
    const sideWall1 = new THREE.Mesh(new THREE.BoxGeometry(L, H, 0.05), wallMat);
    sideWall1.position.set(L / 2, H / 2, -0.025);
    bauGroup.add(sideWall1);

    const sideWall2 = new THREE.Mesh(new THREE.BoxGeometry(L, H, 0.05), wallMat);
    sideWall2.position.set(L / 2, H / 2, W + 0.025);
    bauGroup.add(sideWall2);

    // Edges (Dark Grey) - Keep for definition
    const innerGeo = new THREE.BoxGeometry(L, H, W); // Re-define innerGeo for edges
    const edges = new THREE.EdgesGeometry(innerGeo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333 }));
    line.position.set(L / 2, H / 2, W / 2);
    bauGroup.add(line);

    // invisible plane for raycasting (name important)
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshBasicMaterial({ visible: false }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(L / 2, 0.001, W / 2);
    plane.name = "bau_ground_plane";
    bauGroup.add(plane);

    // add group and set bauInnerBox coords
    bauGroup.position.set(0, 0, 0);
    // Label "Peito" (Front/Cab) at x=0
    const label = createTextSprite("Peito");
    label.position.set(0.1, H / 2, W / 2);
    bauGroup.add(label);

    // Label "Fundo" (Back/Door) at x=L
    const labelPeito = createTextSprite("Fundo");
    labelPeito.position.set(L - 0.1, H / 2, W / 2);
    bauGroup.add(labelPeito);

    // --- LOGO ---
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/logo.png', (texture) => {
      const logoMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.8 });
      const logo = new THREE.Sprite(logoMat);
      logo.scale.set(1, 1, 1);
      logo.position.set(L / 2, 0.05, W / 2);

      const planeGeo = new THREE.PlaneGeometry(1.5, 1.5);
      const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
      const logoPlane = new THREE.Mesh(planeGeo, planeMat);
      logoPlane.rotation.x = -Math.PI / 2;
      logoPlane.position.set(L / 2, 0.03, W / 2);
      if (bauGroup) bauGroup.add(logoPlane);
    });

    scene.add(bauGroup);

    bauInnerBox = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: L, y: H, z: W },
    };

    console.log("🚚 setBau: Finished. Scheduling focusCamera.");

    // Call immediately AND with timeout to be safe
    focusCamera();
    setTimeout(focusCamera, 100);
  }

  function focusCamera() {
    console.log("🎥 focusCamera: Triggered");
    if (!bauInnerBox || !camera || !controls) {
      console.warn("🎥 focusCamera: Missing dependencies", { bauInnerBox, camera: !!camera, controls: !!controls });
      return;
    }

    const L = bauInnerBox.max.x;
    const H = bauInnerBox.max.y;
    const W = bauInnerBox.max.z;

    // Center of the truck
    const center = new THREE.Vector3(L / 2, H / 2, W / 2);

    // Bounding Box Dimensions
    const maxDim = Math.max(L, H, W);

    // Convert FOV to radians
    const fov = camera.fov * (Math.PI / 180);

    // Calculate distance to fit the object
    // We use the largest dimension to ensure everything fits
    // Factor 1.5 is margin
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;

    // Enforce minimum distance to prevent macro zoom on small objects
    cameraZ = Math.max(cameraZ, 8.0);

    console.log("🎥 focusCamera: Calc", { L, H, W, maxDim, fov, cameraZ, center });

    // Position: ISO-like diagonal (View from Door/Fundo towards Peito)
    const direction = new THREE.Vector3(1, 1, 1).normalize();
    const position = center.clone().add(direction.multiplyScalar(cameraZ));

    console.log("🎥 focusCamera: Setting Position", position);

    camera.position.copy(position);
    controls.target.copy(center);

    // Update ranges
    camera.near = 0.1;
    camera.far = Math.max(200, cameraZ * 5);
    camera.updateProjectionMatrix();

    controls.update();
  }

  // API: setItems(items) - reconstruct placed items or use instancing
  function setItems(items = []) {
    console.log("🔄 Engine: setItems called with", items.length, "items");

    // Track seen IDs to prevent collisions
    const seenIds = new Set();
    const cleanItems = items.map(item => {
      let id = item.id;
      if (!id || seenIds.has(id)) {
        id = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `restored_${Date.now()}_${Math.random()}`;
      }
      seenIds.add(id);
      return { ...item, id };
    });

    const useInstancing = cleanItems.length > INSTANCE_THRESHOLD;

    // --- INSTANCED RENDERING SWITCH ---
    if (useInstancing) {
      console.log("🚀 High Performance Mode: Switching to Instanced Rendering");

      // 1. Clear individual meshes from the scene
      for (const [key, val] of Array.from(placed.entries())) {
        if (val.mesh && val.mesh.parent === scene) {
          scene.remove(val.mesh);
        }
      }

      // 2. Update Instanced Renderer with SMART CULLING
      // "os que não mostram não sejam renderizados mas contados"

      const renderItems = filterHiddenItems(cleanItems, bauInnerBox);
      console.log(`🧠 Smart Culling: Visíveis ${renderItems.length} / Total ${cleanItems.length}`);

      const renderData = renderItems.map(item => ({
        position: item.position,
        rotation: item.rotation,
        scale: item.scale,
        type: item.tipo || item.meta?.tipo || "caixa",
        color: item.meta?.cor || item.meta?.color,
        meta: item.meta
      }));
      instancedRenderer.update(renderData);

      // 3. Ensure instanced meshes are visible
      instancedRenderer.meshes.box.visible = true;
      instancedRenderer.meshes.cylinder.visible = true;
      instancedRenderer.meshes.tire.visible = true;

    } else {
      // --- DETAILED MODE ---
      // Disable Instanced Renderer
      if (instancedRenderer) {
        instancedRenderer.update([]); // Clear instanced items
        instancedRenderer.meshes.box.visible = false;
        instancedRenderer.meshes.cylinder.visible = false;
        instancedRenderer.meshes.tire.visible = false;
      }
    }

    // Standard Logic (Populate 'placed' map)
    const incomingIds = new Set(cleanItems.map((i) => i.id));
    for (const key of Array.from(placed.keys())) {
      if (!incomingIds.has(key)) {
        const e = placed.get(key);
        if (e.mesh && e.mesh.parent === scene) {
          try { scene.remove(e.mesh); } catch { }
        }
        placed.delete(key);
      }
    }

    for (const data of cleanItems) {
      const id = data.id;
      if (placed.has(id)) {
        // update transform and aabb
        const entry = placed.get(id);
        entry.mesh.position.set(data.position[0], data.position[1], data.position[2]);
        if (data.rotation) entry.mesh.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
        entry.data = data;
        entry.aabb = makeAABBForSizeAt({ x: data.scale[0], y: data.scale[1], z: data.scale[2] }, entry.mesh.position);

        // Visibility toggle for individual meshes
        if (useInstancing) {
          if (entry.mesh.parent === scene) scene.remove(entry.mesh);
        } else {
          if (entry.mesh.parent !== scene) scene.add(entry.mesh);
        }
        continue;
      }

      let mesh = null;
      const tipo = data.tipo || data.meta?.tipo || "caixa";

      try {
        if (tipo === "cilindrico") {
          const outer = cmToM(data.meta?.largura || data.largura || 230);
          const height = cmToM(data.meta?.altura || data.altura || 30);
          mesh = createCylinderMesh({ diameter: outer, height, color: data.meta?.color || "#333" });
          mesh.userData._size = { x: outer, y: height, z: outer };
        } else if (tipo === "pneu") {
          const radius = cmToM((data.meta?.largura || data.largura || 60) / 2);
          const width = cmToM(data.meta?.comprimento || data.comprimento || 20);
          mesh = createTireMesh({ radius, width, color: data.meta?.color || "#111" });
          const diameter = radius * 2;
          mesh.userData._size = { x: width, y: diameter, z: diameter };
        } else {
          const sx = data.scale?.[0] ?? cmToM((data.meta?.comprimento || data.comprimento) || 50);
          const sy = data.scale?.[1] ?? cmToM((data.meta?.altura || data.altura) || 50);
          const sz = data.scale?.[2] ?? cmToM((data.meta?.largura || data.largura) || 50);
          mesh = createBoxMesh([sx, sy, sz], data.meta?.cor || data.meta?.color || "#ff7a18");
          mesh.userData._size = { x: sx, y: sy, z: sz };
        }

        mesh.position.set(data.position[0], data.position[1], data.position[2]);
        if (data.rotation) mesh.rotation.set((data.rotation || [0, 0, 0])[0], (data.rotation || [0, 0, 0])[1], (data.rotation || [0, 0, 0])[2]);

        mesh.userData.colocId = id;
        mesh.userData.meta = data.meta || {};

        // Calculate AABB size from rotated mesh
        const box = new THREE.Box3().setFromObject(mesh);
        const aabb = { min: box.min, max: box.max };

        // THE FIX: Only add to scene if NOT using instancing
        if (!useInstancing) {
          scene.add(mesh);
        }

        placed.set(id, { mesh, data, aabb });
      } catch (err) {
        console.error("Erro ao reconstruir item setItems:", err, data);
      }
    }

    window.dispatchEvent(new CustomEvent("fullLoad_updated"));
  }

  // API: setGhostMeta(mercadoria)
  function setGhostMeta(merc) {
    while (ghost.children.length) ghost.remove(ghost.children[0]);
    if (!merc) {
      ghost.visible = false;
      return;
    }

    let mesh;
    const tipo = merc.tipo || "caixa";

    // Helper to fix edges
    const setupEdges = (mesh) => {
      // Find the edges child
      const edges = mesh.children.find(c => c.isLineSegments);
      if (edges) {
        edges.material = edges.material.clone(); // Clone to allow unique color
        edges.material.color.setHex(0xffffff);
        edges.material.linewidth = 2; // Warning: WebGL often ignores linewidth > 1
        mesh.userData._edges = edges;
      }
    };

    if (tipo === "cilindrico") {
      const outer = cmToM(merc.largura || merc.W || 230);
      const height = cmToM(merc.altura || merc.H || 30);
      mesh = createCylinderMesh({ diameter: outer, height, color: merc.color || "#00a" });
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      mesh.material.opacity = 0.5; // Base opacity
      mesh.userData._size = { x: outer, y: height, z: outer };

    } else if (tipo === "pneu") {
      const radius = cmToM((merc.largura || merc.W || 60) / 2);
      const width = cmToM(merc.comprimento || merc.L || 20);
      mesh = createTireMesh({ radius, width, color: merc.color || "#111" });
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      mesh.material.opacity = 0.5;
      const diameter = radius * 2;
      mesh.userData._size = { x: width, y: diameter, z: diameter };

    } else {
      const sx = cmToM(merc.comprimento || merc.L || 50);
      const sy = cmToM(merc.altura || merc.H || 50);
      const sz = cmToM(merc.largura || merc.W || 50);
      mesh = createBoxMesh([sx, sy, sz], merc.cor || merc.color || "#00a");
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      mesh.material.opacity = 0.5;
      mesh.userData._size = { x: sx, y: sy, z: sz };
    }

    mesh.userData._meta = merc;
    mesh.userData._rotIndex = 0;
    setupEdges(mesh);

    ghost.add(mesh);
    ghost.visible = true;
  }

  function placeGhostAtWorld(positionVec3) {
    if (!ghost.children[0] || !bauInnerBox) return;
    const size = ghost.children[0].userData._size;
    const clamped = clampInsideBau({ x: positionVec3.x, y: size.y / 2, z: positionVec3.z }, size, bauInnerBox);
    ghost.position.set(clamped.x, clamped.y, clamped.z);
    ghost.visible = true;
  }

  function focusCamera() {
    if (!bauInnerBox) return;
    const L = bauInnerBox.max.x,
      W = bauInnerBox.max.z,
      H = bauInnerBox.max.y;
    camera.position.set(-L * 0.5, H * 3, W * 2.5);
    controls.target.set(L / 2, H / 2, W / 2);
    controls.update();
  }

  function destroy() {
    running = false;
    try { cancelAnimationFrame(rafId); } catch { }

    try { window.removeEventListener("resize", onResize); } catch { }
    try { renderer.domElement.removeEventListener("pointermove", onPointerMove); } catch { }
    try { renderer.domElement.removeEventListener("pointerdown", onPointerDown); } catch { }
    try { renderer.domElement.removeEventListener("dblclick", onDblClick); } catch { }
    try { renderer.domElement.removeEventListener("webglcontextlost", onContextLost); } catch { }
    try { renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored); } catch { }
    try { window.removeEventListener("keydown", onKeyDown); } catch { }
    try { window.removeEventListener("fullLoad_placeManual", onPlaceManual); } catch { }
    try { window.removeEventListener("fullLoad_remove", () => { }); } catch { }

    try {
      for (const [k, v] of Array.from(placed.entries())) {
        try { scene.remove(v.mesh); } catch { }
        placed.delete(k);
      }
      try { if (bauGroup) scene.remove(bauGroup); } catch { }
      try { scene.remove(ghost); } catch { }
    } catch (err) { }

    try {
      renderer.dispose();
    } catch (err) { }

    if (!isCanvas) {
      try {
        if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      } catch (err) { }
    }

    if (_engineAPI && _engineAPI.destroy === destroy) {
      _engineAPI = null;
    }
  }

  if (initialBau) setBau(initialBau);

  // ===============================
  // FBL (Front-Bottom-Left) PACKING ALGORITHM
  // ===============================

  // Helper: Check if two AABBs overlap
  function boxesOverlap(a, b) {
    const epsilon = 0.001;
    return (
      a.min.x < b.max.x - epsilon && a.max.x > b.min.x + epsilon &&
      a.min.y < b.max.y - epsilon && a.max.y > b.min.y + epsilon &&
      a.min.z < b.max.z - epsilon && a.max.z > b.min.z + epsilon
    );
  }

  // Helper: Check if a candidate box collides with any existing item
  function wouldCollide(candidateAABB, existingItems) {
    // Check truck bounds
    if (candidateAABB.min.x < 0 || candidateAABB.min.y < 0 || candidateAABB.min.z < 0 ||
      candidateAABB.max.x > bauInnerBox.max.x ||
      candidateAABB.max.y > bauInnerBox.max.y ||
      candidateAABB.max.z > bauInnerBox.max.z) {
      return true;
    }

    for (const item of existingItems) {
      if (boxesOverlap(candidateAABB, item.aabb)) {
        return true;
      }
    }
    return false;
  }



  async function* addMercadoriaAuto(mercadoria, quantidade = 1) {
    if (!bauInnerBox) {
      console.warn("addMercadoriaAuto: bau ainda não foi definido.");
      return [];
    }

    // Capture Operation ID
    const opId = currentOperationId;

    saveState();

    const placedResults = [];

    try {
      let existingItems = Array.from(placed.values());

      // OPTIMIZATION: Prepare Spatial Hash & Candidates ONCE (O(M))
      if (opId !== currentOperationId) return; // Abort
      const spatialHash = new SpatialHash(0.5);
      existingItems.forEach(item => spatialHash.insert(item.aabb, item));

      // Initial Candidates
      let xCands = new Set([0]);
      let yCands = new Set([0]);
      let zCands = new Set([0]);

      for (const item of existingItems) {
        if (item.aabb.max.x < bauInnerBox.max.x) xCands.add(item.aabb.max.x);
        if (item.aabb.max.y < bauInnerBox.max.y) yCands.add(item.aabb.max.y);
        if (item.aabb.max.z < bauInnerBox.max.z) zCands.add(item.aabb.max.z);
      }

      // Pre-calc dimensions once
      const dimL = cmToM(mercadoria.comprimento || mercadoria.L || 50);
      const dimH = cmToM(mercadoria.altura || mercadoria.H || 50);
      const dimW = cmToM(mercadoria.largura || mercadoria.W || 50);

      const allRotations = [
        { dims: { x: dimL, y: dimH, z: dimW }, rot: [0, 0, 0], label: "em_pe" },
        { dims: { x: dimW, y: dimH, z: dimL }, rot: [0, Math.PI / 2, 0], label: "em_pe" },
        { dims: { x: dimL, y: dimW, z: dimH }, rot: [Math.PI / 2, 0, 0], label: "deitado" },
        { dims: { x: dimH, y: dimW, z: dimL }, rot: [Math.PI / 2, Math.PI / 2, 0], label: "deitado" },
        { dims: { x: dimH, y: dimL, z: dimW }, rot: [0, 0, Math.PI / 2], label: "de_lado" },
        { dims: { x: dimW, y: dimL, z: dimH }, rot: [0, Math.PI / 2, Math.PI / 2], label: "de_lado" }
      ];

      let allowedRotations = allRotations;
      if (mercadoria.posicao && mercadoria.posicao !== "livre") {
        allowedRotations = allRotations.filter(r => r.label === mercadoria.posicao);
        if (allowedRotations.length === 0) allowedRotations = allRotations;
      }

      // MAIN LOOP (O(Q))
      const BATCH_SIZE = 50;

      for (let i = 0; i < quantidade; i++) {
        // Yield Control & Progress update
        if (i % BATCH_SIZE === 0) {
          if (opId !== currentOperationId) {
            console.log("Async Add Aborted");
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
          yield { type: 'progress', current: i, total: quantidade };
        }

        const colocId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `auto_${Date.now()}_${i}`;

        // Sort candidates (Optimization: simple sort is fast for small sets, or we could maintain sorted order)
        const sortedX = Array.from(xCands).sort((a, b) => a - b);
        const sortedY = Array.from(yCands).sort((a, b) => a - b);
        const sortedZ = Array.from(zCands).sort((a, b) => a - b);

        let bestFit = null;

        searchLoop:
        for (const x of sortedX) {
          for (const y of sortedY) {
            for (const z of sortedZ) {
              let bestRotForPos = null;

              for (const config of allowedRotations) {
                const dims = config.dims;
                const posX = x;
                const posY = y;
                const posZ = z;

                const candidateAABB = {
                  min: { x: posX, y: posY, z: posZ },
                  max: { x: posX + dims.x, y: posY + dims.y, z: posZ + dims.z }
                };

                // Fast Collision Check using Spatial Hash
                let collision = false;
                // Check bounds first
                if (candidateAABB.min.x < 0 || candidateAABB.min.y < 0 || candidateAABB.min.z < 0 ||
                  candidateAABB.max.x > bauInnerBox.max.x ||
                  candidateAABB.max.y > bauInnerBox.max.y ||
                  candidateAABB.max.z > bauInnerBox.max.z) {
                  collision = true;
                } else {
                  // Query grid
                  const neighbors = spatialHash.query(candidateAABB);
                  for (const neighbor of neighbors) {
                    if (boxesOverlap(candidateAABB, neighbor.aabb)) {
                      collision = true;
                      break;
                    }
                  }
                }

                if (!collision) {
                  // Neighbors for support
                  const neighbors = spatialHash.query(candidateAABB);

                  // supportTopAt O(Neighbors) - Very fast
                  const supportY = supportTopAt(
                    posX + dims.x / 2,
                    posZ + dims.z / 2,
                    dims.x,
                    dims.z,
                    Array.from(neighbors)
                  );

                  if (Math.abs(posY - supportY) > 0.001) continue;

                  const footprint = dims.x * dims.z;
                  if (!bestRotForPos || footprint > bestRotForPos.footprint) {
                    bestRotForPos = {
                      position: { x: posX, y: posY, z: posZ },
                      dims: dims,
                      rotation: config,
                      footprint: footprint
                    };
                  }
                }
              }

              if (bestRotForPos) {
                bestFit = bestRotForPos;
                break searchLoop;
              }
            }
          }
        }

        if (bestFit) {
          const meta = { ...mercadoria, cor: mercadoria.cor || mercadoria.color || "#ff7a18" };
          const centerX = bestFit.position.x + bestFit.dims.x / 2;
          const centerY = bestFit.position.y + bestFit.dims.y / 2;
          const centerZ = bestFit.position.z + bestFit.dims.z / 2;

          const entry = placeItemInternal(
            new THREE.Vector3(centerX, centerY, centerZ),
            new THREE.Euler(bestFit.rotation.rot[0], bestFit.rotation.rot[1], bestFit.rotation.rot[2]),
            meta,
            colocId,
            bestFit.dims
          );

          if (entry) {
            placedResults.push(entry);
            existingItems.push(entry);

            // DYNAMIC UPDATE (O(1))
            spatialHash.insert(entry.aabb, entry);
            if (entry.aabb.max.x < bauInnerBox.max.x) xCands.add(entry.aabb.max.x);
            if (entry.aabb.max.y < bauInnerBox.max.y) yCands.add(entry.aabb.max.y);
            if (entry.aabb.max.z < bauInnerBox.max.z) zCands.add(entry.aabb.max.z);

          } else {
            console.warn("Item rejected by engine (Hard Block):", mercadoria.nome);
          }
        } else {
          console.warn("Não foi possível encaixar item auto:", mercadoria.nome);
        }
      }
    } catch (err) {
      console.error("CRITICAL ERROR in addMercadoriaAuto:", err);
    }

    yield { type: 'complete', result: placedResults };
  }

  async function optimizeLoad() {
    console.log("Otimizando carga (Regra de Ouro)...");

    const opId = currentOperationId;
    saveState();

    if (!bauInnerBox) {
      window.dispatchEvent(new CustomEvent("fullLoad_error", { detail: { message: "Baú não definido!" } }));
      return;
    }

    // Get current items (or from a list if passed)
    // For now, let's optimize what's currently placed + maybe a queue?
    // Actually, usually optimization is done on a list of items to be loaded.
    // Let's assume we take all currently placed items and re-pack them.
    const currentItems = Array.from(placed.values()).map(p => {
      // Handle inconsistency: setItems stores {..., meta: {...}} but placeItemInternal stores meta directly
      const raw = p.data;
      const meta = raw.meta || raw;

      return {
        id: p.mesh.userData.colocId || raw.id,
        ...meta, // Spread meta properties (including cor/color)
        meta: meta,
      };
    });

    try {
      // Notify start
      window.dispatchEvent(new CustomEvent("fullLoad_optimizing", { detail: { status: "start" } }));

      const truckDims = {
        L: bauInnerBox.max.x,
        H: bauInnerBox.max.y,
        W: bauInnerBox.max.z
      };

      console.log("Optimizer Input - Truck:", truckDims);
      console.log("Optimizer Input - Items:", currentItems.length, currentItems[0]);

      const result = await optimize(currentItems, truckDims);

      console.log("Optimizer Output:", result);

      console.log("✅ Otimizador retornou:", result.placed.length, "itens colocados,", result.unplaced.length, "não colocados");
      console.log("📊 Antes da otimização:", currentItems.length, "itens");
      console.log("📊 Depois da otimização:", result.placed.length, "itens");

      // Apply result
      if (opId !== currentOperationId) {
        console.warn("⚠️ Otimização descartada (Cena foi limpa ou alterada durante o calculo)");
        return;
      }
      clearScene(false); // Clear WITHOUT saving (we already saved start state)

      result.placed.forEach((p, idx) => {
        // Safety Check: Verify bounds
        const halfL = p.scale[0] / 2;
        const halfH = p.scale[1] / 2;
        const halfW = p.scale[2] / 2;
        const minX = p.position[0] - halfL;
        const maxX = p.position[0] + halfL;
        const minZ = p.position[2] - halfW;
        const maxZ = p.position[2] + halfW;

        if (maxX > truckDims.L + 0.01 || maxZ > truckDims.W + 0.01 || minX < -0.01 || minZ < -0.01) {
          console.error("VIOLATION: Item placed outside bounds!", p, truckDims);
        }

        // Re-place item
        // placeItemInternal expects center position
        const pos = new THREE.Vector3(p.position[0], p.position[1], p.position[2]);
        const rot = new THREE.Euler(p.rotation[0], p.rotation[1], p.rotation[2]);
        // Pass explicit size from optimizer result (p.scale is [l, h, w] which maps to [x, y, z])
        const size = { x: p.scale[0], y: p.scale[1], z: p.scale[2] };
        // Generate a FRESH unique ID for the optimized placement to avoid any collision
        const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `opt_${Date.now()}_${idx}`;

        const entry = placeItemInternal(pos, rot, p.meta, newId, size);
        if (!entry) {
          console.error("❌ Otimizador: Falha ao recolocar item na cena:", p.id, p);
        } else {
          // console.log("✅ Item recolocado:", idx);
        }
      });

      // Notify success
      window.dispatchEvent(new CustomEvent("fullLoad_optimizing", {
        detail: {
          status: "complete",
          stats: result.stats,
          unplaced: result.unplaced
        }
      }));

      // DEBUG: Draw Truck Bounds (REMOVO RED WIREFRAME FIX)
      /*
      if (false) { // Disabled for production
        const boxGeo = new THREE.BoxGeometry(truckDims.L, truckDims.H, truckDims.W);
        const boxEdges = new THREE.EdgesGeometry(boxGeo);
        const boxLine = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: 0xff0000 }));
        // Truck origin is 0,0,0 (corner). Center is L/2, H/2, W/2.
        boxLine.position.set(truckDims.L / 2, truckDims.H / 2, truckDims.W / 2);
        scene.add(boxLine);
      }
      */

    } catch (err) {
      console.error("Optimization error:", err);
      window.dispatchEvent(new CustomEvent("fullLoad_optimizing", { detail: { status: "error" } }));
    }
  }

  function setView(view) {
    if (!camera || !controls || !bauInnerBox) return;

    // bauInnerBox.max contains {x: L, y: H, z: W}
    const L = bauInnerBox.max.x;
    const H = bauInnerBox.max.y;
    const W = bauInnerBox.max.z;

    const center = new THREE.Vector3(L / 2, H / 2, W / 2);
    controls.target.copy(center);

    const maxDim = Math.max(L, H, W);

    switch (view) {
      case "iso":
        // Closer iso view
        const isoDist = maxDim * 1.2;
        camera.position.set(center.x + isoDist, center.y + isoDist * 0.6, center.z + isoDist);
        break;
      case "top":
        // Top view needs to fit L and W. 
        camera.position.set(center.x, center.y + maxDim * 1.0, center.z);
        break;
      case "side":
        // Side view (Z axis)
        camera.position.set(center.x, center.y, center.z + maxDim * 1.2);
        break;
      case "back":
        // Back view (X axis)
        camera.position.set(center.x + maxDim * 1.2, center.y, center.z);
        break;
      default:
        break;
    }
    camera.lookAt(center);
    controls.update();
    renderer.render(scene, camera);
  }

  function captureSnapshot(view) {
    // Only change view if specified and not 'current'
    if (view && view !== 'current') setView(view);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png");
  }

  function getPlacedItems() {
    return Array.from(placed.values()).map(p => ({
      ...p.data,
      id: p.mesh.userData.colocId, // CRITICAL: Save the unique placement ID
      position: [p.mesh.position.x, p.mesh.position.y, p.mesh.position.z],
      rotation: [p.mesh.rotation.x, p.mesh.rotation.y, p.mesh.rotation.z],
      scale: [p.mesh.userData._size.x, p.mesh.userData._size.y, p.mesh.userData._size.z],
      meta: p.data.meta || p.data
    }));
  }

  function getBauState() {
    if (!bauInnerBox) return null;
    return {
      L: bauInnerBox.max.x,
      H: bauInnerBox.max.y,
      W: bauInnerBox.max.z
    };
  }

  function handleDrop(clientX, clientY, mercadoria) {
    setGhostMeta(mercadoria);
  }


  async function generateStepSnapshots(stepsData) {
    // stepsData: Array of { itemIds: string[], center?: {x,y,z} }
    const results = [];
    const allItems = Array.from(placed.values());

    // 1. Save Original State
    const originalPos = camera.position.clone();
    const originalTarget = controls.target.clone();
    const originalClearColor = new THREE.Color();
    renderer.getClearColor(originalClearColor);
    const originalShadows = renderer.shadowMap.enabled;

    // 2. Setup "Studio Mode"
    allItems.forEach(p => p.mesh.visible = false);

    // Polish 1: White Background
    renderer.setClearColor(0xffffff, 1);

    // Polish 2: Shadows (basic enable, assumes lights are setup)
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    for (const step of stepsData) {
      // Show items for this step
      step.itemIds.forEach(id => {
        const entry = placed.get(id);
        if (entry) entry.mesh.visible = true;
      });

      // 3. Focus Camera (Cinematic ISO)
      if (step.center) {
        const cx = step.center.x;
        const cy = step.center.y;
        const cz = step.center.z;

        controls.target.set(cx, cy, cz);

        // Polish 3: Perfect Isometric Angle (approx 35.264 degrees pitch)
        // Distance: Fixed offset for consistent scale, or dynamic based on load size?
        // Let's use a fixed offset vector rotated to ISO.
        // Isometric from Back-Right: X+, Y+, Z+
        const dist = 12; // Zoom distance
        camera.position.set(cx + dist, cy + (dist * 0.816), cz + dist); // Visual tweak for ISO
        camera.lookAt(cx, cy, cz);
      }
      controls.update();

      // Render
      renderer.render(scene, camera);

      const img = renderer.domElement.toDataURL("image/png");
      results.push(img);

      // Async yield
      await new Promise(r => setTimeout(r, 60));
    }

    // 4. Restore State
    allItems.forEach(p => p.mesh.visible = true);
    controls.target.copy(originalTarget);
    camera.position.copy(originalPos);

    renderer.setClearColor(originalClearColor);
    renderer.shadowMap.enabled = originalShadows;

    controls.update();
    renderer.render(scene, camera);

    return results;
  }

  _engineAPI = {
    setBau,
    setItems,
    setGhostMeta,
    placeGhostAtWorld,
    placeItemAt,
    removeItem,
    clearScene,
    generateStepSnapshots, // New API
    addMercadoriaAuto,
    optimizeLoad,
    undo: internalUndo,
    redo: internalRedo,
    captureSnapshot,
    getPlacedItems,
    getBauState,
    handleDrop,
    destroy: () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);

      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

      if (instancedRenderer) {
        instancedRenderer.cleanup();
        instancedRenderer = null;
      }

      if (renderer) renderer.dispose();
      _engineAPI = null;
    }
  };

  return _engineAPI;
}

export const setBauDimensions = (L, H, W) => _engineAPI && _engineAPI.setBau({ L, H, W });
export const setItems = (items) => _engineAPI && _engineAPI.setItems(items);
export const setGhostObject = (merc) => _engineAPI && _engineAPI.setGhostMeta(merc);
export const placeGhostAt = (pos) => _engineAPI && _engineAPI.placeGhostAtWorld(pos);
export const placeItemAt = (pos, rot, meta) => _engineAPI && _engineAPI.placeItemAt(pos, rot, meta);
export const removeItem = (id) => _engineAPI && _engineAPI.removeItem(id);
export const clearScene = () => _engineAPI && _engineAPI.clearScene();
export const addMercadoriaAuto = (merc, qtd) => _engineAPI && _engineAPI.addMercadoriaAuto(merc, qtd);
export const generateStepSnapshots = (steps) => _engineAPI && _engineAPI.generateStepSnapshots ? _engineAPI.generateStepSnapshots(steps) : Promise.resolve([]);
export const captureSnapshot = (view) => _engineAPI && _engineAPI.captureSnapshot ? _engineAPI.captureSnapshot(view) : null;
export const getPlacedItems = () => _engineAPI && _engineAPI.getPlacedItems ? _engineAPI.getPlacedItems() : [];
export const getBauState = () => _engineAPI && _engineAPI.getBauState ? _engineAPI.getBauState() : null;
export const handleDrop = (x, y, m) => _engineAPI && _engineAPI.handleDrop ? _engineAPI.handleDrop(x, y, m) : null;
export const optimizeLoad = () => _engineAPI && _engineAPI.optimizeLoad();
export const undo = () => _engineAPI && _engineAPI.undo();
export const redo = () => _engineAPI && _engineAPI.redo();
