import * as THREE from "three";

/**
 * Orthographic Top-Down-Kamera — Blick senkrecht auf die Tisch-Ebene (Y=0).
 * Keine Perspektiv-/Tiefenwahrnehmung; Würfel bewegen sich nur in XZ.
 */
export const DICE_CAMERA = {
  position: [0, 10, 0] as const,
  /** Half-height der Ortho-Frustum (Welt-Einheiten). */
  orthoHalfH: 3.35,
  near: 0.1,
  far: 40,
  lookAt: [0, 0, 0] as const,
};

const _cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
const _ndc = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _target = new THREE.Vector3();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function configureOrthoCam(aspect: number): THREE.OrthographicCamera {
  const halfH = DICE_CAMERA.orthoHalfH;
  const halfW = halfH * Math.max(0.35, aspect);
  _cam.left = -halfW;
  _cam.right = halfW;
  _cam.top = halfH;
  _cam.bottom = -halfH;
  _cam.near = DICE_CAMERA.near;
  _cam.far = DICE_CAMERA.far;
  _cam.position.set(
    DICE_CAMERA.position[0],
    DICE_CAMERA.position[1],
    DICE_CAMERA.position[2],
  );
  _cam.up.set(0, 0, -1);
  _cam.lookAt(
    DICE_CAMERA.lookAt[0],
    DICE_CAMERA.lookAt[1],
    DICE_CAMERA.lookAt[2],
  );
  _cam.updateProjectionMatrix();
  _cam.updateMatrixWorld(true);
  return _cam;
}

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

  const cam = configureOrthoCam(aspect);

  _ndc.set(nx, ny, 0);
  _ndc.unproject(cam);
  _origin.copy(cam.position);
  _dir.set(0, -1, 0);

  // Ortho top-down: unproject liefert bereits Punkt auf Near-Plane; XZ = Drop
  const x = THREE.MathUtils.clamp(_ndc.x, -3.2, 3.2);
  const z = THREE.MathUtils.clamp(_ndc.z, -2.4, 2.4);

  // Fallback-Ray falls Near-Plane nicht flach (sollte bei Ortho nicht nötig sein)
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    const ray = new THREE.Ray(_origin, _dir);
    const hit = ray.intersectPlane(_plane, _target);
    if (!hit) return { x: nx * 2.2, z: -ny * 1.6 };
    return {
      x: THREE.MathUtils.clamp(hit.x, -3.2, 3.2),
      z: THREE.MathUtils.clamp(hit.z, -2.4, 2.4),
    };
  }

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
