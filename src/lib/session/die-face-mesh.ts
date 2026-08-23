import * as THREE from "three";
import { faceNormal } from "@/src/lib/session/dice-3d-math";
import {
  getDiceSkin,
  type DiceSkinDef,
  type DiceSkinId,
  type DiceSkinPattern,
} from "@/src/lib/session/dice-skins";

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

function textureKey(
  value: number,
  bg: string,
  numeral: string,
  pattern: DiceSkinPattern,
): string {
  return `face-v5:${value}:${bg}:${numeral}:${pattern}`;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fillMarbleBackground(
  ctx: CanvasRenderingContext2D,
  size: number,
  seed: number,
): void {
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "#f4f4f1");
  g.addColorStop(0.35, "#d8d8d4");
  g.addColorStop(0.55, "#b8b8b4");
  g.addColorStop(0.75, "#eaeae6");
  g.addColorStop(1, "#cfcfca");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  let rng = seed || 1;
  const next = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 0xffffffff;
  };

  for (let i = 0; i < 8; i++) {
    const x0 = next() * size;
    const y0 = next() * size;
    const x1 = next() * size;
    const y1 = next() * size;
    const cpx = (x0 + x1) / 2 + (next() - 0.5) * size * 0.45;
    const cpy = (y0 + y1) / 2 + (next() - 0.5) * size * 0.45;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cpx, cpy, x1, y1);
    ctx.strokeStyle = `rgba(${70 + next() * 40},${70 + next() * 35},${75 + next() * 40},${0.22 + next() * 0.28})`;
    ctx.lineWidth = 2 + next() * 5;
    ctx.stroke();
  }

  // Soft haze patches instead of per-pixel noise (faster, no getImageData)
  for (let i = 0; i < 5; i++) {
    const rx = next() * size;
    const ry = next() * size;
    const rr = 18 + next() * 40;
    const haze = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
    haze.addColorStop(0, `rgba(255,255,255,${0.12 + next() * 0.18})`);
    haze.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
  }
}

/** Opake Face-Textur: Skin-Hintergrund + Augenzahl. */
export function getDieFaceTexture(
  value: number,
  bgColor: string,
  numeralColor = "#ffffff",
  pattern: DiceSkinPattern = "solid",
): THREE.CanvasTexture {
  const key = textureKey(value, bgColor, numeralColor, pattern);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const pad = 36;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Extrem selten — solide Fallback-Textur ohne 2D-Context.
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    textureCache.set(key, tex);
    return tex;
  }

  if (pattern === "marble") {
    try {
      fillMarbleBackground(ctx, size, hashSeed(`marble:${value}:${bgColor}`));
    } catch {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    }
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
  }

  // Leichter Rand / Facetten-Hint
  ctx.strokeStyle = pattern === "marble" ? "rgba(40,40,40,0.28)" : "rgba(0,0,0,0.35)";
  ctx.lineWidth = 8;
  ctx.strokeRect(pad * 0.35, pad * 0.35, size - pad * 0.7, size - pad * 0.7);

  const label = String(value);
  const fontPx = value >= 10 ? 54 : 68;
  ctx.font = `800 ${fontPx}px Arial Black, Impact, Arial Narrow, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  const cx = size / 2;
  const cy = size / 2 + 2;

  const stroke =
    numeralColor === "#ffffff" || numeralColor.toLowerCase() === "#fff"
      ? "#000000"
      : "rgba(0,0,0,0.55)";
  ctx.lineWidth = 10;
  ctx.strokeStyle = stroke;
  ctx.strokeText(label, cx, cy);

  ctx.fillStyle = numeralColor;
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

function createBlankTexture(
  bgColor: string,
  pattern: DiceSkinPattern,
): THREE.CanvasTexture {
  const key = `blank-v5:${bgColor}:${pattern}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    if (pattern === "marble") {
      try {
        fillMarbleBackground(ctx, 64, hashSeed(`blank:${bgColor}`));
      } catch {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 64, 64);
      }
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 64, 64);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}

function createFaceMaterial(
  map: THREE.CanvasTexture,
  sides: number,
  pattern: DiceSkinPattern,
): THREE.MeshStandardMaterial {
  const marble = pattern === "marble";
  return new THREE.MeshStandardMaterial({
    map,
    color: "#ffffff",
    metalness: marble ? 0.06 : 0.28,
    roughness: marble ? 0.58 : 0.32,
    emissive: marble ? "#121212" : sides === 20 ? "#3a3208" : "#0a1f10",
    emissiveIntensity: marble ? 0.1 : 0.28,
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

  // Größerer UV-Radius → mehr Canvas-Padding sichtbar → Zahl wirkt kleiner
  const scale = maxAbs > 1e-8 ? 0.46 / maxAbs : 1;
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

function resolveSkin(skinId?: DiceSkinId | null): DiceSkinDef {
  return getDiceSkin(skinId);
}

/** Baut Multi-Material-Würfel mit opaken Face-Texturen (Zahlen zentriert per UV). */
export function buildDieFaceMesh(
  sides: number,
  skinId?: DiceSkinId | null,
): DieFaceMeshData {
  const n = Math.max(2, Math.round(sides));
  const skin = resolveSkin(skinId);
  const bg = skin.bodyColor;
  const numeral = skin.numeralColor;
  const pattern = skin.pattern;
  let geometry = baseGeometry(n);

  // Indexed + shared verts würden Face-UVs überschreiben → immer unique verts
  if (geometry.index) {
    geometry = geometry.toNonIndexed();
  }

  const materials: THREE.MeshStandardMaterial[] = [];
  for (let v = 1; v <= n; v++) {
    materials.push(
      createFaceMaterial(getDieFaceTexture(v, bg, numeral, pattern), n, pattern),
    );
  }
  const blankIndex = materials.length;
  materials.push(
    createFaceMaterial(createBlankTexture(bg, pattern), n, pattern),
  );

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

  if (clusters.length === 0) {
    // Sicherheit: ohne Gruppen bleibt Multi-Material unsichtbar
    const count = geometry.attributes.position.count;
    geometry.addGroup(0, count, 0);
  } else if (indexed && geometry.index) {
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

const COMMON_DIE_SIDES = [4, 6, 8, 10, 12, 20] as const;

/**
 * Prefills the CanvasTexture cache for common dice faces (default skin).
 * Safe to call during session loading — no WebGL context required.
 */
export function warmCommonDiceFaceTextures(
  skinId?: DiceSkinId | null,
): void {
  if (typeof document === "undefined") return;
  const skin = resolveSkin(skinId);
  const bg = skin.bodyColor;
  const numeral = skin.numeralColor;
  const pattern = skin.pattern;
  for (const sides of COMMON_DIE_SIDES) {
    for (let v = 1; v <= sides; v++) {
      getDieFaceTexture(v, bg, numeral, pattern);
    }
  }
  createBlankTexture(bg, pattern);
}
