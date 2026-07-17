import * as THREE from "three";

type Vec3 = readonly [number, number, number];

const _up = new THREE.Vector3(0, 1, 0);
const _tmp = new THREE.Vector3();

/** d6: klassische Gegenseiten (1↔6, 2↔5, 3↔4). */
const D6_NORMALS: Record<number, Vec3> = {
  1: [0, 1, 0],
  2: [1, 0, 0],
  3: [0, 0, 1],
  4: [0, 0, -1],
  5: [-1, 0, 0],
  6: [0, -1, 0],
};

/**
 * Echte Face-Normalen der Three.js-Geometrien (nicht Fibonacci).
 * Index 0 = Face-Wert 1. Sortiert stabil (oben zuerst).
 */
const D4_NORMALS: Vec3[] = [
  [-0.5774, 0.5774, 0.5774],
  [0.5774, 0.5774, -0.5774],
  [0.5774, -0.5774, 0.5774],
  [-0.5774, -0.5774, -0.5774],
];

const D8_NORMALS: Vec3[] = [
  [0.5774, 0.5774, 0.5774],
  [0.5774, 0.5774, -0.5774],
  [-0.5774, 0.5774, 0.5774],
  [-0.5774, 0.5774, -0.5774],
  [0.5774, -0.5774, 0.5774],
  [0.5774, -0.5774, -0.5774],
  [-0.5774, -0.5774, 0.5774],
  [-0.5774, -0.5774, -0.5774],
];

/** ConeGeometry(0.85, 1.35, 10) — nur Seitenflächen (ohne Boden). */
const D10_NORMALS: Vec3[] = [
  [0.2651, 0.5137, 0.816],
  [0.6941, 0.5137, 0.5043],
  [0.8579, 0.5137, 0],
  [0.6941, 0.5137, -0.5043],
  [0.2651, 0.5137, -0.816],
  [-0.2651, 0.5137, -0.816],
  [-0.6941, 0.5137, -0.5043],
  [-0.8579, 0.5137, 0],
  [-0.6941, 0.5137, 0.5043],
  [-0.2651, 0.5137, 0.816],
];

const D12_NORMALS: Vec3[] = [
  [0, 0.8507, 0.5257],
  [0, 0.8507, -0.5257],
  [0.8507, 0.5257, 0],
  [-0.8507, 0.5257, 0],
  [0.5257, 0, 0.8507],
  [0.5257, 0, -0.8507],
  [-0.5257, 0, 0.8507],
  [-0.5257, 0, -0.8507],
  [0.8507, -0.5257, 0],
  [-0.8507, -0.5257, 0],
  [0, -0.8507, 0.5257],
  [0, -0.8507, -0.5257],
];

const D20_NORMALS: Vec3[] = [
  [0, 0.9342, 0.3568],
  [0, 0.9342, -0.3568],
  [0.5774, 0.5774, 0.5774],
  [-0.5774, 0.5774, 0.5774],
  [0.5774, 0.5774, -0.5774],
  [-0.5774, 0.5774, -0.5774],
  [0.9342, 0.3568, 0],
  [-0.9342, 0.3568, 0],
  [0.3568, 0, 0.9342],
  [-0.3568, 0, 0.9342],
  [0.3568, 0, -0.9342],
  [-0.3568, 0, -0.9342],
  [0.9342, -0.3568, 0],
  [-0.9342, -0.3568, 0],
  [0.5774, -0.5774, 0.5774],
  [-0.5774, -0.5774, 0.5774],
  [0.5774, -0.5774, -0.5774],
  [-0.5774, -0.5774, -0.5774],
  [0, -0.9342, 0.3568],
  [0, -0.9342, -0.3568],
];

/** Inradius der jeweiligen Geometrie + Luft, damit Labels nicht im Mesh stecken. */
const FACE_INRADIUS: Record<number, number> = {
  4: 0.3333,
  6: 0.575,
  8: 0.5774,
  10: 0.584,
  12: 0.7553,
  20: 0.7947,
};

