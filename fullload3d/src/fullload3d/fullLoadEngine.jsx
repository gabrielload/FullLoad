// src/fullLoad3d/fullLoadEngine.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  cmToM,
  round2,
  snap,
  clampInsideBau,
  createBoxMesh,
  createTireMesh,
  createCylinderMesh,
  makeAABBForSizeAt,
  aabbIntersect,
  aabbIsOnTop,
} from "./fullLoadUtils";

/**
 * Module-level engine pointer so we can export simple wrapper functions
 * that FullLoad3D.jsx expects (clearScene, setBauDimensions, setGhostObject, addMercadoriaAuto).
 */
let _engineAPI = null;

/**
 * initFullLoadEngine(opts)
 * opts:
 *   - mount: DOM element (required) — can be a <canvas> or a container (div)
 *   - bau: initial bau object (optional)
 *   - mercadorias: array (optional)
 *   - empresaId: optional
 *
 * returns engine API
 */
export function initFullLoadEngine(opts = {}) {
  // accept either initFullLoadEngine(canvasElement) or initFullLoadEngine({ mount: element, ... })
  const { mount, bau: initialBau = null, mercadorias = [], empresaId = null } =
    typeof opts === "object" && opts.mount ? opts : { mount: opts };

  if (!mount) throw new Error("initFullLoadEngine: mount element required");

  // If already initialized, return existing API (prevents double init in StrictMode)
  if (_engineAPI) {
    console.warn("FullLoad Engine já inicializado — retornando instância existente.");
    return _engineAPI;
  }

  console.log("initFullLoadEngine: mount =>", mount);

  // --- three core ---
  const scene = new THREE.Scene();
  // neutral background so failures are visible during dev
  scene.background = new THREE.Color(0xf7f7f7);

  // Decide whether mount is an existing canvas
  const isCanvas = typeof mount.tagName === "string" && mount.tagName.toLowerCase() === "canvas";

  // Create renderer: if a canvas was provided, attach renderer to it; otherwise create and append
  const rendererOptions = { antialias: true };
  if (isCanvas) rendererOptions.canvas = mount;

  const renderer = new THREE.WebGLRenderer(rendererOptions);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  // clear color fallback (avoid black if something fails)
  renderer.setClearColor(0xf7f7f7);

  // Ensure the renderer canvas has a sensible size
  const safeWidth = (mount.clientWidth && mount.clientWidth > 0) ? mount.clientWidth : 800;
  const safeHeight = (mount.clientHeight && mount.clientHeight > 0) ? mount.clientHeight : 600;
  renderer.setSize(safeWidth, safeHeight, false);

  // Append renderer.domElement only if mount is not a canvas and the element wasn't appended before
  try {
    if (!isCanvas && mount.appendChild && !Array.from(mount.children).includes(renderer.domElement)) {
      mount.appendChild(renderer.domElement);
    }
  } catch (err) {
    console.warn("Could not append renderer.domElement to mount:", err);
  }

  console.log("Renderer appended. canvas size:", renderer.domElement.width, renderer.domElement.height);

  const camera = new THREE.PerspectiveCamera(50, safeWidth / safeHeight, 0.01, 2000);
  camera.position.set(3, 2, 4);
  camera.lookAt(0, 0.5, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(6, 10, 6);
  dir.castShadow = true;
  scene.add(dir);

  // floor & grid
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.001;
  floor.receiveShadow = true;
  scene.add(floor);

  // const grid = new THREE.GridHelper(200, 200, 0xdddddd, 0xeeeeee);
  // grid.material.opacity = 0.6;
  // grid.material.transparent = true;
  // scene.add(grid);

  // state
  let bauGroup = null;
  let bauInnerBox = null; // { min:{x,y,z}, max:{x,y,z} } in meters
  const placed = new Map(); // id -> { mesh, data, aabb }
  const ghost = new THREE.Object3D();
  ghost.name = "ghost";
  ghost.visible = false;
  scene.add(ghost);

  // raycaster for interactions
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // animation loop
  let rafId = null;
  let running = true;
  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    try {
      controls.update();
      renderer.render(scene, camera);
    } catch (err) {
      // If context lost or other fatal error happens, log once and stop updating to avoid spam
      console.error("Render loop error:", err);
    }
  }
  animate();

  // handle canvas/webgl context lost/restored
  function onContextLost(event) {
    event.preventDefault();
    console.warn("WebGL context lost");
    running = false;
  }
  function onContextRestored() {
    console.info("WebGL context restored");
    // re-enable loop (renderer and GL state should be restored by browser)
    running = true;
    animate();
  }
  renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);
  renderer.domElement.addEventListener("webglcontextrestored", onContextRestored, false);

  // resize
  function onResize() {
    try {
      const w = mount.clientWidth || renderer.domElement.width || safeWidth;
      const h = mount.clientHeight || renderer.domElement.height || safeHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    } catch (err) {
      // ignore if mount not sized yet or removed
    }
  }
  window.addEventListener("resize", onResize);

  // helper: compute AABBs of other placed items
  function getOthersAABBs() {
    return Array.from(placed.values()).map((p) => p.aabb);
  }

  // collision solver (simple lateral bump)
  function resolveCollisionCandidate(candidateBox, othersAABBs, bauBox, opts = {}) {
    const maxAttempts = opts.maxAttempts || 12;
    const step = opts.pushStep || 0.03;

    const collideAny = (box) => othersAABBs.some((o) => aabbIntersect(box, o));
    if (!collideAny(candidateBox)) {
      return {
        ok: true,
        pos: {
          x: (candidateBox.min.x + candidateBox.max.x) / 2,
          y: (candidateBox.min.y + candidateBox.max.y) / 2,
          z: (candidateBox.min.z + candidateBox.max.z) / 2,
        },
      };
    }

    const originCenter = new THREE.Vector3(
      (candidateBox.min.x + candidateBox.max.x) / 2,
      (candidateBox.min.y + candidateBox.max.y) / 2,
      (candidateBox.min.z + candidateBox.max.z) / 2
    );
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 1).normalize(),
      new THREE.Vector3(-1, 0, 1).normalize(),
      new THREE.Vector3(1, 0, -1).normalize(),
      new THREE.Vector3(-1, 0, -1).normalize(),
    ];

    for (let r = 1; r <= maxAttempts; r++) {
      for (const dir of directions) {
        const dx = dir.x * step * r;
        const dz = dir.z * step * r;
        const center = new THREE.Vector3(originCenter.x + dx, originCenter.y, originCenter.z + dz);

        const box = new THREE.Box3(
          new THREE.Vector3(center.x + (candidateBox.min.x - originCenter.x), candidateBox.min.y, center.z + (candidateBox.min.z - originCenter.z)),
          new THREE.Vector3(center.x + (candidateBox.max.x - originCenter.x), candidateBox.max.y, center.z + (candidateBox.max.z - originCenter.z))
        );

        // ensure inside bau
        if (!bauBox) continue;
        if (box.min.x < bauBox.min.x || box.max.x > bauBox.max.x || box.min.z < bauBox.min.z || box.max.z > bauBox.max.z) continue;
        if (!collideAny(box)) {
          return {
            ok: true,
            pos: { x: (box.min.x + box.max.x) / 2, y: (box.min.y + box.max.y) / 2, z: (box.min.z + box.max.z) / 2 },
          };
        }
      }
    }
    return { ok: false };
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

      const step = 0.05;
      const gx = snap(p.x, step);
      const gz = snap(p.z, step);

      const ghostMesh = ghost.children[0];
      if (!ghostMesh) return;
      const h = ghostMesh.userData._size.y;
      const gy = round2(h / 2);
      const clamped = clampInsideBau({ x: gx, y: gy, z: gz }, ghostMesh.userData._size, bauInnerBox);
      ghost.position.set(clamped.x, clamped.y, clamped.z);
    } catch (err) {
      // swallow pointer move exceptions to avoid breaking loop
      console.error("onPointerMove error:", err);
    }
  }
  renderer.domElement.addEventListener("pointermove", onPointerMove);

  // pointer down -> select placed mesh if any
  function onPointerDown(e) {
    try {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const meshes = Array.from(placed.values()).map((p) => p.mesh);
      if (!meshes.length) {
        clearHighlight();
        return;
      }
      const ints = raycaster.intersectObjects(meshes, true);
      if (ints.length) {
        let root = ints[0].object;
        while (root && !root.userData?.colocId) root = root.parent;
        if (!root) {
          clearHighlight();
          return;
        }
        highlightSelect(root);
      } else {
        clearHighlight();
      }
    } catch (err) {
      console.error("onPointerDown error:", err);
    }
  }
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  // double click => place ghost (emit event)
  async function onDblClick() {
    if (!ghost.visible) return;
    const ghostMesh = ghost.children[0];
    if (!ghostMesh) return;
    const pos = ghost.position.clone();
    const meta = ghostMesh.userData._meta || ghostMesh.userData.meta || {};
    window.dispatchEvent(new CustomEvent("fullLoad_enginePlacement", { detail: { pos, meta } }));
  }
  renderer.domElement.addEventListener("dblclick", onDblClick);

  // keyboard shortcuts
  function onKeyDown(e) {
    // if (e.key === "g" || e.key === "G") grid.visible = !grid.visible;
    if (e.key === "Delete" || e.key === "Backspace") {
      if (!selectedId) return;
      window.dispatchEvent(new CustomEvent("fullLoad_remove", { detail: { colocId: selectedId } }));
    }
  }
  window.addEventListener("keydown", onKeyDown);

  // window events: placeManual (from left sidebar) -> set ghost meta + show instruction
  function onPlaceManual(e) {
    const d = e.detail || {};
    const mercId = d.mercadoriaId;
    const qty = Number(d.quantidade || 1);
    if (!mercId) return;
    const m = mercadorias.find((x) => x.id === mercId);
    if (!m) {
      console.warn("placeManual: mercadoria not found in engine list");
      return;
    }
    setGhostMeta(m);
    // use non-blocking UI pattern where possible; keep alert for dev
    try { alert("Mova o fantasma com o mouse e dê duplo-clique para colocar."); } catch { }
  }
  window.addEventListener("fullLoad_placeManual", onPlaceManual);

  // allow external removal event to clear highlight and remove mesh
  function onExternalRemove(e) {
    const { colocId } = e.detail || {};
    if (!colocId) return;
    const entry = placed.get(colocId);
    if (entry) {
      try { scene.remove(entry.mesh); } catch { }
      placed.delete(colocId);
    }
    if (selectedId === colocId) selectedId = null;
  }
  window.addEventListener("fullLoad_removedExternamente", onExternalRemove);

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
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.2 });
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
    const edges = new THREE.EdgesGeometry(innerGeo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x333333 }));
    line.position.copy(inner.position);
    bauGroup.add(line);

    // invisible plane for raycasting (name important)
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshBasicMaterial({ visible: false }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(L / 2, 0.001, W / 2);
    plane.name = "bau_ground_plane";
    bauGroup.add(plane);

    // add group and set bauInnerBox coords
    bauGroup.position.set(0, 0, 0);
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
          mesh = createBoxMesh([sx, sy, sz], data.meta?.color || "#ff7a18");
          mesh.userData._size = { x: sx, y: sy, z: sz };
        }

        mesh.position.set(data.position[0], data.position[1], data.position[2]);
        if (data.rotation) mesh.rotation.set((data.rotation || [0, 0, 0])[0], (data.rotation || [0, 0, 0])[1], (data.rotation || [0, 0, 0])[2]);

        mesh.userData.colocId = id;
        mesh.userData.meta = data.meta || {};
        const aabb = makeAABBForSizeAt(mesh.userData._size, mesh.position);

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
      // const tube = cmToM(merc.comprimento || merc.L || 30);
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
      const mesh = createBoxMesh([sx, sy, sz], merc.color || "#00a");
      mesh.material = mesh.material.clone();
      mesh.material.transparent = true;
      mesh.material.opacity = 0.25;
      mesh.userData._size = { x: sx, y: sy, z: sz };
      mesh.userData._meta = merc;
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
    camera.position.set(Math.max(2, L * 1.2), Math.max(1.6, H * 0.8), Math.max(2, W * 1.2));
    controls.target.set(L / 2, H / 2, W / 2);
    controls.update();
  }

  function destroy() {
    // stop loop
    running = false;
    try { cancelAnimationFrame(rafId); } catch { }

    // remove global listeners
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

    // remove meshes
    try {
      for (const [k, v] of Array.from(placed.entries())) {
        try { scene.remove(v.mesh); } catch { }
        placed.delete(k);
      }
      // remove bau and ghost
      try { if (bauGroup) scene.remove(bauGroup); } catch { }
      try { scene.remove(ghost); } catch { }
    } catch (err) { }

    // dispose renderer and attempt to remove canvas only if we appended it
    try {
      renderer.dispose();
    } catch (err) { }

    if (!isCanvas) {
      try {
        if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      } catch (err) { }
    }

    // clear module pointer
    if (_engineAPI && _engineAPI.destroy === destroy) {
      _engineAPI = null;
    }
  }

  // initialize with provided bau if given
  if (initialBau) setBau(initialBau);

  // ===============================
  // AUTO‑ADD MERCADORIA (auto placement)
  // ===============================
  function addMercadoriaAuto(mercadoria, quantidade = 1) {
    if (!bauInnerBox) {
      console.warn("addMercadoriaAuto: bau ainda não foi definido.");
      return [];
    }

    const placedResults = [];

    // Sort items by volume (descending) for better packing?
    // For now, we process them in the order requested, or we can just iterate.
    // The user might want "add 10 of this".

    // We need to know what is ALREADY placed in the scene to avoid collisions.
    // We'll maintain a local list of AABBs including the ones we just added in this loop.
    const existingAABBs = getOthersAABBs();

    for (let i = 0; i < quantidade; i++) {
      const colocId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `auto_${Date.now()}_${i}`;

      // --- create size in meters ---
      const sx = cmToM(mercadoria.comprimento || mercadoria.L || 50);
      const sy = cmToM(mercadoria.altura || mercadoria.H || 50);
      const sz = cmToM(mercadoria.largura || mercadoria.W || 50);
      const size = { x: sx, y: sy, z: sz };

      // 3D Packing Heuristic
      // Candidates: (0,0,0) and corners of all existing items.
      // We want to minimize Z (back), then Y (bottom), then X (left).

      let bestPos = null;

      // Generate candidates
      const candidates = [];
      // Always try origin
      candidates.push({ x: sx / 2, y: sy / 2, z: sz / 2 });

      // Try relative to existing items
      for (const otherBox of existingAABBs) {
        // 1. Right of other
        candidates.push({
          x: otherBox.max.x + sx / 2,
          y: otherBox.min.y + sy / 2,
          z: (otherBox.min.z + otherBox.max.z) / 2 // Center Z of other? Or align min Z?
        });
        // Align min Z
        candidates.push({ x: otherBox.max.x + sx / 2, y: otherBox.min.y + sy / 2, z: otherBox.min.z + sz / 2 });

        // 2. In front of other (towards +Z? No, usually +Z is width in our coord system? 
        // Wait, let's check coords. 
        // L is X (length), W is Z (width), H is Y (height).
        // Usually "Back" of truck is X=0 or X=L? 
        // The camera looks at 0,0,0?
        // camera.position.set(3, 2, 4); lookAt(0, 0.5, 0);
        // setBau creates box from 0 to L.
        // Usually X=0 is the front wall (cab), X=L is the door? Or vice versa.
        // The code says "Front Wall (at x=L)". So X=0 is the back/open part?
        // Wait, "Front Wall (at x=L)" implies the cab is at L. So we load from 0?
        // Let's assume we load from X=0 (Back/Door) towards X=L (Cab).
        // OR we load from X=L (Cab) towards X=0 (Door).
        // Standard logic: Fill from Cab (L) to Door (0).
        // BUT the previous loop was: x from min.x (0) to max.x (L).
        // So it was filling from 0 upwards.
        // If X=L is the "Front Wall", then X=0 is the door.
        // We usually want to fill from the Front Wall (L) towards the Door (0).
        // BUT the previous code filled 0 -> L.
        // Let's stick to filling 0 -> L (assuming 0 is the "deep end" or just filling order).
        // If the user says "parelhados", they want tight packing.

        // Let's generate candidates at:
        // - Top of other
        candidates.push({ x: (otherBox.min.x + otherBox.max.x) / 2, y: otherBox.max.y + sy / 2, z: (otherBox.min.z + otherBox.max.z) / 2 });
        // Align min X, min Z on top
        candidates.push({ x: otherBox.min.x + sx / 2, y: otherBox.max.y + sy / 2, z: otherBox.min.z + sz / 2 });

        // - Front of other (X axis)
        candidates.push({ x: otherBox.max.x + sx / 2, y: otherBox.min.y + sy / 2, z: otherBox.min.z + sz / 2 });

        // - Side of other (Z axis)
        candidates.push({ x: otherBox.min.x + sx / 2, y: otherBox.min.y + sy / 2, z: otherBox.max.z + sz / 2 });
      }

      // Filter and Sort Candidates
      // Sort criteria: Min X (fill from 0), then Min Y (bottom), then Min Z.
      // Or Min Z, Min Y, Min X.
      // Let's prioritize filling the "floor" (Y=0) and "back" (X=0).
      // So sort by: Y asc, X asc, Z asc.

      candidates.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y; // Bottom first
        if (Math.abs(a.x - b.x) > 0.01) return a.x - b.x; // Back first (assuming 0 is back)
        return a.z - b.z; // Left to right
      });

      for (const pos of candidates) {
        const aabb = makeAABBForSizeAt(size, pos);

        // 1. Check bounds
        if (aabb.min.x < bauInnerBox.min.x - 0.001 || aabb.max.x > bauInnerBox.max.x + 0.001 ||
          aabb.min.y < bauInnerBox.min.y - 0.001 || aabb.max.y > bauInnerBox.max.y + 0.001 ||
          aabb.min.z < bauInnerBox.min.z - 0.001 || aabb.max.z > bauInnerBox.max.z + 0.001) {
          continue;
        }

        // 2. Check collisions
        const collide = existingAABBs.some(o => aabbIntersect(aabb, o));
        if (collide) continue;

        // 3. Check support (Gravity)
        // If y > 0 (approx), it must be on top of something.
        if (aabb.min.y > 0.01) {
          const supported = existingAABBs.some(o => aabbIsOnTop(aabb, o));
          if (!supported) continue;
        }

        // Found valid spot
        bestPos = pos;
        break;
      }

      if (bestPos) {
        // Place it
        let mesh;
        try {
          if ((mercadoria.tipo || mercadoria.meta?.tipo) === "cilindrico") {
            const outer = sx;
            mesh = createCylinderMesh({ diameter: outer, height: sy, color: mercadoria.color || "#333" });
            mesh.userData._size = { x: outer, y: sy, z: outer };
          } else {
            mesh = createBoxMesh([sx, sy, sz], mercadoria.color || "#ff7a18");
            mesh.userData._size = { x: sx, y: sy, z: sz };
          }

          mesh.position.set(bestPos.x, bestPos.y, bestPos.z);
          mesh.userData.colocId = colocId;
          mesh.userData.meta = mercadoria;

          const finalAABB = makeAABBForSizeAt(mesh.userData._size, mesh.position);

          scene.add(mesh);

          const entry = {
            mesh,
            data: {
              id: colocId,
              position: [bestPos.x, bestPos.y, bestPos.z],
              rotation: [0, 0, 0],
              scale: [sx, sy, sz],
              meta: mercadoria,
            },
            aabb: finalAABB,
          };

          placed.set(colocId, entry);
          existingAABBs.push(finalAABB); // Add to local collision list for next item in loop

          placedResults.push({ id: colocId, position: [bestPos.x, bestPos.y, bestPos.z], scale: [sx, sy, sz] });
        } catch (err) {
          console.error("Erro ao criar mesh em addMercadoriaAuto:", err);
        }
      } else {
        console.warn("❌ Não foi possível colocar mercadoria automaticamente — sem espaço ou suporte.");
      }
    }

    // return placed results so caller (React) can persist to Firestore if desired
    return placedResults;
  }

  // small helper to fully clear scene placements (keeps bau)
  function clearScene() {
    for (const [k, v] of Array.from(placed.entries())) {
      try { scene.remove(v.mesh); } catch { }
      placed.delete(k);
    }
    // hide ghost
    ghost.visible = false;
  }

  // wrappers that external code may want to call
  function setBauDimensions(Lcm, Hcm, Wcm, id = null) {
    // Menu sends L,H,W already in meters? In your Menu3D you sent L,H,W computed as /100;
    // We'll accept either meters or centimeters: heuristics: if > 10 assume cm; if <=10 assume meters.
    const toMeters = (v) => {
      if (v == null) return 0;
      const n = Number(v);
      if (n > 10) return cmToM(n); // treat as cm
      return n; // treat as meters
    };
    // note: order of inputs can be any; normalize+order so the largest becomes comprimento (L)
    const raw = { L: Lcm, W: Wcm, H: Hcm };
    // Also accept cases where user passed comprimento, largura, altura in any order: try to normalize
    const tbInput = {
      L: raw.L ?? Lcm,
      W: raw.W ?? Wcm,
      H: raw.H ?? Hcm
    };
    // convert to numeric cms (or meters depending on heuristic)
    const a = toMeters(tbInput.L) * 100; // back to cm (we call setBau expecting cm fields)
    const b = toMeters(tbInput.W) * 100;
    const c = toMeters(tbInput.H) * 100;
    // normalize and order using same helper logic (we'll reuse normalizeAndOrderBau by passing cms)
    const ordered = normalizeAndOrderBau({ L: a, W: b, H: c });
    setBau({
      tamanhoBau: { L: ordered.L, W: ordered.W, H: ordered.H },
      tamanhoBau_m: { L: cmToM(ordered.L), W: cmToM(ordered.W), H: cmToM(ordered.H) },
      id,
    });
  }

  function setGhostObject(merc) {
    setGhostMeta(merc);
  }

  // expose API for this engine instance
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
    resolveCollisionCandidate: (size, pos) => {
      const aabb = makeAABBForSizeAt(size, pos);
      const others = getOthersAABBs();
      return resolveCollisionCandidate(aabb, others, bauInnerBox);
    },
    addMercadoriaAuto,
    clearScene,
  };

  // store module-level pointer for wrapper exports
  _engineAPI = api;

  return api;
}

/* -----------------------
 Module-level wrappers
 These allow importing functions directly:
      import { initFullLoadEngine, clearScene, setBauDimensions, setGhostObject, addMercadoriaAuto } from "./fullLoadEngine";
------------------------*/
export function clearScene() {
  if (!_engineAPI) {
    console.warn("clearScene: engine not initialized");
    return;
  }
  _engineAPI.clearScene();
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
