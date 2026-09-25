import * as THREE from "three";

/** Aufsicht public/images/cities/aurenfurt.jpg, aus Aurenfurt.png 1697×927. */
const IMAGE_ASPECT = 927 / 1697;

export const DIORAMA_WIDTH = 8.8;
export const DIORAMA_DEPTH = DIORAMA_WIDTH * IMAGE_ASPECT;
export const DOME_HEIGHT = 0.48;
export const PLINTH_HEIGHT = 0.36;

/** Bildkoordinate (Ursprung oben links) auf die gewölbte Tafelfläche. */
export function surfacePoint(u: number, v: number) {
  const x = (u - 0.5) * DIORAMA_WIDTH;
  const z = (v - 0.5) * DIORAMA_DEPTH;
  const nx = x / (DIORAMA_WIDTH / 2);
  const nz = z / (DIORAMA_DEPTH / 2);
  const y = DOME_HEIGHT * (1 - nx * nx) * (1 - nz * nz);
  return new THREE.Vector3(x, y, z);
}

export function createDomedCityGeometry() {
  const geo = new THREE.PlaneGeometry(DIORAMA_WIDTH, DIORAMA_DEPTH, 80, 48);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const nx = x / (DIORAMA_WIDTH / 2);
    const nz = z / (DIORAMA_DEPTH / 2);
    pos.setY(i, DOME_HEIGHT * (1 - nx * nx) * (1 - nz * nz));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
