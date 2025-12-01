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
  computeStackY
} from "./fullLoadUtils";

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
let _engineAPI = null; // module-level pointer

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
  scene.background = new THREE.Color(0xffffff); // White background

  // Isometric-ish camera setup
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(-3, 4, 5); // Default position, will be focused later

  // 2. Renderer
  const rendererParams = { antialias: true, alpha: true };
  const isCanvas = container.tagName === "CANVAS";
  if (isCanvas) {
    rendererParams.canvas = container;
  }

  renderer = new THREE.WebGLRenderer(rendererParams);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

  if (!isCanvas) {
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
  }

  // 3. Lights & Environment
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
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
  function highlightSelect(mesh) {
    clearHighlight();
    if (!mesh || !mesh.material) return;
    selectedId = mesh.userData?.colocId || null;
    mesh.userData._oldEmissive = mesh.material.emissive ? mesh.material.emissive.clone() : null;
    if (mesh.material && mesh.material.emissive) mesh.material.emissive.setHex(0x4444ff);
  }
  function clearHighlight() {
    if (!selectedId) return;
    const entry = placed.get(selectedId);
    if (entry && entry.mesh && entry.mesh.material && entry.mesh.userData._oldEmissive) {
      try {
        entry.mesh.material.emissive.copy(entry.mesh.userData._oldEmissive);
      } catch { }
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

      if (!bauGroup || !ghost.visible) return;

      raycaster.setFromCamera(mouse, camera);
      const plane = bauGroup.getObjectByName("bau_ground_plane");

      if (!plane) return;

      const ints = raycaster.intersectObject(plane);
      if (!ints.length) return;
      const p = ints[0].point;

      const step = 0.01; // 1cm precision

      let gx = snap(p.x, step);
      let gz = snap(p.z, step);

      const ghostMesh = ghost.children[0];
      if (!ghostMesh) return;

      const rawSize = ghostMesh.userData._size;
      const rotY = ghostMesh.rotation.y;

      // Calculate effective size based on rotation using Box3
      const box = new THREE.Box3().setFromObject(ghostMesh);
      const sizeVec = new THREE.Vector3();
      box.getSize(sizeVec);
      const size = { x: sizeVec.x, y: sizeVec.y, z: sizeVec.z };

      // 1. Tight Pack (Magnetic Snap)
      const existingItems = Array.from(placed.values());
      const packed = tightPack(gx, gz, size.x, size.z, bauInnerBox.max.x, bauInnerBox.max.z, existingItems);
      gx = packed.x;
      gz = packed.z;

      // 2. Strict Clamp to bau (IMMEDIATE)
      // Ensure we are inside BEFORE checking stack/adjacency
      const margin = 0.001;
      const clamped = clampInsideBau({ x: gx, y: size.y / 2, z: gz }, size, bauInnerBox, margin);
      gx = clamped.x;
      gz = clamped.z;

      // 3. Determine Y automatically (Gravity)
      // Pass the type of the current ghost item to check stacking rules
      const currentType = ghostMesh.userData._meta?.tipo || "caixa";
      const validY = computeStackY(existingItems, bauInnerBox, gx, gz, size.x, size.y, size.z, currentType);

      // 4. Overlap Check (Strict)
      const isOverlapping = checkOverlap({ x: gx, y: validY !== null ? validY : size.y / 2, z: gz }, size, existingItems);

      let gy;
      if (validY !== null && !isOverlapping) {
        gy = validY;
        // Use meta color or default
        const colorHex = ghostMesh.userData._meta?.cor ? ghostMesh.userData._meta.cor : (ghostMesh.userData._meta?.color || "#0000aa");
        ghostMesh.material.color.set(colorHex);
        ghostMesh.material.opacity = 0.5;
        ghost.userData.isValid = true;
      } else {
        gy = validY !== null ? validY : size.y / 2;
        ghostMesh.material.color.setHex(0xff0000);
        ghostMesh.material.opacity = 0.8;
        ghost.userData.isValid = false;
      }

      // Final position update
      ghost.position.set(gx, gy, gz);

    } catch (err) {
      console.error("onPointerMove error:", err);
    }
  }
  renderer.domElement.addEventListener("pointermove", onPointerMove);

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
      if (selectedId) {
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
    if (!bauInnerBox) return;
    const L = bauInnerBox.max.x;
    const W = bauInnerBox.max.z;
    const H = bauInnerBox.max.y;
    controls.target.set(L / 2, H / 2, W / 2);

    if (view === "iso") camera.position.set(-L * 0.5, H * 3, W * 2.5);
    else if (view === "top") camera.position.set(L / 2, H * 4, W / 2);
    else if (view === "side") camera.position.set(L / 2, H / 2, W * 3);
    else if (view === "back") camera.position.set(-L, H / 2, W / 2);

    camera.lookAt(controls.target);
    controls.update();
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
    if (bauGroup) {
      try { scene.remove(bauGroup); } catch { }
      bauGroup = null;
      bauInnerBox = null;
    }
    if (!truck) return;

    // truck.tamanhoBau may be an object with cm values either as { L,W,H } or { comprimento, largura, altura }
    const tbRaw = truck.tamanhoBau || truck;
    const orderedCm = normalizeAndOrderBau(tbRaw);

    // convert to meters
    const L = cmToM(orderedCm.L);
    const W = cmToM(orderedCm.W);
    const H = cmToM(orderedCm.H);

    // build group
    bauGroup = new THREE.Group();
    bauGroup.name = "bau_group";

    // -- Visuals: Floor & Walls --

    // 1. Floor (Solid)
    const floorGeo = new THREE.BoxGeometry(L, 0.05, W);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.4,
      metalness: 0.3
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(L / 2, -0.025, W / 2); // Just below y=0
    floorMesh.receiveShadow = true;
    bauGroup.add(floorMesh);

    // 2. Walls (Semi-transparent)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      roughness: 0.5
    });

    // Front Wall (at x=L) - The "Cab" end
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(0.05, H, W), wallMat);
    frontWall.position.set(L + 0.025, H / 2, W / 2);
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
    // Label "FUNDO"
    const label = createTextSprite("Peito");
    label.position.set(L - 0.1, H / 2, W / 2); // Near the back wall
    bauGroup.add(label);

    // Label "PEITO" (Front)
    const labelPeito = createTextSprite("Fundo");
    labelPeito.position.set(0.1, H / 2, W / 2);
    bauGroup.add(labelPeito);

    scene.add(bauGroup);

    bauInnerBox = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: L, y: H, z: W },
    };

    // focus camera
    focusCamera();
  }

  // API: setItems(items) - reconstruct placed items
  // items = [{ id, position: [x,y,z], rotation: [rx,ry,rz], scale: [sx,sy,sz], tipo, meta }]
  function setItems(items = []) {
    // remove those not present
    const incomingIds = new Set(items.map((i) => i.id));
    for (const key of Array.from(placed.keys())) {
      if (!incomingIds.has(key)) {
        const e = placed.get(key);
        try { scene.remove(e.mesh); } catch { }
        placed.delete(key);
      }
    }

    for (const data of items) {
      const id = data.id;
      if (placed.has(id)) {
        // update transform and aabb
        const entry = placed.get(id);
        entry.mesh.position.set(data.position[0], data.position[1], data.position[2]);
        if (data.rotation) entry.mesh.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
        entry.data = data;
        entry.aabb = makeAABBForSizeAt({ x: data.scale[0], y: data.scale[1], z: data.scale[2] }, entry.mesh.position);
        continue;
      }

      let mesh = null;
      const tipo = data.tipo || data.meta?.tipo || "caixa";

      try {
        if (tipo === "cilindrico") {
          const outer = cmToM(data.meta?.largura || data.largura || 230);
          // const tube = cmToM(data.meta?.comprimento || data.comprimento || 30);
          const height = cmToM(data.meta?.altura || data.altura || 30);
          mesh = createCylinderMesh({ diameter: outer, height, color: data.meta?.color || "#333" });
          mesh.userData._size = { x: outer, y: height, z: outer };
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

        scene.add(mesh);
        placed.set(id, { mesh, data, aabb });
      } catch (err) {
        console.error("Erro ao reconstruir item setItems:", err, data);
      }
    }
  }

  // API: setGhostMeta(mercadoria)
  function setGhostMeta(merc) {
    while (ghost.children.length) ghost.remove(ghost.children[0]);
    if (!merc) {
      ghost.visible = false;
      return;
    }

    const tipo = merc.tipo || "caixa";
    if (tipo === "cilindrico") {
      const outer = cmToM(merc.largura || merc.W || 230);
      const height = cmToM(merc.altura || merc.H || 30);
      const mesh = createCylinderMesh({ diameter: outer, height, color: merc.color || "#00a" });
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      mesh.material.opacity = 0.35;
      mesh.userData._size = { x: outer, y: height, z: outer };
      mesh.userData._meta = merc;
      ghost.add(mesh);
      ghost.visible = true;
    } else {
      const sx = cmToM(merc.comprimento || merc.L || 50);
      const sy = cmToM(merc.altura || merc.H || 50);
      const sz = cmToM(merc.largura || merc.W || 50);
      const mesh = createBoxMesh([sx, sy, sz], merc.cor || merc.color || "#00a");
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      mesh.material.opacity = 0.25;
      mesh.userData._size = { x: sx, y: sy, z: sz };
      mesh.userData._meta = merc;
      mesh.userData._rotIndex = 0;
      ghost.add(mesh);
      ghost.visible = true;
    }
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
    try { window.removeEventListener("fullLoad_removedExternamente", onExternalRemove); } catch { }
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

  // Helper: Calculate support from below
  function supportTopAt(candidateAABB, existingItems) {
    let topY = 0;
    const cx = (candidateAABB.min.x + candidateAABB.max.x) / 2;
    const cz = (candidateAABB.min.z + candidateAABB.max.z) / 2;
    const dx = candidateAABB.max.x - candidateAABB.min.x;
    const dz = candidateAABB.max.z - candidateAABB.min.z;

    for (const item of existingItems) {
      // Check if item is below candidate
      if (item.aabb.max.y <= candidateAABB.min.y + 0.001) {
        // Check horizontal overlap
        const ixMin = Math.max(candidateAABB.min.x, item.aabb.min.x);
        const ixMax = Math.min(candidateAABB.max.x, item.aabb.max.x);
        const izMin = Math.max(candidateAABB.min.z, item.aabb.min.z);
        const izMax = Math.min(candidateAABB.max.z, item.aabb.max.z);

        if (ixMax > ixMin && izMax > izMin) {
          // Overlap exists
          topY = Math.max(topY, item.aabb.max.y);
        }
      }
    }
    return topY;
  }

  function addMercadoriaAuto(mercadoria, quantidade = 1) {
    if (!bauInnerBox) {
      console.warn("addMercadoriaAuto: bau ainda não foi definido.");
      return [];
    }

    const placedResults = [];
    let existingItems = Array.from(placed.values());

    for (let i = 0; i < quantidade; i++) {
      const colocId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `auto_${Date.now()}_${i}`;

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

      // Generate Candidate Points
      // Candidates are: (0,0,0) AND (item.max.x, item.max.y, item.max.z) for all existing items
      // We filter coordinates to be within truck bounds.
      let xCands = new Set([0]);
      let yCands = new Set([0]);
      let zCands = new Set([0]);

      for (const item of existingItems) {
        if (item.aabb.max.x < bauInnerBox.max.x) xCands.add(item.aabb.max.x);
        if (item.aabb.max.y < bauInnerBox.max.y) yCands.add(item.aabb.max.y);
        if (item.aabb.max.z < bauInnerBox.max.z) zCands.add(item.aabb.max.z);
      }

      const sortedX = Array.from(xCands).sort((a, b) => a - b); // Front to Back (Min X first)
      const sortedY = Array.from(yCands).sort((a, b) => a - b); // Bottom to Top
      const sortedZ = Array.from(zCands).sort((a, b) => a - b); // Left to Right

      let bestFit = null;

      // Iterate candidates: X (Front) -> Y (Bottom) -> Z (Left)
      searchLoop:
      for (const x of sortedX) {
        for (const y of sortedY) {
          for (const z of sortedZ) {
            for (const config of allowedRotations) {
              const dims = config.dims;

              // Candidate position is the anchor point (min x, min y, min z)
              const posX = x;
              const posY = y;
              const posZ = z;

              const candidateAABB = {
                min: { x: posX, y: posY, z: posZ },
                max: { x: posX + dims.x, y: posY + dims.y, z: posZ + dims.z }
              };

              if (!wouldCollide(candidateAABB, existingItems)) {
                // Check support (gravity)
                const supportY = supportTopAt(candidateAABB, existingItems);

                // For tight packing, we want the item to rest on something.
                // If y > supportY, it's floating.
                // If y < supportY, it's overlapping (but wouldCollide handles that).
                // So we basically want y == supportY.
                // Since we iterate Y candidates which are derived from item max Ys,
                // it's possible that 'y' is exactly 'supportY'.
                // But if there's a gap, 'y' might be higher.
                // We should only accept if y is very close to supportY.

                if (Math.abs(posY - supportY) > 0.001) {
                  continue;
                }

                bestFit = {
                  position: { x: posX, y: posY, z: posZ },
                  dims: dims,
                  rotation: config
                };
                break searchLoop;
              }
            }
          }
        }
      }

      if (bestFit) {
        // Place the item
        let mesh;
        try {
          if ((mercadoria.tipo || mercadoria.meta?.tipo) === "cilindrico") {
            const outer = bestFit.dims.x;
            mesh = createCylinderMesh({ diameter: outer, height: bestFit.dims.y, color: mercadoria.color || "#333" });
            mesh.userData._size = bestFit.dims;
          } else {
            mesh = createBoxMesh(
              [bestFit.dims.x, bestFit.dims.y, bestFit.dims.z],
              mercadoria.cor || mercadoria.color || "#ff7a18"
            );
            mesh.userData._size = bestFit.dims;
          }

          // Position at center of box
          const centerPos = {
            x: bestFit.position.x + bestFit.dims.x / 2,
            y: bestFit.position.y + bestFit.dims.y / 2,
            z: bestFit.position.z + bestFit.dims.z / 2
          };

          mesh.position.set(centerPos.x, centerPos.y, centerPos.z);
          mesh.rotation.set(bestFit.rotation.rot[0], bestFit.rotation.rot[1], bestFit.rotation.rot[2]);

          mesh.userData.colocId = colocId;
          mesh.userData.meta = mercadoria;

          scene.add(mesh);

          const box = new THREE.Box3().setFromObject(mesh);
          const aabb = { min: box.min, max: box.max };

          const entry = { mesh, data: mercadoria, aabb };
          placed.set(colocId, entry);
          existingItems.push(entry);

          placedResults.push({
            id: colocId,
            position: [centerPos.x, centerPos.y, centerPos.z],
            rotation: bestFit.rotation.rot,
            scale: [bestFit.dims.x, bestFit.dims.y, bestFit.dims.z],
            tipo: mercadoria.tipo || "caixa",
            meta: mercadoria
          });

          console.log(`✅ Item colocado em (${centerPos.x.toFixed(2)}, ${centerPos.y.toFixed(2)}, ${centerPos.z.toFixed(2)})`);

        } catch (err) {
          console.error("Erro ao criar mesh auto:", err);
        }
      } else {
        console.warn("❌ Não foi possível colocar mercadoria — sem espaço adequado.");
        window.dispatchEvent(new CustomEvent("fullLoad_error", {
          detail: {
            message: `Não foi possível alocar o item ${mercadoria.nome || 'Mercadoria'} (${dimL}x${dimH}x${dimW}m). Verifique o espaço disponível.`,
            item: mercadoria
          }
        }));
      }
    }

    return placedResults;
  }

  function setGhostObject(merc) {
    setGhostMeta(merc);
  }

  function clearScene() {
    for (const [k, v] of Array.from(placed.entries())) {
      try { scene.remove(v.mesh); } catch { }
      placed.delete(k);
    }
    ghost.visible = false;
  }

  function captureSnapshot(view = "iso") {
    if (!bauInnerBox) return null;

    const L = bauInnerBox.max.x;
    const W = bauInnerBox.max.z;
    const H = bauInnerBox.max.y;

    const oldPos = camera.position.clone();
    const oldQuat = camera.quaternion.clone();
    const oldTarget = controls.target.clone();

    controls.target.set(L / 2, H / 2, W / 2);

    if (view === "iso") {
      camera.position.set(-L * 0.5, H * 3, W * 2.5);
    } else if (view === "top") {
      camera.position.set(L / 2, H * 4, W / 2);
    } else if (view === "side") {
      camera.position.set(L / 2, H / 2, W * 3);
    } else if (view === "back") {
      camera.position.set(-L, H / 2, W / 2);
    }

    camera.lookAt(controls.target);
    controls.update();

    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL("image/png");

    camera.position.copy(oldPos);
    camera.quaternion.copy(oldQuat);
    controls.target.copy(oldTarget);
    controls.update();
    renderer.render(scene, camera);

    return dataURL;
  }

  function optimizeLoad() {
    if (!bauInnerBox) {
      console.warn("optimizeLoad: Bau not defined");
      return;
    }

    const items = Array.from(placed.values()).map(entry => entry.data.meta || entry.data);

    if (items.length === 0) {
      console.warn("optimizeLoad: No items to optimize");
      return;
    }

    console.log(`🔄 Otimizando carga com ${items.length} itens...`);

    clearScene();

    items.sort((a, b) => {
      const getDims = (item) => {
        const l = Number(item.comprimento || item.L || 50);
        const h = Number(item.altura || item.H || 50);
        const w = Number(item.largura || item.W || 50);
        return { l, h, w, vol: l * h * w, max: Math.max(l, h, w) };
      };
      const dA = getDims(a);
      const dB = getDims(b);

      if (Math.abs(dB.vol - dA.vol) > 1) return dB.vol - dA.vol;
      if (Math.abs(dB.h - dA.h) > 0.1) return dB.h - dA.h;
      return dB.max - dA.max;
    });

    let successCount = 0;
    for (const item of items) {
      const result = addMercadoriaAuto(item, 1);
      if (result && result.length > 0) successCount++;
    }

    console.log(`✅ Otimização concluída. ${successCount}/${items.length} itens realocados.`);
  }

  const api = {
    scene,
    camera,
    renderer,
    setBau,
    setItems,
    setGhostMeta,
    placeGhostAtWorld,
    focusCamera,
    destroy,
    addMercadoriaAuto,
    clearScene,
    captureSnapshot,
    getPlacedItems,
    getBauState,
    optimizeLoad
  };

  function getPlacedItems() {
    return Array.from(placed.values()).map(entry => ({
      id: entry.data.id || entry.mesh.userData.colocId,
      position: [entry.mesh.position.x, entry.mesh.position.y, entry.mesh.position.z],
      rotation: [entry.mesh.rotation.x, entry.mesh.rotation.y, entry.mesh.rotation.z],
      scale: [entry.mesh.userData._size.x, entry.mesh.userData._size.y, entry.mesh.userData._size.z],
      tipo: entry.data.tipo || entry.data.meta?.tipo || "caixa",
      meta: entry.data.meta || entry.data
    }));
  }

  function getBauState() {
    if (!bauInnerBox) return null;
    return {
      L: cmToM(mToCm(bauInnerBox.max.x)),
      H: cmToM(mToCm(bauInnerBox.max.y)),
      W: cmToM(mToCm(bauInnerBox.max.z))
    };
  }

  function createTextSprite(message) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const fontSize = 64;
    ctx.font = `bold ${fontSize}px Arial`;
    const textWidth = ctx.measureText(message).width;
    canvas.width = textWidth + 20;
    canvas.height = fontSize + 20;

    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    const scale = 1.0;
    sprite.scale.set(scale * (canvas.width / canvas.height), scale, 1);

    return sprite;
  }

  _engineAPI = api;

  return api;
}

