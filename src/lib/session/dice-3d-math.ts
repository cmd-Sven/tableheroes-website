import * as THREE from "three";

const _up = new THREE.Vector3(0, 1, 0);
const _d6Normals: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 1, 0),
  2: new THREE.Vector3(1, 0, 0),
  3: new THREE.Vector3(0, 0, 1),
  4: new THREE.Vector3(0, 0, -1),
  5: new THREE.Vector3(-1, 0, 0),
  6: new THREE.Vector3(0, -1, 0),
};

/** Face-Normal (lokal) — muss zu `quaternionForFaceUp` passen. */
export function faceNormal(sides: number, face: number, out = new THREE.Vector3()): THREE.Vector3 {
  const n = Math.max(2, Math.round(sides));
  const v = Math.min(n, Math.max(1, Math.round(face)));

  if (n === 6) {
    const normal = _d6Normals[v] ?? _up;
    return out.copy(normal).normalize();
  }

  // Gleichmäßig verteilte Richtungen auf der Kugel (Fibonacci), Index = face-1
  const i = v - 1;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / Math.max(1, n - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
  return out.set(Math.cos(theta) * radius, y, Math.sin(theta) * radius).normalize();
}

/** Abstand Face-Label vom Zentrum (leicht über der Geometrie). */
export function faceLabelRadius(sides: number): number {
  const s = Math.round(sides);
  if (s === 4) return 0.52;
  if (s === 6) return 0.6;
  if (s === 8) return 0.58;
  if (s === 10) return 0.62;
  if (s === 12) return 0.72;
  return 0.78;
}

/** Plane-Größe für Face-Zahlen. */
export function faceLabelSize(sides: number): number {
  const s = Math.round(sides);
  if (s <= 4) return 0.55;
  if (s <= 6) return 0.48;
  if (s <= 8) return 0.42;
  if (s <= 10) return 0.36;
  if (s <= 12) return 0.32;
  return 0.28;
}

/** Ziel-Quaternion: Face-Wert zeigt nach oben (+Y). Näherung über gleichmäßige Richtungen. */
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
