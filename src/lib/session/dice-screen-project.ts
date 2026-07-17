import * as THREE from "three";

/** Gleiche Kamera wie DiceRollCanvas — Sync über dropNx/dropNy. */
export const DICE_CAMERA = {
  position: [0, 4.1, 5.6] as const,
  fov: 40,
  near: 0.1,
  far: 100,
};

const _cam = new THREE.PerspectiveCamera();
const _ndc = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _target = new THREE.Vector3();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * Viewport-Norm (0…1) → Schnittpunkt Strahl × Tisch-Ebene Y=0.
 */
export function dropNormToTablePoint(
  dropNx: number,
  dropNy: number,
  aspect = 16 / 9,
): { x: number; z: number } {
  const nx = Math.min(1, Math.max(0, dropNx)) * 2 - 1;
  const ny = -(Math.min(1, Math.max(0, dropNy)) * 2 - 1);

  _cam.position.set(
    DICE_CAMERA.position[0],
    DICE_CAMERA.position[1],
    DICE_CAMERA.position[2],
  );
  _cam.fov = DICE_CAMERA.fov;
  _cam.near = DICE_CAMERA.near;
  _cam.far = DICE_CAMERA.far;
  _cam.aspect = Math.max(0.35, aspect);
  _cam.lookAt(0, 0.35, 0);
  _cam.updateProjectionMatrix();
  _cam.updateMatrixWorld(true);

  _ndc.set(nx, ny, 0.5);
  _ndc.unproject(_cam);
  _origin.copy(_cam.position);
  _dir.copy(_ndc).sub(_origin).normalize();

  const ray = new THREE.Ray(_origin, _dir);
  const hit = ray.intersectPlane(_plane, _target);
  if (!hit) {
    return { x: nx * 2.2, z: -ny * 1.6 };
  }

  // Soft clamp in sichtbaren Tischbereich
  const x = THREE.MathUtils.clamp(hit.x, -3.2, 3.2);
  const z = THREE.MathUtils.clamp(hit.z, -2.4, 2.4);
  return { x, z };
}

export function clientToDropNorm(
  clientX: number,
  clientY: number,
  width = typeof window !== "undefined" ? window.innerWidth : 1,
  height = typeof window !== "undefined" ? window.innerHeight : 1,
): { dropNx: number; dropNy: number } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  return {
    dropNx: Math.min(1, Math.max(0, clientX / w)),
    dropNy: Math.min(1, Math.max(0, clientY / h)),
  };
}
