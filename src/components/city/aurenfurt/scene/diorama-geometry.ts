import * as THREE from "three";
import type { UvPoint } from "../aurenfurt-district-polygons";
import { arcSpan, polarToImage, wedgeAnchor } from "../aurenfurt-layout";

/** Aufsicht public/images/cities/aurenfurt.jpg, 1697×927. */
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

/** Hit-Mesh und sichtbares Overlay aus dem editierbaren UV-Polygon. */
export function createPolygonDistrictGeometry(points: UvPoint[]) {
  if (points.length < 3) {
    return new THREE.BufferGeometry();
  }

  const lift = 0.045;
  const positions: number[] = [];
  for (const point of points) {
    pushSurface(positions, point.u, point.v, lift);
  }

  const contour = points.map((point) => new THREE.Vector2(point.u, point.v));
  const faces = THREE.ShapeUtils.triangulateShape(contour, []);
  const indices: number[] = [];
  for (const face of faces) {
    indices.push(face[0], face[1], face[2]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function polygonAnchor(points: UvPoint[]) {
  if (points.length === 0) return surfacePoint(0.5, 0.5);
  let u = 0;
  let v = 0;
  for (const point of points) {
    u += point.u;
    v += point.v;
  }
  return surfacePoint(u / points.length, v / points.length);
}
