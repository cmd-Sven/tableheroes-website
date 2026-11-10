import {
  FrontSide,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";

const PREPARED = "__aurenfurtLandmarkPrepared";

/**
 * Einmalige GPU-/CPU-Pflege nach dem GLTF-Load:
 * Frustum-Culling, keine Schatten, leichtere Materials.
 */
export function prepareLandmarkGltf(root: Object3D) {
  if (root.userData[PREPARED]) return;
  root.userData[PREPARED] = true;
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    if (mesh.geometry && !mesh.geometry.boundingSphere) {
      mesh.geometry.computeBoundingSphere();
    }
    const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      material.side = FrontSide;
      /* Distanz-Fog färbt Gebäude sonst unten hell / oben dunkel (Kamerawinkel). */
      material.fog = false;
      const standard = material as MeshStandardMaterial;
      if (typeof standard.envMapIntensity === "number") standard.envMapIntensity = 0;
      if ("flatShading" in standard) standard.flatShading = false;
      material.needsUpdate = true;
    }
  });
}