const LABEL_PAD = 0.07;

function normalsForSides(sides: number): Vec3[] | null {
  switch (Math.round(sides)) {
    case 4:
      return D4_NORMALS;
    case 8:
      return D8_NORMALS;
    case 10:
      return D10_NORMALS;
    case 12:
      return D12_NORMALS;
    case 20:
      return D20_NORMALS;
    default:
      return null;
  }
}

/** Face-Normal (lokal) — muss zu `quaternionForFaceUp` und Label-Positionen passen. */
export function faceNormal(sides: number, face: number, out = new THREE.Vector3()): THREE.Vector3 {
  const n = Math.max(2, Math.round(sides));
  const v = Math.min(n, Math.max(1, Math.round(face)));

  if (n === 6) {
    const t = D6_NORMALS[v] ?? D6_NORMALS[1];
    return out.set(t[0], t[1], t[2]).normalize();
  }

  const table = normalsForSides(n);
  if (table) {
    const t = table[v - 1] ?? table[0];
    return out.set(t[0], t[1], t[2]).normalize();
  }

  // Fallback: Fibonacci auf der Kugel
  const i = v - 1;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / Math.max(1, n - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
  return out.set(Math.cos(theta) * radius, y, Math.sin(theta) * radius).normalize();
}

/** Abstand Face-Label vom Zentrum (klar außerhalb der Fläche). */
export function faceLabelRadius(sides: number): number {
  const s = Math.round(sides);
  const r = FACE_INRADIUS[s];
  if (r != null) return r + LABEL_PAD;
  return 0.85;
}

/** Plane-Größe für Face-Zahlen — groß genug zum Lesen beim Roll. */
export function faceLabelSize(sides: number): number {
  const s = Math.round(sides);
  if (s <= 4) return 0.62;
  if (s <= 6) return 0.58;
  if (s <= 8) return 0.5;
  if (s <= 10) return 0.42;
  if (s <= 12) return 0.4;
  return 0.36;
}

/** Quaternion: Plane (+Z) zeigt entlang der Face-Normale. */
export function quaternionFacingOut(normal: THREE.Vector3, out = new THREE.Quaternion()): THREE.Quaternion {
  _tmp.copy(normal).normalize();
  // Stabil bei Anti-Parallel zu +Z (z. B. d6 Face 4)
  if (_tmp.z < -0.999) {
    return out.set(0, 1, 0, 0);
  }
  if (_tmp.z > 0.999) {
    return out.identity();
  }
  return out.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _tmp);
}

/** Ziel-Quaternion: Face-Wert zeigt nach oben (+Y). */
export function quaternionForFaceUp(sides: number, face: number): THREE.Quaternion {
  const normal = faceNormal(sides, face);
  const q = new THREE.Quaternion();
  q.setFromUnitVectors(normal, _up);
  return q;
}

export function seededTumbleAxes(seed: string, index: number): THREE.Vector3 {
  let h = 0;
  const s = `${seed}:${index}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  const ax = ((h & 255) / 255) * 2 - 1;
  const ay = (((h >> 8) & 255) / 255) * 2 - 1;
  const az = (((h >> 16) & 255) / 255) * 2 - 1;
  const v = new THREE.Vector3(ax, ay, az);
  if (v.lengthSq() < 0.01) v.set(0.4, 1, 0.2);
  return v.normalize();
}

export function dieScale(sides: number): number {
  if (sides <= 4) return 0.72;
  if (sides <= 6) return 0.78;
  if (sides <= 8) return 0.74;
  if (sides <= 10) return 0.7;
  if (sides <= 12) return 0.72;
  return 0.8;
}

export function dieColor(sides: number): string {
  switch (sides) {
    case 4:
      return "#2d6a4f";
    case 6:
      return "#1b4332";
    case 8:
      return "#40916c";
    case 10:
      return "#52b788";
    case 12:
      return "#95d5b2";
    case 20:
      return "#cab926";
    default:
      return "#217d42";
  }
}