/* -----------------------
 Module-level wrappers
 These allow importing functions directly:
      import { initFullLoadEngine, clearScene, setBauDimensions, setGhostObject, addMercadoriaAuto, captureSnapshot } from "./fullLoadEngine";
------------------------*/
export function clearScene() {
  if (!_engineAPI) {
    console.warn("clearScene: engine not initialized");
    return;
  }
  _engineAPI.clearScene();
}

export function captureSnapshot(view) {
  if (!_engineAPI) {
    console.warn("captureSnapshot: engine not initialized");
    return null;
  }
  return _engineAPI.captureSnapshot(view);
}

export function setBauDimensions(Lcm, Hcm, Wcm, id = null) {
  if (!_engineAPI) {
    console.warn("setBauDimensions: engine not initialized");
    return;
  }
  if (typeof _engineAPI.setBau === "function") {
    const toMeters = (v) => {
      if (v == null) return 0;
      const n = Number(v);
      if (n > 10) return cmToM(n);
      return n;
    };
    const L = toMeters(Lcm), H = toMeters(Hcm), W = toMeters(Wcm);
    const truck = { tamanhoBau: { L: L * 100, W: W * 100, H: H * 100 } };
    _engineAPI.setBau(truck);
  }
}

export function setGhostObject(merc) {
  if (!_engineAPI) {
    console.warn("setGhostObject: engine not initialized");
    return;
  }
  _engineAPI.setGhostMeta(merc);
}

/**
 * addMercadoriaAuto wrapper: returns placed result array (ids & positions)
 */
export function addMercadoriaAuto(mercadoria, quantidade = 1) {
  if (!_engineAPI) {
    console.warn("addMercadoriaAuto: engine not initialized");
    return [];
  }
  return _engineAPI.addMercadoriaAuto(mercadoria, quantidade);
}

export function getPlacedItems() {
  if (!_engineAPI) return [];
  return _engineAPI.getPlacedItems();
}

export function getBauState() {
  if (!_engineAPI) return null;
  return _engineAPI.getBauState();
}

export function setItems(items) {
  if (!_engineAPI) {
    console.warn("setItems: engine not initialized");
    return;
  }
  _engineAPI.setItems(items);
}

export function optimizeLoad() {
  if (!_engineAPI) {
    console.warn("optimizeLoad: engine not initialized");
    return;
  }
  _engineAPI.optimizeLoad();
}
