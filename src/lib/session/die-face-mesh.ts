import * as THREE from "three";
import { dieColor, faceNormal } from "@/src/lib/session/dice-3d-math";

const textureCache = new Map<string, THREE.CanvasTexture>();

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _center = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _bitangent = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _match = new THREE.Vector3();

function textureKey(value: number, bg: string): string {
  return `face-v3:${value}:${bg}`;
}

/** Opake Face-Textur: volle Fläche in Würfelfarbe, zentrierte Zahl. */
export function getDieFaceTexture(value: number, bgColor: string): THREE.CanvasTexture {
  const key = textureKey(value, bgColor);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Leichter Rand / Facetten-Hint
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, size - 10, size - 10);

  const label = String(value);
  const fontPx = value >= 10 ? 112 : 140;
  ctx.font = `900 ${fontPx}px Arial Black, Impact, Arial Narrow, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  const cx = size / 2;
  const cy = size / 2 + 4;

  ctx.lineWidth = 20;
  ctx.strokeStyle = "#000000";
  ctx.strokeText(label, cx, cy);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, cx, cy);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

function createBlankTexture(bgColor: string): THREE.CanvasTexture {
  const key = `blank-v3:${bgColor}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

function createFaceMaterial(
  map: THREE.CanvasTexture,
  sides: number,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map,
    color: "#ffffff",
    metalness: 0.28,
    roughness: 0.32,
    emissive: sides === 20 ? "#3a3208" : "#0a1f10",
    emissiveIntensity: 0.28,
    depthTest: true,
    depthWrite: true,
    transparent: false,
    side: THREE.FrontSide,
  });
}

/** Beste Face-Nummer (1..sides) zur Geometrie-Normale; null wenn kein Treffer. */
function matchFaceValue(sides: number, normal: THREE.Vector3): number | null {
  let best = -1;
  let bestDot = -2;
  for (let v = 1; v <= sides; v++) {
    faceNormal(sides, v, _match);
    const d = _match.dot(normal);
    if (d > bestDot) {
      bestDot = d;
      best = v;
    }
  }
  if (bestDot < 0.82) return null;
  return best;
}

type FaceCluster = {
  value: number | null;
  triStarts: number[];
  vertexIndices: number[];
};

/**
 * Cluster Dreiecke nach Face-Normale; value aus Server-Face-Tabelle.
 * `triStarts` = Start-Vertex (non-indexed) bzw. Start-Index (indexed) je Dreieck.
 */
function clusterFaces(
  geometry: THREE.BufferGeometry,
  sides: number,
  indexed: boolean,
): FaceCluster[] {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const index = geometry.index;
  const triCount = indexed && index ? index.count / 3 : pos.count / 3;
  const clusters: FaceCluster[] = [];

  for (let t = 0; t < triCount; t++) {
    let ia: number;
    let ib: number;
    let ic: number;
    if (indexed && index) {
      ia = index.getX(t * 3);
      ib = index.getX(t * 3 + 1);
      ic = index.getX(t * 3 + 2);
    } else {
      ia = t * 3;
      ib = t * 3 + 1;
      ic = t * 3 + 2;
    }

    _a.fromBufferAttribute(pos, ia);
    _b.fromBufferAttribute(pos, ib);
    _c.fromBufferAttribute(pos, ic);
    _n.subVectors(_b, _a).cross(_delta.subVectors(_c, _a)).normalize();

    const value = matchFaceValue(sides, _n);
    let cluster = clusters.find((c) => c.value === value);
    if (!cluster) {
      cluster = { value, triStarts: [], vertexIndices: [] };
      clusters.push(cluster);
    }

    cluster.triStarts.push(indexed ? t * 3 : t * 3);
    cluster.vertexIndices.push(ia, ib, ic);
  }

  return clusters;
}

/** UV so, dass Face-Centroid → (0.5, 0.5) und Zahl mittig auf der Fläche liegt. */
function applyCenteredFaceUVs(
  position: THREE.BufferAttribute,
  uv: THREE.BufferAttribute,
  vertexIndices: number[],
): void {
  if (vertexIndices.length < 3) return;

  _a.fromBufferAttribute(position, vertexIndices[0]!);
  _b.fromBufferAttribute(position, vertexIndices[1]!);
  _c.fromBufferAttribute(position, vertexIndices[2]!);
  _n.subVectors(_b, _a).cross(_delta.subVectors(_c, _a)).normalize();

  _center.set(0, 0, 0);
  for (const vi of vertexIndices) {
    _center.add(_a.fromBufferAttribute(position, vi));
  }
  _center.multiplyScalar(1 / vertexIndices.length);

  if (Math.abs(_n.y) < 0.9) {
    _tangent.set(0, 1, 0).cross(_n).normalize();
  } else {
    _tangent.set(1, 0, 0).cross(_n).normalize();
  }
  _bitangent.copy(_n).cross(_tangent).normalize();

  const pts: { u: number; v: number }[] = [];
  let maxAbs = 0;
  for (const vi of vertexIndices) {
    _delta.fromBufferAttribute(position, vi).sub(_center);
    const u = _delta.dot(_tangent);
    const v = _delta.dot(_bitangent);
    pts.push({ u, v });
    maxAbs = Math.max(maxAbs, Math.abs(u), Math.abs(v));
  }

  const scale = maxAbs > 1e-8 ? 0.36 / maxAbs : 1;
  for (let i = 0; i < vertexIndices.length; i++) {
    const p = pts[i]!;
    uv.setXY(vertexIndices[i]!, 0.5 + p.u * scale, 0.5 + p.v * scale);
  }
}

