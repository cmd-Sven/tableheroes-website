import * as THREE from "three";
import { arcSpan, polarToImage, wedgeAnchor } from "../aurenfurt-layout";

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

function pushSurface(positions: number[], u: number, v: number, lift: number) {
  const point = surfacePoint(u, v);
  positions.push(point.x, point.y + lift, point.z);
}

/** Leicht angehobenes Ringsegment auf der Kuppel, für Klicks auf ein Viertel. */
export function createDistrictGeometry(start: number, end: number, inner: number, outer: number) {
  const span = arcSpan(start, end);
  const steps = Math.max(10, Math.round(span / 7));
  const positions: number[] = [];
  const indices: number[] = [];
  const lift = 0.045;

  if (inner <= 0.001) {
    const center = polarToImage(0, 0);
    pushSurface(positions, center.u, center.v, lift);
    for (let i = 0; i <= steps; i += 1) {
      const angle = start + (span * i) / steps;
      const edge = polarToImage(angle, outer);
      pushSurface(positions, edge.u, edge.v, lift);
    }
    for (let i = 1; i <= steps; i += 1) {
      indices.push(0, i, i + 1);
    }
  } else {
    for (let i = 0; i <= steps; i += 1) {
      const angle = start + (span * i) / steps;
      const innerPoint = polarToImage(angle, inner);
      const outerPoint = polarToImage(angle, outer);
      pushSurface(positions, innerPoint.u, innerPoint.v, lift);
      pushSurface(positions, outerPoint.u, outerPoint.v, lift);
    }
    for (let i = 0; i < steps; i += 1) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function districtAnchor(start: number, end: number, inner: number, outer: number) {
  const { u, v } = wedgeAnchor(start, end, inner, outer);
  return surfacePoint(u, v);
}
