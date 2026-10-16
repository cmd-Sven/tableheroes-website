import type { BufferGeometry, Material, Mesh, Object3D } from "three";

function materialsOf(mesh: Mesh): Material[] {
  if (!mesh.material) return [];
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/**
 * scene.clone(true) teilt Geometrie und Material mit dem GLTF-Cache.
 * Nur Kopien, die der Klon selbst besitzt, werden freigegeben — sonst stirbt das nächste Gebäude.
 */
export function disposeCloneKeepSource(clone: Object3D, source: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  source.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry) geometries.add(mesh.geometry);
    for (const material of materialsOf(mesh)) materials.add(material);
  });

  clone.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry && !geometries.has(mesh.geometry)) mesh.geometry.dispose();
    for (const material of materialsOf(mesh)) {
      if (!materials.has(material)) material.dispose();
    }
  });
}