function baseGeometry(sides: number): THREE.BufferGeometry {
  const s = Math.round(sides);
  if (s === 4) return new THREE.TetrahedronGeometry(1, 0);
  if (s === 6) return new THREE.BoxGeometry(1.15, 1.15, 1.15);
  if (s === 8) return new THREE.OctahedronGeometry(1, 0);
  if (s === 10) return new THREE.ConeGeometry(0.85, 1.35, 10);
  if (s === 12) return new THREE.DodecahedronGeometry(0.95, 0);
  return new THREE.IcosahedronGeometry(1, 0);
}

/**
 * d6: BoxGeometry-Gruppen (Three.js-Reihenfolge) → Face-Werte.
 * 0:+X→2, 1:-X→5, 2:+Y→1, 3:-Y→6, 4:+Z→3, 5:-Z→4
 */
const D6_GROUP_FACE = [2, 5, 1, 6, 3, 4] as const;

export type DieFaceMeshData = {
  geometry: THREE.BufferGeometry;
  materials: THREE.MeshStandardMaterial[];
};

/** Baut Multi-Material-Würfel mit opaken Face-Texturen (Zahlen zentriert per UV). */
export function buildDieFaceMesh(sides: number): DieFaceMeshData {
  const n = Math.max(2, Math.round(sides));
  const bg = dieColor(n);
  let geometry = baseGeometry(n);

  // Cone ist indexed + shared verts → non-indexed für saubere UVs/Gruppen
  if (n === 10 && geometry.index) {
    geometry = geometry.toNonIndexed();
  }

  const materials: THREE.MeshStandardMaterial[] = [];
  for (let v = 1; v <= n; v++) {
    materials.push(createFaceMaterial(getDieFaceTexture(v, bg), n));
  }
  const blankIndex = materials.length;
  materials.push(createFaceMaterial(createBlankTexture(bg), n));

  if (n === 6) {
    // Box hat bereits korrekte Gruppen + UVs
    geometry.clearGroups();
    // Standard Box: 6 Gruppen à 6 Indices (2 Tris)
    for (let g = 0; g < 6; g++) {
      const face = D6_GROUP_FACE[g]!;
      geometry.addGroup(g * 6, 6, face - 1);
    }
    return { geometry, materials };
  }

  // Polyhedra / Cone: neu clustern, UVs zentrieren, Gruppen setzen
  if (!geometry.attributes.uv) {
    const count = geometry.attributes.position.count;
    geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }

  const indexed = Boolean(geometry.index);
  const clusters = clusterFaces(geometry, n, indexed);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;

  geometry.clearGroups();

  if (indexed && geometry.index) {
    // Sollte bei uns nach Cone-toNonIndexed nicht vorkommen; Fallback
    for (const cluster of clusters) {
      const matIndex = cluster.value != null ? cluster.value - 1 : blankIndex;
      applyCenteredFaceUVs(pos, uv, cluster.vertexIndices);
      for (const start of cluster.triStarts) {
        geometry.addGroup(start, 3, matIndex);
      }
    }
  } else {
    // Non-indexed: aufeinanderfolgende Tris derselben Face zusammenfassen wo möglich
    for (const cluster of clusters) {
      const matIndex = cluster.value != null ? cluster.value - 1 : blankIndex;
      applyCenteredFaceUVs(pos, uv, cluster.vertexIndices);

      // Sortiere triStarts und merge contiguous ranges
      const starts = [...cluster.triStarts].sort((a, b) => a - b);
      let rangeStart = starts[0]!;
      let rangeCount = 3;
      for (let i = 1; i < starts.length; i++) {
        const s = starts[i]!;
        if (s === rangeStart + rangeCount) {
          rangeCount += 3;
        } else {
          geometry.addGroup(rangeStart, rangeCount, matIndex);
          rangeStart = s;
          rangeCount = 3;
        }
      }
      geometry.addGroup(rangeStart, rangeCount, matIndex);
    }
  }

  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  return { geometry, materials };
}

export function disposeDieFaceMesh(data: DieFaceMeshData): void {
  data.geometry.dispose();
  for (const m of data.materials) {
    // Texturen sind gecacht — nicht disposen
    m.dispose();
  }
}
