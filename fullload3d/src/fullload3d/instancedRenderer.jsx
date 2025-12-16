import * as THREE from "three";
import {
    createBoxMesh,
    createCylinderMesh,
    createTireMesh,
    getMaterial,
    cmToM
} from "./fullLoadUtils";

/*
  InstancedRenderer.js
  --------------------
  Responsible for rendering large numbers of items using THREE.InstancedMesh.
  This allows 1000+ items to be drawn in a single draw call per geometry type.
*/

export class InstancedRenderer {
    constructor(scene) {
        this.scene = scene;
        this.meshes = {}; // { "box": InstancedMesh, "cylinder": InstancedMesh, "tire": InstancedMesh }
        this.capacity = 5000; // Max items per type (can be resized dynamically if needed)
        this.dummy = new THREE.Object3D();
        this.color = new THREE.Color();

        // Shared Geometries (Lazy loaded or passed from utils)
        // We recreate them here to ensure we have pure geometries for instancing
        this.geometries = {
            box: new THREE.BoxGeometry(1, 1, 1),
            cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
            tire: new THREE.CylinderGeometry(0.5, 0.5, 1, 8)
        };
        this.geometries.tire.rotateZ(Math.PI / 2); // Rotate tire geometry once

        // Materials
        // We use a white base material and vertex colors for instances
        this.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.1,
        });
    }

    // Initialize or Reset the buffers
    init() {
        this.cleanup();

        // Create InstancedMesh for each type
        this.meshes.box = this._createInstancedMesh(this.geometries.box, "box");
        this.meshes.cylinder = this._createInstancedMesh(this.geometries.cylinder, "cylinder");
        this.meshes.tire = this._createInstancedMesh(this.geometries.tire, "tire");

        // Add to scene
        this.scene.add(this.meshes.box);
        this.scene.add(this.meshes.cylinder);
        this.scene.add(this.meshes.tire);
    }

    _createInstancedMesh(geometry, name) {
        const mesh = new THREE.InstancedMesh(geometry, this.material, this.capacity);
        mesh.name = `instanced_${name}`;
        mesh.count = 0; // Start empty
        mesh.castShadow = false; // Performance
        mesh.receiveShadow = true;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        return mesh;
    }

    // Update visual state from data
    // items: Array of { position: [x,y,z], rotation: [x,y,z], scale: [x,y,z], type: "box"|"cylinder"|"tire", color: "#hex" }
    update(items) {
        // Reset counts
        let boxCount = 0;
        let cylCount = 0;
        let tireCount = 0;

        const boxMesh = this.meshes.box;
        const cylMesh = this.meshes.cylinder;
        const tireMesh = this.meshes.tire;

        for (const item of items) {
            const type = item.type || item.meta?.tipo || "caixa";

            let targetMesh;
            let index;

            if (type === "cilindrico") {
                targetMesh = cylMesh;
                index = cylCount++;
            } else if (type === "pneu") {
                targetMesh = tireMesh;
                index = tireCount++;
            } else {
                targetMesh = boxMesh;
                index = boxCount++;
            }

            if (index >= this.capacity) continue; // Safety cap

            // Update Transform
            this.dummy.position.set(item.position[0], item.position[1], item.position[2]);

            if (item.rotation) {
                this.dummy.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
            } else {
                this.dummy.rotation.set(0, 0, 0);
            }

            if (item.scale) {
                this.dummy.scale.set(item.scale[0], item.scale[1], item.scale[2]);
            } else if (item.userData?._size) {
                // Fallback if data structure differs
                const s = item.userData._size;
                this.dummy.scale.set(s.x, s.y, s.z);
            } else if (item.meta?.L) {
                // Fallback raw meta (should not happen if mapped correctly)
                this.dummy.scale.set(cmToM(item.meta.L), cmToM(item.meta.H), cmToM(item.meta.W));
            }


            this.dummy.updateMatrix();
            targetMesh.setMatrixAt(index, this.dummy.matrix);

            // Update Color
            const colorHex = item.color || item.meta?.cor || item.meta?.color || "#ff7a18";
            this.color.set(colorHex);
            targetMesh.setColorAt(index, this.color);
        }

        // Update counts and notify GPU
        boxMesh.count = boxCount;
        boxMesh.instanceMatrix.needsUpdate = true;
        if (boxMesh.instanceColor) boxMesh.instanceColor.needsUpdate = true;

        cylMesh.count = cylCount;
        cylMesh.instanceMatrix.needsUpdate = true;
        if (cylMesh.instanceColor) cylMesh.instanceColor.needsUpdate = true;

        tireMesh.count = tireCount;
        tireMesh.instanceMatrix.needsUpdate = true;
        if (tireMesh.instanceColor) tireMesh.instanceColor.needsUpdate = true;
    }

    // Clean up
    cleanup() {
        if (this.meshes.box) {
            this.scene.remove(this.meshes.box);
            this.meshes.box.dispose();
            this.meshes.box = null;
        }
        if (this.meshes.cylinder) {
            this.scene.remove(this.meshes.cylinder);
            this.meshes.cylinder.dispose();
            this.meshes.cylinder = null;
        }
        if (this.meshes.tire) {
            this.scene.remove(this.meshes.tire);
            this.meshes.tire.dispose();
            this.meshes.tire = null;
        }
    }
}
